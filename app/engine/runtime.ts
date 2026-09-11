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
import { completion, jsonCandidates } from "./kaon";
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

export async function runTurn(pack: StoryPack, state: EngineState, recentScene: string, input: string, clicked: ClickedChoice | null, styleId?: string): Promise<TurnOutcome> {
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
  const currentIndex = currentAnchor(pack, packet.progress).segment_index;
  const forbidden = forbiddenTerms(pack, currentIndex);

  let parsed: Record<string, unknown> = {};
  let prose = "";
  let extraInstruction = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await completion(turnPrompt(packet, recentScene, input, state.game_state, styleId), `${engineText.jsonOnly}${extraInstruction}`, { temperature: 0.74, maxTokens: 2400, timeoutMs: 100000 });
    try {
      parsed = jsonCandidates(response.raw);
    } catch (error) {
      notices.push(`writer_json_retry:${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    prose = typeof parsed.prose === "string" ? parsed.prose.trim() : "";
    if (!prose) { notices.push("writer_empty_prose_retry"); continue; }
    const leaked = leakedTerm([prose, typeof parsed.handoff_snapshot === "string" ? parsed.handoff_snapshot : ""].join("\n"), forbidden);
    if (leaked && attempt < 2) {
      notices.push(`writer_reveal_retry:${leaked}`);
      extraInstruction = engineText.leakRetry(leaked);
      prose = "";
      continue;
    }
    break;
  }
  if (!prose) throw new Error(engineText.emptyProse);
  if (parsed.chapter_settled === true) notices.push("chapter_settled");

  return {
    packet: parsed.chapter_settled === true ? { ...packet, progress: settleChapter(pack, packet.progress) } : packet,
    prose,
    handoff_snapshot: typeof parsed.handoff_snapshot === "string" && parsed.handoff_snapshot.trim() ? parsed.handoff_snapshot.trim() : engineText.defaultHandoff,
    choices: normaliseTurnChoices(pack, parsed.choice_sidecar, packet),
    game_state_delta: parsed.game_state && typeof parsed.game_state === "object" && !Array.isArray(parsed.game_state) ? parsed.game_state as Record<string, unknown> : undefined,
    state_cards: Array.isArray(parsed.state_cards) ? parsed.state_cards : [],
    notices,
    speaker_map: packet.on_stage_ids,
  };
}
