/**
 * 逐轮接口（新链路）：P4a 回合路由 → packet → P4b 互动正文 → 确定性切成前端事件。
 * 前端契约不变：{ workflowToken, events[], choices[], current, present, visibleCharacters, responseContract,
 *                playerProfile, mediaCues, chapterComplete, transition, finaleVote }。
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
import { currentAnchor, displayName, runTurn } from "../../engine/runtime";
import { clickedChoiceFromId, type EngineState } from "../../engine/state";
import { lotusStoryPack, type StoryPack } from "../../engine/story-pack";
import { openState, sealState } from "../../engine/token";
import { responseContract } from "./contract";

// 路由 + 正文（含重试）可能超过默认函数时长；Vercel Pro 上限内放宽。
export const maxDuration = 300;

const playerInputKinds = new Set(["action", "speech", "freeform", "identity"]);

/** 与旧链路相同的“我是 X / 我改成 X”身份声明识别（原文照搬）。 */
function explicitPlayerProfileUpdate(input: string) {
  const text = input.trim();
  const patterns = [
    /^我是(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^我(?:现在)?(?:改成|改为|要当|要扮演|扮演)(.{1,30}?)(?:了)?[。.!！]?$/u,
    /^从现在起(?:我是|我就是|把我当成)(.{1,30}?)[。.!！]?$/u,
  ];
  for (const pattern of patterns) {
    const candidate = text.match(pattern)?.[1]?.trim();
    if (!candidate || /[，,；;：:\n]/u.test(candidate) || /^(?:说|觉得|认为|想说)/u.test(candidate)) continue;
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
    if (message.kind === "player") return `你：${text}`;
    if (message.person) {
      const character = pack.cast.find((entry) => entry.id === message.person);
      const label = character ? displayName(character, state, currentIndex) : message.label ?? message.person;
      return `${label}：${text}`;
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
    };
    const token = body.workflowToken?.trim();
    const input = body.input?.trim();
    if (!token || !input) return Response.json({ error: token ? "workflow_session_or_input_missing" : "workflow_not_compiled" }, { status: token ? 400 : 409 });

    const pack = lotusStoryPack();
    const state = await openState(token);
    if (state.story !== pack.id) return Response.json({ error: "workflow_story_mismatch" }, { status: 409 });
    if (state.finale_choice) return Response.json({ error: "finale_already_decided" }, { status: 409 });

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

    const outcome = await runTurn(pack, workingState, recentScene, input, clicked);
    const { packet } = outcome;
    const anchor = currentAnchor(pack, packet.progress);
    const currentIndex = anchor.segment_index;
    const previousChapterId = state.progress.chapter_id;
    const chapterChanged = packet.progress.chapter_id !== previousChapterId;
    const activatedAnchorId = packet.mode === "activate_anchor" ? packet.selected_anchor_id : null;

    // 身份已在正文里揭开（例如零点摘面罩）的角色，从这一轮起真名可用。
    const npcNames = [...state.dynamic_npcs, ...(packet.new_npc ? [packet.new_npc] : [])].map((npc) => npc.name);
    const publicIds = publicCharacterIds(pack, currentIndex);
    const events = proseToEvents(outcome.prose, speakerLabels(pack, workingState, currentIndex, publicIds, npcNames));
    if (!events.length) throw new Error("正文没有可显示的内容");

    const media = resolveMediaCues(events, packet.progress.active_anchor_id, activatedAnchorId, state.played_media_ids);
    const revealedIds = unique([...state.revealed_ids, ...media.reveals]) as Person[];

    const finaleReady = Boolean(pack.finale_vote && packet.progress.active_anchor_id === pack.finale_vote.trigger_segment_id);
    const finaleVote = finaleReady && !state.finale_ready ? finaleVotePayload(pack) : undefined;
    const change = chapterChanged ? chapterChangePayload(pack, previousChapterId, packet.progress.chapter_id) : { chapterComplete: undefined, transition: undefined };

    const nextState: EngineState = {
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
    };

    const onStageIds = outcome.speaker_map.flatMap((speaker) => speaker.person && publicIds.includes(speaker.person) ? [speaker.person] : []);
    const present = onStageIds.length ? onStageIds : anchor.present.filter((id) => publicIds.includes(id));
    const visibleCharacters = pack.cast.map((character) => character.id).filter((id) => publicIds.includes(id) && id in uiCast);

    return Response.json({
      workflowToken: await sealState(nextState),
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
      ...(outcome.notices.length ? { protocolNotice: outcome.notices.join("; ") } : {}),
      engine: { chain: "storyforge-p4a-p4b", mode: packet.mode, anchor: anchor.id, stage: packet.progress.stage, stateCards: outcome.state_cards },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "turn_failed";
    const status = message === "workflow_token_invalid" ? 409 : 502;
    return Response.json({ error: message }, { status });
  }
}
