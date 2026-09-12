/**
 * 逐轮接口（新链路）：P4a 回合路由 → packet → P4b 互动正文（流式）→ 逐行切成前端事件。
 * 响应是 application/x-ndjson 帧流（赵艺琛 09-11「lotus改一下流式吧」）：
 *   {type:"route", present, engine}                       P4a 完成即发
 *   {type:"event_delta", index, kind, person?, text}      当前事件的增量文本（已过禁词校验，不会撤回）
 *   {type:"event", index, event}                          该事件收口（最终 person / text）
 *   {type:"final", ...整包字段}                            与改流式前的整包 JSON 同字段：workflowToken, events, choices, current,
 *                                                          present, visibleCharacters, responseContract, playerProfile, mediaCues,
 *                                                          chapterComplete, finaleVote, transition, protocolNotice?, engine
 *   {type:"ledger", workflowToken, ledger}                账本抽取收尾后重封的 token（前端以流里最后一个 token 为准）
 *   {type:"error", message}
 * 请求级错误（token 缺失 / 状态不允许）仍用普通 JSON + 状态码返回，不进流。
 */
import type { Message, Person } from "../../story-data";
import { cast as uiCast } from "../../story-data";
import {
  chapterChangePayload,
  finaleVotePayload,
  proseToEvents,
  publicCharacterIds,
  toFrontendChoices,
  type SpeakerLabel,
} from "../../engine/adapter";
import { resolveMediaCues } from "../../engine/lotus-media";
import { currentAnchor, displayName, extractLedger, runTurn, type Packet } from "../../engine/runtime";
import { styleProfile } from "../../engine/styles";
import { clickedChoiceFromId, normaliseLedger, type EngineState, type SceneLedger } from "../../engine/state";
import { lotusStoryPack, type StoryPack } from "../../engine/story-pack";
import { openState, sealState } from "../../engine/token";
import { responseContract } from "./contract";
import { IS_EN, SPEAKER_SEPARATOR } from "../../locale";
import { engineText } from "../../engine/i18n";

// 路由 + 正文（含重试）可能超过默认函数时长；Vercel Pro 上限内放宽。
export const maxDuration = 300;

const playerInputKinds = new Set(["action", "speech", "freeform", "identity"]);

/** 与旧链路相同的“我是 X / 我改成 X”身份声明识别（中文原文照搬；英文版换成 "I am X / I'll play X / call me X"）。 */
const identityPatterns = IS_EN
  ? [
    // 英文里 "I am X" 是日常句式（I am worried…），不当身份声明；只认带明确扮演/改名意图的句式。
    /^(?:i(?:'ll| will) )?(?:now )?play(?: as)? (.{1,40}?)(?: now)?[.!]?$/iu,
    /^i(?:'ll| will) (?:now )?(?:be playing|switch to|become) (.{1,40}?)(?: now)?[.!]?$/iu,
    /^from now on,? (?:i am|i'm|i(?:'ll| will) be|call me|treat me as|consider me) (.{1,40}?)[.!]?$/iu,
    /^(?:call me|treat me as|consider me|my (?:name|role|character) is) (.{1,40}?)[.!]?$/iu,
  ]
  : [
    /^我是(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^我(?:现在)?(?:改成|改为|要当|要扮演|扮演)(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^从现在起(?:我是|我就是|把我当成)(.{1,30}?)[。.!！]?$/u,
  ];
const identityStopWords = IS_EN
  ? /^(?:not|so|just|going|sure|here|glad|sorry|afraid|fine|ok|okay|done|listening|asking|saying|thinking|curious|serious|kidding|tired|ready|in|out|with|all|only|still|already|about|at|on|the one|no|yes)\b/iu
  : /^(?:说|觉得|认为|想说)/u;

function explicitPlayerProfileUpdate(input: string) {
  const text = input.trim();
  for (const pattern of identityPatterns) {
    const candidate = text.match(pattern)?.[1]?.trim();
    if (!candidate || /[，,；;：:\n]/u.test(candidate) || identityStopWords.test(candidate)) continue;
    return candidate.slice(0, 100);
  }
  return "";
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

/** 最近场景摘录：前端回传的消息历史压成“人名：台词 / 旁白”文本，供 P4a/P4b 读上文。 */
function recentSceneExcerpt(history: Message[], pack: StoryPack, state: EngineState, currentIndex: number) {
  const lines = history.slice(-16).map((message) => {
    const text = message.text.trim();
    if (!text) return "";
    if (message.kind === "player") return `${engineText.playerLabel}${SPEAKER_SEPARATOR}${text}`;
    if (message.person) {
      const character = pack.cast.find((entry) => entry.id === message.person);
      const label = character ? displayName(character, state, currentIndex) : message.label ?? message.person;
      return `${label}${SPEAKER_SEPARATOR}${text}`;
    }
    return text;
  }).filter(Boolean);
  let excerpt = lines.join("\n");
  while (excerpt.length > 2600 && lines.length > 2) {
    lines.shift();
    excerpt = lines.join("\n");
  }
  return excerpt || state.handoff_snapshot;
}

/** 正文里允许被识别为说话人的标签 → 前端 person id（未公开的角色只给标签，不带头像/真名）。 */
function speakerLabels(pack: StoryPack, state: EngineState, currentIndex: number, publicIds: string[], npcNames: string[]): SpeakerLabel[] {
  const labels: SpeakerLabel[] = [];
  for (const character of pack.cast) {
    const person = publicIds.includes(character.id) ? character.id : undefined;
    labels.push({ label: displayName(character, state, currentIndex), person });
    labels.push({ label: character.name, person });
    for (const alias of character.aliases) labels.push({ label: alias, person });
  }
  for (const name of npcNames) labels.push({ label: name });
  return labels;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      sessionId?: string; workflowToken?: string; history?: Message[]; input?: string; inputKind?: string; playerProfile?: string; choiceId?: string;
      /** 逐轮文风 id（app/style-options.ts）；缺省 / 未知走默认档。只影响本轮及之后，不改会话状态。 */
      style_id?: string;
    };
    const style = styleProfile(body.style_id);
    const token = body.workflowToken?.trim();
    const input = body.input?.trim();
    if (!token || !input) return Response.json({ error: token ? "workflow_session_or_input_missing" : "workflow_not_compiled" }, { status: token ? 400 : 409 });

    const pack = lotusStoryPack();
    const state = await openState(token);
    if (state.story !== pack.id) return Response.json({ error: "workflow_story_mismatch" }, { status: 409 });
    if (state.finale_choice) return Response.json({ error: "finale_already_decided" }, { status: 409 });
    // 终局投票已经摆出来但还没投：不再往前生成，防止重放请求把剧情推过投票段。
    if (state.finale_ready) return Response.json({ error: "finale_pending" }, { status: 409 });

    const requestedKind = body.inputKind?.trim() ?? "";
    const declaredProfile = explicitPlayerProfileUpdate(input);
    const inputKind = declaredProfile ? "identity" : playerInputKinds.has(requestedKind) ? requestedKind : "freeform";
    const submittedProfile = typeof body.playerProfile === "string" ? body.playerProfile.trim().slice(0, 100) : "";
    const playerProfile = declaredProfile || (inputKind === "identity" ? (submittedProfile || input.slice(0, 100)) : submittedProfile) || state.player_profile;
    const workingState: EngineState = { ...state, player_profile: playerProfile };

    const history = Array.isArray(body.history)
      ? body.history.filter((message): message is Message => Boolean(message && typeof message === "object" && typeof message.text === "string")).slice(-30)
      : [];
    const previousIndex = currentAnchor(pack, state.progress).segment_index;
    const recentScene = recentSceneExcerpt(history, pack, workingState, previousIndex);
    const clicked = clickedChoiceFromId(body.choiceId);

    // 以下全部在 ndjson 流里完成。请求级校验（token / 输入 / 状态）已在上面用普通 JSON 状态码回掉，
    // 前端据此区分「请求没被接受」与「生成中途出错」（后者走 error 帧）。
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const emit = (frame: Record<string, unknown>) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`)); } catch { closed = true; }
        };
        try {
          // 身份已在正文里揭开（例如零点摘面罩）的角色，从这一轮起真名可用。
          // 流式期间说话人标签按路由后的进度算（章末结算前）；final 的 present / visibleCharacters 仍按结算后的进度算。
          const speakersFor = (packet: Packet) => {
            const index = currentAnchor(pack, packet.progress).segment_index;
            const npcNames = [...state.dynamic_npcs, ...(packet.new_npc ? [packet.new_npc] : [])].map((npc) => npc.name);
            return speakerLabels(pack, workingState, index, publicCharacterIds(pack, index), npcNames);
          };
          const outcome = await runTurn(pack, workingState, recentScene, input, clicked, style.id, {
            onRoute: (packet) => {
              const routedAnchor = currentAnchor(pack, packet.progress);
              const publicIds = publicCharacterIds(pack, routedAnchor.segment_index);
              const onStageIds = packet.on_stage_ids.flatMap((speaker) => speaker.person && publicIds.includes(speaker.person) ? [speaker.person] : []);
              emit({
                type: "route",
                present: onStageIds.length ? onStageIds : routedAnchor.present.filter((id) => publicIds.includes(id)),
                engine: { chain: "storyforge-p4a-p4b", mode: packet.mode, anchor: routedAnchor.id, stage: packet.progress.stage, style: style.id },
              });
            },
            speakers: speakersFor,
            onEventDelta: (index, kind, person, text) => emit({ type: "event_delta", index, kind, ...(person ? { person } : {}), text }),
            onEvent: (index, event) => emit({ type: "event", index, event }),
          });
          const { packet } = outcome;
          const anchor = currentAnchor(pack, packet.progress);
          const currentIndex = anchor.segment_index;
          const previousChapterId = state.progress.chapter_id;
          const chapterChanged = packet.progress.chapter_id !== previousChapterId;
          const activatedAnchorId = packet.mode === "activate_anchor" ? packet.selected_anchor_id : null;

          const publicIds = publicCharacterIds(pack, currentIndex);
          // 事件以流式期间逐行发出的为准（前端已经拿到同一份）；这里再按整段正文切一次只做一致性诊断。
          const events = outcome.events;
          if (!events.length) throw new Error(engineText.noVisibleEvents);
          const npcNames = [...state.dynamic_npcs, ...(packet.new_npc ? [packet.new_npc] : [])].map((npc) => npc.name);
          const recut = proseToEvents(outcome.prose, speakerLabels(pack, workingState, currentIndex, publicIds, npcNames));
          const eventsConsistent = recut.length === events.length && recut.every((event, index) => event.text === events[index].text && event.type === events[index].type);

          const media = resolveMediaCues(events, packet.progress.active_anchor_id, activatedAnchorId, state.played_media_ids);
          const revealedIds = unique([...state.revealed_ids, ...media.reveals]) as Person[];

          const finaleReady = Boolean(pack.finale_vote && packet.progress.active_anchor_id === pack.finale_vote.trigger_segment_id);
          const finaleVote = finaleReady && !state.finale_ready ? finaleVotePayload(pack) : undefined;
          const change = chapterChanged ? chapterChangePayload(pack, previousChapterId, packet.progress.chapter_id) : { chapterComplete: undefined, transition: undefined };

          const previousLedger = normaliseLedger(state.scene_ledger);
          const nextState = (sceneLedger: SceneLedger): EngineState => ({
            ...workingState,
            progress: packet.progress,
            handoff_snapshot: outcome.handoff_snapshot,
            seen_character_names: unique([...state.seen_character_names, ...packet.turn_context.on_stage_characters.map((character) => character.name)]),
            dynamic_npcs: packet.new_npc ? [...state.dynamic_npcs, packet.new_npc] : state.dynamic_npcs,
            game_state: outcome.game_state_delta ? { ...state.game_state, ...outcome.game_state_delta } : state.game_state,
            played_media_ids: [...state.played_media_ids, ...media.cues.map((cue) => cue.id)],
            revealed_ids: revealedIds,
            completed_chapters: chapterChanged ? unique([...state.completed_chapters, previousChapterId]) : state.completed_chapters,
            turns: state.turns + 1,
            finale_ready: state.finale_ready || finaleReady,
            scene_ledger: sceneLedger,
          });

          const onStageIds = outcome.speaker_map.flatMap((speaker) => speaker.person && publicIds.includes(speaker.person) ? [speaker.person] : []);
          const present = onStageIds.length ? onStageIds : anchor.present.filter((id) => publicIds.includes(id));
          const visibleCharacters = pack.cast.map((character) => character.id).filter((id) => publicIds.includes(id) && id in uiCast);
          const notices = [...outcome.notices, ...(eventsConsistent ? [] : ["events_recut_mismatch"])];

          // final：整包字段全部在这里（前端拿它做一次权威对齐）。token 先按旧账本封——账本抽取是收尾的小调用，
          // 不让它拖住选项出现；抽完再发 ledger 帧带重封的 token，前端以流里最后一个 token 为准。
          emit({
            type: "final",
            workflowToken: await sealState(nextState(previousLedger)),
            events,
            choices: toFrontendChoices(outcome.choices),
            current: { segmentId: anchor.id, chapterId: anchor.chapter_id, location: anchor.location },
            present,
            visibleCharacters,
            responseContract,
            playerProfile,
            mediaCues: media.cues,
            chapterComplete: change.chapterComplete,
            finaleVote,
            transition: change.transition,
            ...(notices.length ? { protocolNotice: notices.join("; ") } : {}),
            engine: {
              chain: "storyforge-p4a-p4b",
              mode: packet.mode,
              anchor: anchor.id,
              stage: packet.progress.stage,
              style: style.id,
              stateCards: outcome.state_cards,
              /** 揭示门槛增量校验：续写次数 / 命中词 / 丢弃行数。 */
              reveal: outcome.reveal,
              /** 本轮写手实际读到的账本投影（新账本随 ledger 帧给）。 */
              ledger: { projected: packet.turn_context.scene_ledger },
            },
          });

          // 事件账本：以最终放行的正文为输入抽取并合并；失败沿用旧账本。
          const onStageNames = packet.turn_context.on_stage_characters.map((character) => character.name);
          const sceneLedger = await extractLedger(pack, outcome.prose, previousLedger, onStageNames);
          emit({
            type: "ledger",
            workflowToken: await sealState(nextState(sceneLedger)),
            ledger: { events_happened: sceneLedger.events, exited_characters: sceneLedger.exited },
          });
        } catch (error) {
          emit({ type: "error", message: error instanceof Error ? error.message : "turn_failed" });
        } finally {
          try { controller.close(); } catch { /* 客户端已断开 */ }
        }
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache", "x-accel-buffering": "no" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "turn_failed";
    const status = message === "workflow_token_invalid" ? 409 : 502;
    return Response.json({ error: message }, { status });
  }
}
