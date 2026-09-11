/**
 * 新链路运行层（与 storyforge/app/api/story/route.ts 同构）：
 *   P4a 回合路由 → makePacket 把选中的故事包材料原样投影 → P4b 互动正文生成器。
 * 本文件不含任何 Lotus 专名；故事从 StoryPack 读。
 */
import P4A_TEMPLATE from "../prompts/p4a";
import P4B_TEMPLATE from "../prompts/p4b";
import { IS_EN } from "../locale";
import { styleProfile } from "./styles";
import { engineText, ledgerDirective, ledgerExtractionPrompt, routerLanguageAddendum, writerLanguageAddendum } from "./i18n";
import { completion, completionStream, jsonCandidates, proseClosed, scanProse } from "./kaon";
import { proseToEvents, type FrontendEvent, type SpeakerLabel } from "./adapter";
import {
  normaliseClickedChoice,
  normaliseLedger,
  normaliseNewNpc,
  normaliseProgress,
  type ClickedChoice,
  type DynamicNpc,
  type EngineState,
  type Progress,
  type SceneLedger,
} from "./state";
import { STAGES, type PackAnchor, type PackCharacter, type StoryPack } from "./story-pack";

export type HistoryItem = { role: "player" | "story"; text: string };
export type SidecarChoice = { label: string; kind: "mainline" | "deepen" | "freeplay"; anchor_id: string | null };

type StageCharacter = {
  id?: string;
  name: string;
  role: string;
  character_core: string;
  voice_and_behavior: string;
  current_stance: string;
  first_visible_appearance: boolean;
  performance_card: PackCharacter["performance_card"];
};

export type Packet = ReturnType<typeof makePacket>;

export type TurnOutcome = {
  packet: Packet;
  prose: string;
  handoff_snapshot: string;
  choices: SidecarChoice[];
  game_state_delta: Record<string, unknown> | undefined;
  state_cards: unknown[];
  notices: string[];
  /** 本轮在场角色的显示名 → 角色 id（别名期显示别名，不映射到真身）。 */
  speaker_map: Array<{ label: string; person?: string }>;
  /** 流式期间已经逐行发出的事件（与 prose 逐行对应；route 用它做 final 对齐）。 */
  events: FrontendEvent[];
  /** 揭示门槛的增量校验统计（排查用，进 final.engine）。 */
  reveal: RevealStats;
};

export type RevealStats = {
  /** 命中禁词后带前缀续写的次数（最多 2）。 */
  retries: number;
  /** 命中的禁词（按发生顺序）。 */
  leaked: string[];
  /** 最后一次尝试仍命中、被整行丢弃 / 截断的行数。 */
  dropped: number;
  /** handoff_snapshot 命中禁词被替换为缺省值。 */
  handoff_dropped?: string;
};

/**
 * 流式钩子：route 层用它把 P4a 结果、逐行增量、逐行收口即时推给前端。
 * 全部可选；不传时 runTurn 行为与整包返回一致（只是内部仍按行流式校验）。
 */
export type TurnHooks = {
  /** P4a 完成、packet 组好（写手还没开始）。 */
  onRoute?: (packet: Packet) => void;
  /** 当前进度下正文里允许识别为说话人的标签 → person（决定一行是对白还是旁白）。不传则全部按旁白。 */
  speakers?: (packet: Packet) => SpeakerLabel[];
  /** 第 index 条事件的**增量**文本（已经过禁词校验、确定不会被撤回的部分）。 */
  onEventDelta?: (index: number, kind: FrontendEvent["type"], person: string | undefined, text: string) => void;
  /** 第 index 条事件收口（最终 person / text）。 */
  onEvent?: (index: number, event: FrontendEvent) => void;
};

/** 逐轮文风：按请求体 style_id 取档；缺省走默认档（原 turnFilmGrammar / turnFilmGrammarEn）。 */
const styleTurn = (styleId?: string) => {
  const style = styleProfile(styleId);
  return { turn_directive: style.directive, few_shots: style.few_shots };
};

/**
 * P4a / P4b 提示词本体为英文（2026-09-11 起与英文站同一套）；zh / en 各在末尾追加一段输出语言指令。
 * P4b 之后再追加运行层自己的事件账本指令（zh/en 各一段，不动 wiki 正文）。
 */
const ROUTER_PROMPT = `${P4A_TEMPLATE}${routerLanguageAddendum}`;
const WRITER_TEMPLATE = `${P4B_TEMPLATE}${writerLanguageAddendum}${ledgerDirective}`;

/** 投给 P4a 输入与 P4b packet 的账本投影（events 只带最近 8 条）。 */
function ledgerProjection(ledger: SceneLedger) {
  return { events_happened: ledger.events.slice(-8), exited_characters: ledger.exited };
}

export function anchorById(pack: StoryPack, id: string | null | undefined) {
  return id ? pack.anchors.find((anchor) => anchor.id === id) : undefined;
}

export function currentAnchor(pack: StoryPack, progress: Progress): PackAnchor {
  return anchorById(pack, progress.active_anchor_id)
    ?? pack.anchors.find((anchor) => anchor.chapter_id === progress.chapter_id)
    ?? pack.anchors[0];
}

function chapterIndex(pack: StoryPack, chapterId: string) {
  return pack.chapters.findIndex((chapter) => chapter.chapter_id === chapterId);
}

export function isEligibleAnchor(pack: StoryPack, anchor: PackAnchor, progress: Progress) {
  if (progress.active_anchor_id === anchor.id) return true;
  if (progress.resolved_anchor_ids.includes(anchor.id)) return false;
  const current = chapterIndex(pack, progress.chapter_id);
  const target = chapterIndex(pack, anchor.chapter_id);
  if (current < 0 || target < current || target > current + 1) return false;
  if (target === current) return STAGES.indexOf(anchor.stage) >= STAGES.indexOf(progress.stage);
  // 下一章只开放“起”，且 P4a 自己的规则要求玩家明确换时间/地点才会用它。
  return anchor.stage === "起";
}

export function candidateAnchors(pack: StoryPack, progress: Progress) {
  return pack.anchors.filter((anchor) => isEligibleAnchor(pack, anchor, progress));
}

function applyClickedMainline(pack: StoryPack, route: Record<string, unknown>, clicked: ClickedChoice | null, previous: Progress) {
  if (clicked?.kind !== "mainline" || !clicked.anchor_id) return route;
  const anchor = anchorById(pack, clicked.anchor_id);
  if (!anchor || !isEligibleAnchor(pack, anchor, previous)) return route;
  if (previous.active_anchor_id === anchor.id) return { ...route, mode: "continue_deepen", selected_anchor_id: null };
  return { ...route, mode: "activate_anchor", selected_anchor_id: anchor.id };
}

/**
 * 角色一律按人物简介的真名/身份出现（赵艺琛 2026-09-09：「按人物简介来 不要关掉」）。
 * 揭示前的别名机制不再作用于显示名；别名只保留为写手偶发使用时的说话人识别标签（见 chat route）。
 * 事实层的揭示门槛（forbidden_reveals / known_by）不受影响，秘密仍按门槛控制。
 */
export function displayName(character: PackCharacter, _state: EngineState, _currentIndex: number) {
  return character.name;
}

function stageCharacter(character: PackCharacter, state: EngineState, currentIndex: number, seen: Set<string>): StageCharacter {
  const name = displayName(character, state, currentIndex);
  const aliased = name !== character.name;
  return {
    id: character.id,
    name,
    role: aliased ? character.alias_role : character.role,
    character_core: character.character_core,
    voice_and_behavior: character.voice_and_behavior,
    current_stance: character.current_stance,
    first_visible_appearance: !seen.has(name),
    performance_card: character.performance_card,
  };
}

function dynamicCharacter(npc: DynamicNpc, seen: Set<string>): StageCharacter {
  const parts = npc.profile.split(engineText.profileSplitter).map((part) => part.trim()).filter(Boolean);
  const [identity, visual, habit, purpose] = parts;
  const habitText = habit || engineText.npcHabit;
  const purposeText = purpose || engineText.npcPurpose;
  return {
    name: npc.name,
    role: identity || `${npc.relationship}${engineText.npcRoleSuffix}`,
    character_core: `${npc.relationship}${engineText.npcCoreJoin}${npc.profile}`,
    voice_and_behavior: habitText,
    current_stance: purposeText,
    first_visible_appearance: !seen.has(npc.name),
    performance_card: {
      visual_signature: visual || engineText.npcVisual,
      habitual_behavior: habitText,
      pressure_response: engineText.npcPressure,
      private_goal: purposeText,
      relationship_tactic: engineText.npcTactic,
      first_entry_cue: engineText.npcEntry,
    },
  };
}

function samePair(left: unknown, right: readonly string[]) {
  return Array.isArray(left) && left.length === 2 && left.every((item) => typeof item === "string")
    && ((left[0] === right[0] && left[1] === right[1]) || (left[0] === right[1] && left[1] === right[0]));
}

/** 当前进度下对玩家可见文本仍然禁止出现的揭示词（来自 revealGates.forbidden_reveals 原文）。 */
export function forbiddenTerms(pack: StoryPack, currentIndex: number) {
  return pack.reveal_rules.filter((rule) => rule.opens_at_index > currentIndex).flatMap((rule) => rule.forbidden_reveals);
}

/** 已经在玩家面前成立的事实（segment 白名单 ∩ known_by 含 player ∩ 门槛已开）。 */
function establishedFacts(pack: StoryPack, currentIndex: number) {
  const allowed = new Set(pack.anchors.filter((anchor) => anchor.segment_index <= currentIndex).flatMap((anchor) => anchor.allowed_fact_ids));
  return pack.facts.filter((fact) => {
    if (!allowed.has(fact.id) || !fact.known_by.includes("player")) return false;
    if (!fact.reveal_gate_id) return true;
    const rule = pack.reveal_rules.find((entry) => entry.gate_id === fact.reveal_gate_id);
    return Boolean(rule && rule.opens_at_index < currentIndex);
  }).map((fact) => fact.text);
}

/** 公开关系（双方真名都已可用、且未到揭示章节的关系不投影）。 */
function publicRelationships(pack: StoryPack, state: EngineState, currentIndex: number) {
  const chapterNo = chapterIndex(pack, state.progress.chapter_id) + 1;
  const nameOk = (name: string) => {
    const character = pack.cast.find((entry) => entry.name === name);
    return !character || displayName(character, state, currentIndex) === character.name;
  };
  return pack.relationships.filter((relationship) =>
    (!relationship.reveal_from_chapter || chapterNo >= relationship.reveal_from_chapter)
    && relationship.pair.every(nameOk));
}

export function baseRelationshipMemory(pack: StoryPack, state: EngineState, currentIndex: number) {
  return publicRelationships(pack, state, currentIndex).map((relationship) => ({
    pair: relationship.pair,
    facts: [relationship.relationship_context],
    unresolved_context: [] as string[],
  }));
}

function knowledgeBoundaries(pack: StoryPack, state: EngineState, currentIndex: number, onStage: StageCharacter[]) {
  const boundaries: Array<{ who: string; does_not_know: string }> = [];
  for (const character of onStage) {
    const packChar = pack.cast.find((entry) => entry.id === character.id);
    if (packChar?.does_not_know.length) boundaries.push({ who: character.name, does_not_know: packChar.does_not_know.join(engineText.listJoin) });
  }
  const forbidden = forbiddenTerms(pack, currentIndex);
  if (forbidden.length) boundaries.push({ who: engineText.forbiddenWho, does_not_know: forbidden.join(engineText.listJoin) });
  const chapterNo = chapterIndex(pack, state.progress.chapter_id) + 1;
  for (const relationship of pack.relationships) {
    if (!relationship.director_note) continue;
    if (relationship.reveal_from_chapter && chapterNo >= relationship.reveal_from_chapter) continue;
    boundaries.push({ who: relationship.pair.filter((name) => name !== engineText.playerLabel).join(engineText.pairJoin), does_not_know: relationship.director_note });
  }
  return boundaries;
}

export function makePacket(pack: StoryPack, route: Record<string, unknown>, state: EngineState, scheduledNpc: DynamicNpc | null = null) {
  const previous = state.progress;
  const selected = typeof route.selected_anchor_id === "string" ? anchorById(pack, route.selected_anchor_id) : undefined;
  const mode = route.mode === "activate_anchor" || route.mode === "open_action" ? route.mode : "continue_deepen";
  const safeMode = mode === "activate_anchor" && !(selected && isEligibleAnchor(pack, selected, previous)) ? "continue_deepen" : mode;
  const reservedNames = new Set(pack.cast.flatMap((character) => [character.name, ...character.aliases]));
  const newNpc = scheduledNpc || normaliseNewNpc(route.new_npc, state.dynamic_npcs, reservedNames);
  const next = normaliseProgress(route.progress, previous);
  const resolvedAnchorIds = safeMode === "activate_anchor" && selected && previous.active_anchor_id && previous.active_anchor_id !== selected.id
    ? [...new Set([...next.resolved_anchor_ids, previous.active_anchor_id])]
    : next.resolved_anchor_ids;
  const progress: Progress = safeMode === "activate_anchor" && selected
    ? {
      ...next,
      chapter_id: selected.chapter_id,
      stage: selected.stage,
      active_anchor_id: selected.id,
      resolved_anchor_ids: resolvedAnchorIds,
      tension_summary: pack.chapters.find((chapter) => chapter.chapter_id === selected.chapter_id)?.stages.find((stage) => stage.anchor_ids.includes(selected.id))?.stage_pressure ?? selected.content,
    }
    : previous;
  const anchor = currentAnchor(pack, progress);
  const currentIndex = anchor.segment_index;
  const chapter = pack.chapters.find((item) => item.chapter_id === progress.chapter_id) ?? pack.chapters[0];
  const stage = chapter.stages.find((item) => item.stage === progress.stage) ?? chapter.stages[0];

  const selection = route.context_selection && typeof route.context_selection === "object" ? route.context_selection as Record<string, unknown> : {};
  const allNpcs = newNpc ? [...state.dynamic_npcs, newNpc] : state.dynamic_npcs;
  const seen = new Set(state.seen_character_names);
  const known = new Map<string, StageCharacter>();
  pack.cast.forEach((character) => {
    const staged = stageCharacter(character, state, currentIndex, seen);
    known.set(staged.name, staged);
  });
  allNpcs.forEach((npc) => known.set(npc.name, dynamicCharacter(npc, seen)));
  const requestedNames = Array.isArray(selection.character_names)
    ? selection.character_names.filter((name): name is string => typeof name === "string" && known.has(name))
    : [];
  const defaultNames = anchor.present.flatMap((id) => {
    const character = pack.cast.find((entry) => entry.id === id);
    return character ? [displayName(character, state, currentIndex)] : [];
  });
  const stagedNames = [...new Set([...(newNpc ? [newNpc.name] : []), ...requestedNames])].slice(0, 3);
  // P4a 明确输出空 character_names 表示玩家要独处；只有它什么都没给时才回落到本段 present。
  const routerChoseNobody = Array.isArray(selection.character_names) && selection.character_names.length === 0;
  const finalNamesBeforeLedger = stagedNames.length ? stagedNames : routerChoseNobody ? [] : defaultNames;
  // 账本里已离场的人从名单里剔掉；只有 P4a 明确点名才回来（视为新入场）。
  const ledger = normaliseLedger(state.scene_ledger);
  const finalNames = finalNamesBeforeLedger.filter((name) => !ledger.exited.includes(name) || requestedNames.includes(name));
  const onStage = finalNames.flatMap((name) => known.get(name) ? [known.get(name)!] : []);

  const relationships = [
    ...publicRelationships(pack, state, currentIndex).map(({ pair, relationship_context, interaction_dynamic }) => ({ pair, relationship_context, interaction_dynamic })),
    ...allNpcs.map((npc) => ({
      pair: [engineText.playerLabel, npc.name] as [string, string],
      relationship_context: npc.relationship,
      interaction_dynamic: engineText.npcInteraction,
    })),
  ];
  const requestedPairs = Array.isArray(selection.relationship_pairs) ? selection.relationship_pairs : [];
  const relevantRelationships = relationships.filter((relationship) =>
    requestedPairs.some((pair) => samePair(pair, relationship.pair))
    || (relationship.pair.some((name) => finalNames.includes(name)) && relationship.pair.includes(engineText.playerLabel))
    || (relationship.pair.every((name) => finalNames.includes(name)) && finalNames.length > 1)).slice(0, 4);

  const memoryPool = baseRelationshipMemory(pack, state, currentIndex);
  const memoryIndexes = Array.isArray(selection.memory_indexes)
    ? selection.memory_indexes.filter((index): index is number => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < memoryPool.length)
    : [];
  const relationshipMemory = (memoryIndexes.length
    ? memoryIndexes.map((index) => memoryPool[index])
    : memoryPool.filter((memory) => memory.pair.some((name) => finalNames.includes(name)))).slice(0, 3);

  const eligible = candidateAnchors(pack, progress);
  const requestedMainline = typeof route.mainline_choice_id === "string" ? eligible.find((item) => item.id === route.mainline_choice_id) || null : null;
  const fallbackMainline = eligible.find((item) => item.id !== progress.active_anchor_id) || null;
  const mainline = requestedMainline && requestedMainline.id !== progress.active_anchor_id ? requestedMainline : fallbackMainline;
  const textureIndexes = Array.isArray(selection.texture_indexes)
    ? selection.texture_indexes.filter((index): index is number => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < pack.texture_pool.length)
    : [];
  const ruleIndexes = Array.isArray(selection.setting_rule_indexes)
    ? selection.setting_rule_indexes.filter((index): index is number => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < pack.setting_rules.length)
    : [];

  return {
    mode: safeMode,
    selected_anchor_id: safeMode === "activate_anchor" && selected ? selected.id : null,
    new_npc: newNpc,
    progress,
    turn_context: {
      story_premise: pack.story_premise,
      player_context: state.player_profile ? `${pack.player_context}${engineText.playerProfilePrefix}${state.player_profile}` : pack.player_context,
      chapter_settlement_condition: chapter.settlement_condition,
      relevant_setting_rules: ruleIndexes.length ? ruleIndexes.map((index) => pack.setting_rules[index]) : pack.setting_rules,
      on_stage_characters: onStage.map(({ id: _id, ...character }) => character),
      relevant_relationships: relevantRelationships,
      relevant_knowledge_boundaries: knowledgeBoundaries(pack, state, currentIndex, onStage),
      relationship_memory: relationshipMemory,
      established_facts: establishedFacts(pack, currentIndex),
      scene: {
        chapter_pressure: chapter.chapter_pressure,
        stage_pressure: stage.stage_pressure,
        active_anchor: {
          id: anchor.id,
          content: anchor.content,
          location: anchor.location,
          beats: anchor.beats,
          progression: anchor.progression,
        },
        director_notes: {
          open_questions: anchor.open_questions,
          forbidden_transitions: anchor.forbidden_transitions,
        },
        textures: textureIndexes.length ? textureIndexes.map((index) => pack.texture_pool[index]) : chapter.textures.slice(0, 3),
      },
      choice_guide: mainline ? { anchor_id: mainline.id, direction: mainline.content } : null,
      handoff: state.handoff_snapshot,
      scene_ledger: ledgerProjection(ledger),
    },
    on_stage_ids: onStage.map((character) => ({ label: character.name, person: character.id })),
  };
}

function routerInput(pack: StoryPack, state: EngineState, recentScene: string, input: string, clicked: ClickedChoice | null, routerNpcs: DynamicNpc[]) {
  const currentIndex = currentAnchor(pack, state.progress).segment_index;
  return {
    progress: state.progress,
    handoff_snapshot: state.handoff_snapshot,
    recent_scene_excerpt: recentScene,
    player_input: input,
    clicked_choice: clicked,
    anchors: candidateAnchors(pack, state.progress).map(({ id, chapter_id, stage, label, content }) => ({ id, chapter_id, stage, label, content })),
    characters: [
      ...pack.cast.map((character) => {
        const name = displayName(character, state, currentIndex);
        return { name, role: name === character.name ? character.role : character.alias_role, current_stance: character.current_stance };
      }),
      ...routerNpcs.map((npc) => ({ name: npc.name, role: npc.profile.split(engineText.profileSplitter)[0] || npc.relationship, current_stance: npc.profile })),
    ],
    relationships: [
      ...publicRelationships(pack, state, currentIndex).map(({ pair, relationship_context }) => ({ pair, relationship_context })),
      ...routerNpcs.map((npc) => ({ pair: [engineText.playerLabel, npc.name], relationship_context: npc.relationship })),
    ],
    setting_rules: pack.setting_rules.map((content, index) => ({ index, content })),
    textures: pack.texture_pool.map((content, index) => ({ index, content })),
    relationship_memory: baseRelationshipMemory(pack, state, currentIndex).map((memory, index) => ({ index, ...memory })),
    dynamic_npcs: routerNpcs,
    scene_ledger: ledgerProjection(normaliseLedger(state.scene_ledger)),
  };
}

/**
 * 每轮正文最终放行（揭示门槛重试、事件切分之后）再调一次小模型，从正文抽已完成事实 / 离场 / 入场并合并进账本。
 * 离场与入场只认故事包里六位角色的真名（别名如「零点」映射回真身），动态 NPC 与臆造名一律丢弃。
 * 任何失败都沿用旧账本——账本是增强，绝不能让这一轮报错。
 */
export async function extractLedger(pack: StoryPack, prose: string, previous: SceneLedger, onStageNames: string[]): Promise<SceneLedger> {
  try {
    const response = await completion(ledgerExtractionPrompt, JSON.stringify({
      prose,
      previous_ledger: ledgerProjection(previous),
      on_stage_characters: onStageNames,
      known_characters: pack.cast.map((character) => character.name),
    }), { temperature: 0, maxTokens: 700, timeoutMs: 30000, reasoningEffort: "low" });
    const parsed = jsonCandidates(response.raw);
    const strings = (input: unknown) => Array.isArray(input) ? input.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
    const realName = (raw: string) => {
      const needle = raw.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
      const character = pack.cast.find((entry) => [entry.name, ...entry.aliases].some((name) => name.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "") === needle));
      return character?.name;
    };
    const castNames = (input: unknown) => [...new Set(strings(input).flatMap((raw) => { const name = realName(raw); return name ? [name] : []; }))];
    // 单条上限：中文 30 字以内够用 80；英文 15 词常到 90–110 字符，80 会截成半句（09-11 本地验收实测），放到 140。
    const eventMax = IS_EN ? 140 : 80;
    const events = strings(parsed.events_happened).map((event) => event.slice(0, eventMax)).slice(0, 4);
    const exitedNow = castNames(parsed.exited_characters);
    const enteredNow = castNames(parsed.entered_characters);
    // 本轮被路由排上场、或正文里明确入场的人视为回到现场；本轮明确离场的人加入 exited。
    const exited = [...new Set([
      ...previous.exited.filter((name) => !enteredNow.includes(name) && !onStageNames.includes(name)),
      ...exitedNow,
    ])].slice(-8);
    return { events: [...new Set([...previous.events, ...events])].slice(-12), exited };
  } catch {
    return previous;
  }
}

function turnPrompt(packet: Packet, recentScene: string, input: string, gameState: Record<string, unknown>, styleId?: string) {
  return WRITER_TEMPLATE
    .replace("{{turn_packet}}", JSON.stringify(packet))
    .replace("{{handoff_snapshot}}", packet.turn_context.handoff)
    .replace("{{recent_scene_excerpt}}", recentScene)
    .replace("{{player_input}}", input)
    .replace("{{game_state}}", JSON.stringify(gameState))
    .replace("{{style_turn}}", JSON.stringify(styleTurn(styleId)));
}

function normaliseGuard(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

/** 英文按词边界匹配（否则 "Ward" 会命中 toward / forward / reward）；中文沿用去标点后的子串匹配。 */
function normaliseWords(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function leakedTerm(text: string, terms: string[]) {
  if (IS_EN) {
    const haystack = ` ${normaliseWords(text)} `;
    return terms.find((term) => {
      const needle = normaliseWords(term);
      return needle.length >= 2 && haystack.includes(` ${needle} `);
    });
  }
  const haystack = normaliseGuard(text);
  return terms.find((term) => {
    const needle = normaliseGuard(term);
    return needle.length >= 2 && haystack.includes(needle);
  });
}

function fallbackChoices(pack: StoryPack, packet: Packet): SidecarChoice[] {
  const guide = packet.turn_context.choice_guide;
  const alternate: SidecarChoice = { label: engineText.fallbackDeepen, kind: "deepen", anchor_id: null };
  if (guide) {
    const anchor = anchorById(pack, guide.anchor_id);
    return [{ label: anchor ? engineText.fallbackMainline(anchor.label) : engineText.fallbackMainlineGeneric, kind: "mainline", anchor_id: guide.anchor_id }, alternate];
  }
  return [alternate, { label: engineText.fallbackFreeplay, kind: "freeplay", anchor_id: null }];
}

export function normaliseTurnChoices(pack: StoryPack, value: unknown, packet: Packet): SidecarChoice[] {
  const guide = packet.turn_context.choice_guide;
  const supplied = Array.isArray(value)
    ? value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if (typeof record.label !== "string" || !record.label.trim()) return [];
      return [{
        label: record.label.trim().slice(0, engineText.choiceLabelMax),
        kind: record.kind === "mainline" || record.kind === "deepen" || record.kind === "freeplay" ? record.kind : undefined,
        anchor_id: typeof record.anchor_id === "string" ? record.anchor_id : null,
      }];
    })
    : [];
  const unique = supplied.filter((choice, index, all) => all.findIndex((candidate) => candidate.label === choice.label) === index);
  const fallback = fallbackChoices(pack, packet);
  const mainline: SidecarChoice | null = guide
    ? unique.find((choice) => choice.kind === "mainline")
      ? { label: unique.find((choice) => choice.kind === "mainline")!.label, kind: "mainline", anchor_id: guide.anchor_id }
      : fallback.find((choice) => choice.kind === "mainline")!
    : null;
  const secondaryRaw = unique.find((choice) => choice.kind === "deepen" || choice.kind === "freeplay")
    ?? unique.find((choice) => choice.kind !== "mainline")
    ?? fallback.find((choice) => choice.kind !== "mainline")!;
  const secondary: SidecarChoice = { label: secondaryRaw.label, kind: secondaryRaw.kind === "freeplay" ? "freeplay" : "deepen", anchor_id: null };
  const output: SidecarChoice[] = mainline ? [mainline, secondary] : [secondary];
  if (output.length < 2) {
    const extra = unique.find((choice) => choice.label !== output[0].label) ?? fallback.find((choice) => choice.label !== output[0].label)!;
    output.push({ label: extra.label, kind: extra.kind === "deepen" ? "deepen" : "freeplay", anchor_id: null });
  }
  return output.slice(0, 2);
}

/** P4b 输出 chapter_settled=true 时进入下一章首段的「起」；最后一章不再推进。章末结算卡由 route 按 chapter_id 变化触发。 */
function settleChapter(pack: StoryPack, progress: Progress): Progress {
  const next = pack.chapters[chapterIndex(pack, progress.chapter_id) + 1];
  if (!next) return progress;
  const firstAnchorId = next.stages.find((stage) => stage.anchor_ids.length)?.anchor_ids[0] ?? null;
  return {
    ...progress,
    chapter_id: next.chapter_id,
    stage: "起",
    active_anchor_id: firstAnchorId,
    resolved_anchor_ids: [...new Set([...progress.resolved_anchor_ids, ...(progress.active_anchor_id ? [progress.active_anchor_id] : [])])],
    tension_summary: next.stages[0]?.stage_pressure ?? next.chapter_pressure,
  };
}

/**
 * 逐行流式切分器：把写手流里不断增长的 prose 按行边界切成事件，边切边查禁词。
 *
 *  - 已完成的行：整行过 leakedTerm；干净 → 生成事件（proseToEvents 单行口径）并 onEvent 收口，记入 committed；
 *    命中 → 返回命中词，调用方中止模型流、以 committed 为前缀续写。
 *  - 未完成的行：先判定它是对白（开头命中说话人标签 + 冒号）还是旁白（已出现冒号但不是标签 / 长度已超过任何标签
 *    可能的前缀），判定前不发；判定后只发「已确定」的部分——扣掉尾部 holdback（≥ 最长禁词的字符长度，英文再退到
 *    词边界），保证任何还没写完的禁词不可能有一部分已经发出去。每次增量都对可校验部分再查一遍。
 *  - 已发出的文字不撤回（08-27 规矩）：所以最后一次尝试（不能再重试）里仍命中的行只能整行丢弃；若该行已经发出过
 *    安全前缀，则以已发出的文字收口（截断），不让禁词出现。
 *  - 续写尝试开始时开启去重：模型若把前缀末尾几行重抄一遍，等值行跳过，直到出现第一行新内容。
 */
class LineStreamer {
  readonly committed: string[] = [];
  readonly events: FrontendEvent[] = [];
  dropped = 0;
  private readonly speakerPattern: RegExp | null;
  private readonly maxLabelLength: number;
  private readonly holdback: number;
  private linesDone = 0;
  private current: { emitted: number; kind?: FrontendEvent["type"]; person?: string; poisoned: boolean } = { emitted: 0, poisoned: false };
  private dedupe = false;
  private dropOnLeak = false;

  constructor(private readonly speakers: SpeakerLabel[], private readonly forbidden: string[], private readonly hooks: TurnHooks) {
    const labels = [...new Set(speakers.map((speaker) => speaker.label.trim()).filter(Boolean))].sort((left, right) => right.length - left.length);
    this.speakerPattern = labels.length
      ? new RegExp(`^\\**(${labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\**(?:[（(][^）)]{0,16}[）)])?\\s*[：:]\\s*(.+)$`)
      : null;
    this.maxLabelLength = labels.reduce((max, label) => Math.max(max, label.length), 0);
    const longestTerm = forbidden.reduce((max, term) => Math.max(max, term.length), 0);
    this.holdback = Math.ceil(longestTerm * 1.5) + 8;
  }

  /** 新一次写手调用开始：清掉未完成行；续写时打开去重、最后一次尝试时切到丢弃模式。 */
  beginAttempt(options: { continuation: boolean; lastAttempt: boolean }) {
    this.linesDone = 0;
    this.current = { emitted: 0, poisoned: false };
    this.dedupe = options.continuation && this.committed.length > 0;
    this.dropOnLeak = options.lastAttempt;
  }

  /** 喂入本次尝试到目前为止的完整 prose；closed=true 表示 prose 字段已闭合。返回命中的禁词（需要中止时）。 */
  feed(prose: string, closed: boolean): string | undefined {
    const lines = prose.split(/\r?\n/);
    const completeCount = closed ? lines.length : lines.length - 1;
    for (; this.linesDone < completeCount; this.linesDone += 1) {
      const leaked = this.completeLine(lines[this.linesDone]);
      if (leaked) return leaked;
      this.current = { emitted: 0, poisoned: false };
    }
    if (!closed && lines.length) return this.partialLine(lines[lines.length - 1]);
    return undefined;
  }

  private isDuplicate(line: string) {
    const needle = normaliseGuard(line);
    return needle.length > 0 && this.committed.slice(-4).some((done) => normaliseGuard(done) === needle);
  }

  private couldBeDuplicatePrefix(partial: string) {
    const needle = normaliseGuard(partial);
    return needle.length === 0 || this.committed.slice(-4).some((done) => normaliseGuard(done).startsWith(needle));
  }

  private completeLine(rawLine: string): string | undefined {
    const line = rawLine.trim();
    if (!line) return undefined;
    if (this.dedupe) {
      if (this.isDuplicate(line)) return undefined;
      this.dedupe = false;
    }
    const leaked = leakedTerm(line, this.forbidden);
    if (leaked) {
      if (!this.dropOnLeak) return leaked;
      // 不能再重试：这一行不能露出去。已发出过安全前缀就用它收口，否则整行丢掉。
      this.dropped += 1;
      if (this.current.emitted > 0 && this.current.kind) {
        const shown = this.emittedText;
        this.finishEvent({ type: this.current.kind, ...(this.current.person ? { person: this.current.person } : {}), text: shown });
        this.committed.push(this.current.kind === "dialogue" ? `${this.speakerLabelFor(this.current.person)}${IS_EN ? ": " : "："}${shown}` : shown);
      }
      return undefined;
    }
    const [event] = proseToEvents(line, this.speakers);
    this.committed.push(line);
    if (event) this.finishEvent(event);
    else this.emittedText = "";
    return undefined;
  }

  /** 当前未完成行里已经发出去的显示文本（丢行截断时用它收口）。 */
  private emittedText = "";
  private speakerLabelFor(person: string | undefined) {
    return this.speakers.find((speaker) => (speaker.person ?? speaker.label) === person)?.label ?? person ?? "";
  }

  private finishEvent(event: FrontendEvent) {
    const index = this.events.length;
    this.events.push(event);
    this.hooks.onEvent?.(index, event);
    this.emittedText = "";
  }

  private partialLine(rawLine: string): string | undefined {
    const line = rawLine.trim().replace(/^[>*\-–—]\s*/, "");
    if (!line || this.current.poisoned) return undefined;
    if (this.dedupe && this.couldBeDuplicatePrefix(line)) return undefined;
    // 可校验的部分：英文去掉最后一个未写完的词（否则 "Ward" 会在 "Warden" 写到一半时误报）。
    const checkable = IS_EN ? line.slice(0, Math.max(0, line.lastIndexOf(" "))) : line;
    const leaked = checkable ? leakedTerm(checkable, this.forbidden) : undefined;
    if (leaked) {
      if (!this.dropOnLeak) return leaked;
      this.current.poisoned = true;
      return undefined;
    }
    let kind = this.current.kind;
    let person = this.current.person;
    let text: string;
    const match = this.speakerPattern?.exec(line);
    if (match) {
      const speaker = this.speakers.find((entry) => entry.label.trim() === match[1]);
      kind = "dialogue";
      person = speaker?.person ?? speaker?.label ?? match[1];
      text = match[2].trim().replace(/^[“"「]/, "");
    } else if (kind === "narration" || /[：:]/.test(line) || line.length > this.maxLabelLength + 24) {
      kind = "narration";
      person = undefined;
      text = line;
    } else {
      return undefined; // 还看不出是对白还是旁白，等下一段增量。
    }
    let safeLength = text.length - this.holdback;
    if (IS_EN && safeLength > 0) safeLength = text.lastIndexOf(" ", safeLength);
    if (safeLength <= this.current.emitted) return undefined;
    const delta = text.slice(this.current.emitted, safeLength);
    this.current = { emitted: safeLength, kind, person, poisoned: false };
    this.emittedText = text.slice(0, safeLength);
    this.hooks.onEventDelta?.(this.events.length, kind, person, delta);
    return undefined;
  }
}

export async function runTurn(pack: StoryPack, state: EngineState, recentScene: string, input: string, clicked: ClickedChoice | null, styleId?: string, hooks: TurnHooks = {}): Promise<TurnOutcome> {
  const notices: string[] = [];
  const routerNpcs = state.dynamic_npcs;
  let route: Record<string, unknown> = {};
  try {
    const routerResponse = await completion(ROUTER_PROMPT, JSON.stringify(routerInput(pack, state, recentScene, input, normaliseClickedChoice(clicked), routerNpcs)), { temperature: 0.22, maxTokens: 850, timeoutMs: 45000 });
    route = jsonCandidates(routerResponse.raw);
  } catch (error) {
    // 路由失败时按 continue_deepen 继续，正文仍然生成；只是这一轮不会推进锚点。
    notices.push(`router_fallback:${error instanceof Error ? error.message : String(error)}`);
    route = { mode: "continue_deepen" };
  }
  route = applyClickedMainline(pack, route, clicked, state.progress);
  const packet = makePacket(pack, route, state);
  hooks.onRoute?.(packet);
  const currentIndex = currentAnchor(pack, packet.progress).segment_index;
  const forbidden = forbiddenTerms(pack, currentIndex);
  const streamer = new LineStreamer(hooks.speakers?.(packet) ?? [], forbidden, hooks);
  const reveal: RevealStats = { retries: 0, leaked: [], dropped: 0 };

  const system = turnPrompt(packet, recentScene, input, state.game_state, styleId);
  let parsed: Record<string, unknown> = {};
  let extraInstruction = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const continuation = streamer.committed.length > 0;
    const lastAttempt = attempt === 2;
    streamer.beginAttempt({ continuation, lastAttempt });
    const user = `${engineText.jsonOnly}${extraInstruction}${continuation ? engineText.leakContinue(streamer.committed.join("\n")) : ""}`;
    const abort = new AbortController();
    let leaked: string | undefined;
    let streamedProse = "";
    const result = await completionStream(system, user, { temperature: 0.74, maxTokens: 2400, timeoutMs: 100000, signal: abort.signal }, (raw) => {
      if (leaked) return;
      const prose = scanProse(raw);
      if (prose.length <= streamedProse.length && !proseClosed(raw)) return;
      streamedProse = prose;
      leaked = streamer.feed(prose, proseClosed(raw));
      if (leaked) abort.abort();
    });
    if (leaked) {
      // 这里只会在还能重试的尝试里到达（最后一次尝试改为丢行，不中止）。
      notices.push(`writer_reveal_retry:${leaked}`);
      reveal.retries += 1;
      reveal.leaked.push(leaked);
      extraInstruction = engineText.leakRetry(leaked);
      continue;
    }
    try {
      parsed = jsonCandidates(result.raw);
    } catch (error) {
      const finalProse = scanProse(result.raw);
      if (finalProse.trim()) {
        // 正文本身流完了，只是结构尾巴坏了：保住正文，其余字段走缺省。
        notices.push(`writer_json_tail_recovered:${error instanceof Error ? error.message : String(error)}`);
        streamer.feed(finalProse, true);
        parsed = { prose: finalProse };
        break;
      }
      if (streamer.committed.length) {
        // 前缀已经发出去了，模型这次却什么都没给：不能整轮报错，以前缀收口。
        notices.push(`writer_json_after_prefix:${error instanceof Error ? error.message : String(error)}`);
        parsed = {};
        break;
      }
      notices.push(`writer_json_retry:${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const attemptProse = typeof parsed.prose === "string" ? parsed.prose : "";
    if (!attemptProse.trim() && !streamer.committed.length) { notices.push("writer_empty_prose_retry"); continue; }
    // 用解析后的完整 prose 再喂一遍（流里最后一段 delta 可能还没触发 closed），保证所有行都收口。
    streamer.feed(attemptProse, true);
    break;
  }
  const prose = streamer.committed.join("\n").trim();
  if (!prose) throw new Error(engineText.emptyProse);
  reveal.dropped = streamer.dropped;
  if (streamer.dropped) notices.push(`writer_reveal_dropped_lines:${streamer.dropped}`);
  if (parsed.chapter_settled === true) notices.push("chapter_settled");

  let handoff = typeof parsed.handoff_snapshot === "string" && parsed.handoff_snapshot.trim() ? parsed.handoff_snapshot.trim() : engineText.defaultHandoff;
  const handoffLeak = leakedTerm(handoff, forbidden);
  if (handoffLeak) {
    // handoff 不给玩家看，但会投进下一轮 packet；带禁词的交接句换成缺省句，不为它重写已经发出的正文。
    notices.push(`handoff_reveal_dropped:${handoffLeak}`);
    reveal.handoff_dropped = handoffLeak;
    handoff = engineText.defaultHandoff;
  }

  return {
    packet: parsed.chapter_settled === true ? { ...packet, progress: settleChapter(pack, packet.progress) } : packet,
    prose,
    handoff_snapshot: handoff,
    choices: normaliseTurnChoices(pack, parsed.choice_sidecar, packet),
    game_state_delta: parsed.game_state && typeof parsed.game_state === "object" && !Array.isArray(parsed.game_state) ? parsed.game_state as Record<string, unknown> : undefined,
    state_cards: Array.isArray(parsed.state_cards) ? parsed.state_cards : [],
    notices,
    speaker_map: packet.on_stage_ids,
    events: streamer.events,
    reveal,
  };
}
