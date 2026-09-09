/**
 * Lotus 99 故事包（P2 形状）。
 *
 * 这里不写任何新剧情：所有文本都从既有素材逐字搬运——
 *   app/story-data.ts            人物 / 章节 / 开场消息 / 关系（publicFact、directorNote、revealFromChapter）
 *   app/workflow-precompiled.ts  预编译 RuntimePackage：角色决策卡、segment 边界与 materials、章节结算、换装、终局投票
 *   app/workflow-source.ts       剧情卡：premise、锁定开场、事实目录、关系规则、揭示门槛、玩家契约、Persona
 *
 * 引擎（app/engine/runtime.ts）只读这份包，不认识 Lotus 的任何专名。
 */
import { cast as uiCast, chapters as uiChapters, storyInteraction, type Person } from "../story-data";
import { createPrecompiledWorkflow } from "../workflow-precompiled";
import { workflowSource } from "../workflow-source";
import type {
  ChapterCompletionDefinition,
  ChapterEntryPromptDefinition,
  FinaleVoteDefinition,
  LockedOpeningEvent,
  PlayerContract,
  RuntimeSegment,
} from "../workflow-contract";

export type Stage = "起" | "承" | "转" | "合";
export const STAGES: Stage[] = ["起", "承", "转", "合"];

export type PerformanceCard = {
  visual_signature: string;
  habitual_behavior: string;
  pressure_response: string;
  private_goal: string;
  relationship_tactic: string;
  first_entry_cue: string;
};

export type PackCharacter = {
  id: Person;
  name: string;
  role: string;
  character_core: string;
  voice_and_behavior: string;
  current_stance: string;
  performance_card: PerformanceCard;
  /** 揭示门槛满足前用的公开别名（来自 relationshipRules / revealGates 的 aliases_before_reveal）。 */
  aliases: string[];
  /** 别名期用的身份词（取自 Persona 原文里已有的词），避免 role 把真名/真实关系带进正文。 */
  alias_role: string;
  /** 从哪个 segment（索引）开始可以用真名；之前正文里只能出现别名。 */
  name_public_from_index: number;
  /** 该角色不知道的事实（原文），映射自 RuntimePackage.characters[].knowledge.does_not_know。 */
  does_not_know: string[];
};

export type PackAnchor = {
  id: string;
  chapter_id: string;
  stage: Stage;
  /** segment.scene 原文。 */
  content: string;
  /** segment.label 原文（segmentPlan）。 */
  label: string;
  location: string;
  present: Person[];
  /** segment.materials[].detail 原文——本段可以发生的事。 */
  beats: string[];
  /** segment.progression 原文。 */
  progression: string;
  open_questions: string[];
  forbidden_transitions: string[];
  allowed_fact_ids: string[];
  segment_index: number;
};

export type PackChapter = {
  chapter_id: string;
  act: string;
  chapter_pressure: string;
  emotional_question: string;
  stages: Array<{ stage: Stage; stage_pressure: string; anchor_ids: string[] }>;
  textures: string[];
  /** 本章可被自然结算的条件（wiki P2「章节结算编译规则」）：沿用 chapter_arcs 里「合」拍的 dramatic_function 原文。 */
  settlement_condition: string;
};

export type PackRelationship = {
  pair: [string, string];
  relationship_context: string;
  interaction_dynamic: string;
  director_note?: string;
  reveal_from_chapter?: number;
};

export type KnowledgeBoundary = { who: string; does_not_know: string };

export type PackFact = { id: string; text: string; kind: string; known_by: string[]; reveal_gate_id?: string };

export type RevealRule = {
  gate_id: string;
  /** 打开这道门槛的 material 所在 segment 索引；当前进度早于它时，forbidden_reveals 不得出现在可见文本。 */
  opens_at_index: number;
  forbidden_reveals: string[];
};

export type StoryPack = {
  id: string;
  title: string;
  story_premise: string;
  player_context: string;
  setting_rules: string[];
  texture_pool: string[];
  cast: PackCharacter[];
  relationships: PackRelationship[];
  anchors: PackAnchor[];
  chapters: PackChapter[];
  facts: PackFact[];
  reveal_rules: RevealRule[];
  segments: RuntimeSegment[];
  opening: { locked_events: LockedOpeningEvent[]; message: string; join_hint?: string };
  player_contract: PlayerContract;
  chapter_completions: ChapterCompletionDefinition[];
  chapter_entries: ChapterEntryPromptDefinition[];
  finale_vote: FinaleVoteDefinition | undefined;
  user_view: { chapter_outline: Array<{ id: string; title: string; synopsis: string }>; character_bios: Array<{ id: string; name: string; bio: string; public_from_segment?: string }> };
  /** 首个 segment id（开场发生的地方）。 */
  initial_anchor_id: string;
};

const personIds = Object.keys(uiCast) as Person[];

function nameOf(id: Person) {
  return uiCast[id].name;
}

function samePeople(left: string[], right: string[]) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function buildPack(): StoryPack {
  const { storyPackage, runtimePackage } = createPrecompiledWorkflow();
  const source = workflowSource.storyCard;
  const director = storyPackage.director_data;
  const segments = runtimePackage.segments;
  const segmentIndex = new Map(segments.map((segment, index) => [segment.id, index]));
  const factById = new Map(director.fact_catalog.map((fact) => [fact.id, fact]));

  // 揭示规则：某个 reveal gate 由哪个 segment 的 material 打开。
  const revealRules: RevealRule[] = director.reveal_gates.map((gate) => {
    const opener = segments.find((segment) => segment.materials.some((material) => material.reveal_gate_ids?.includes(gate.id)));
    return {
      gate_id: gate.id,
      opens_at_index: opener ? segmentIndex.get(opener.id)! : Number.POSITIVE_INFINITY,
      forbidden_reveals: gate.forbidden_reveals,
    };
  });

  // 角色别名与真名可用时机：别名来自 relationshipRules / revealGates 的 aliases_before_reveal；
  // 真名从“公开姓名/身份”的 material 所在 segment 起可用。
  const aliasMap = new Map<string, Set<string>>();
  for (const rule of [...director.relationship_rules, ...director.reveal_gates]) {
    for (const [id, alias] of Object.entries(rule.aliases_before_reveal)) {
      if (!aliasMap.has(id)) aliasMap.set(id, new Set());
      aliasMap.get(id)!.add(alias);
    }
  }
  const namePublicFrom = (id: Person) => {
    const gateForName = id === "ward" ? "reveal_ward_identity" : id === "daniel" ? "reveal_daniel_is_zero" : undefined;
    if (!gateForName) return 0;
    const rule = revealRules.find((entry) => entry.gate_id === gateForName);
    // 身份在打开门槛的那一段里被揭开；下一段起正文可以直接用真名。
    return rule && Number.isFinite(rule.opens_at_index) ? rule.opens_at_index + 1 : 0;
  };

  const personaById = new Map(workflowSource.selectedBotPersonas.map((persona) => [persona.id, persona]));
  const cardById = new Map(runtimePackage.characters.map((character) => [character.id, character]));
  const directorById = new Map(director.characters.map((character) => [character.id, character]));

  const cast: PackCharacter[] = personIds.map((id) => {
    const ui = uiCast[id];
    const persona = personaById.get(id);
    const card = cardById.get(id);
    const dc = directorById.get(id);
    const engine = dc?.emotional_engine;
    return {
      id,
      name: ui.name,
      role: ui.role,
      character_core: [ui.bio, persona?.persona].filter(Boolean).join(" "),
      voice_and_behavior: card?.card ?? "",
      current_stance: dc?.goal ?? "",
      performance_card: {
        visual_signature: "",
        habitual_behavior: engine?.defense ?? "",
        pressure_response: engine?.relational_trigger ?? "",
        private_goal: engine?.secret_desire ?? "",
        relationship_tactic: engine?.unmet_need ?? "",
        first_entry_cue: "",
      },
      aliases: [...(aliasMap.get(id) ?? [])].sort((left, right) => left.length - right.length),
      // 丹尼尔的 Persona 原文是“艾琳的弟弟与匿名DJ”，别名期只留“匿名DJ”这半句；沃德别名期就用别名本身。
      alias_role: id === "daniel" ? "匿名DJ" : id === "ward" ? "白发修理工" : ui.role,
      name_public_from_index: namePublicFrom(id),
      does_not_know: (card?.knowledge?.does_not_know ?? []).flatMap((factId) => {
        const fact = factById.get(factId);
        return fact ? [fact.text] : [];
      }),
    };
  });

  // 关系：story-data 的公开关系 + 预编译 relationshipRules 的 canonical 作为互动方式。
  const relationships: PackRelationship[] = storyInteraction.relationships.map((relationship) => {
    const ids = relationship.characters;
    const pair: [string, string] = ids.length === 2 ? [nameOf(ids[0]), nameOf(ids[1])] : ["你", nameOf(ids[0])];
    const rule = director.relationship_rules.find((entry) => samePeople(entry.participants, ids));
    return {
      pair,
      relationship_context: relationship.publicFact,
      interaction_dynamic: rule?.canonical ?? relationship.publicFact,
      ...(relationship.directorNote ? { director_note: relationship.directorNote } : {}),
      ...(relationship.revealFromChapter ? { reveal_from_chapter: relationship.revealFromChapter } : {}),
    };
  });
  relationships.unshift({
    pair: ["你", nameOf("erin")],
    relationship_context: source.playerContract.default_presence,
    interaction_dynamic: storyInteraction.player.defaultPresence,
  });

  // 锚点 = segment；同一章内按顺序落到 起/承/转/合。
  const anchors: PackAnchor[] = [];
  const chapters: PackChapter[] = source.chapters.map((chapter, chapterNumber) => {
    const chapterSegments = segments.filter((segment) => segment.chapter_id === chapter.id);
    const arc = director.chapter_arcs.find((entry) => entry.chapter_id === chapter.id)!;
    const stages = STAGES.map((stage, position) => {
      const segment = chapterSegments[position];
      if (!segment) return { stage, stage_pressure: arc.beats[stage].dramatic_function, anchor_ids: [] as string[] };
      const plan = source.segmentPlan.find((entry) => entry.id === segment.id)!;
      anchors.push({
        id: segment.id,
        chapter_id: chapter.id,
        stage,
        content: segment.scene,
        label: plan.label,
        location: segment.location,
        present: segment.present as Person[],
        beats: segment.materials.map((material) => material.detail),
        progression: segment.progression,
        open_questions: segment.open_questions ?? [],
        forbidden_transitions: segment.scene_boundary.forbidden_transitions,
        allowed_fact_ids: segment.allowed_fact_ids,
        segment_index: segmentIndex.get(segment.id)!,
      });
      return { stage, stage_pressure: segment.dramatic.pressure, anchor_ids: [segment.id] };
    });
    const ui = uiChapters[chapterNumber];
    return {
      chapter_id: chapter.id,
      act: `第${["一", "二", "三", "四", "五"][chapterNumber] ?? chapterNumber + 1}章 · ${chapter.title}`,
      chapter_pressure: ui?.goal ?? chapter.synopsis,
      emotional_question: arc.emotional_question,
      stages,
      textures: [...new Set([ui?.scene, ...chapterSegments.map((segment) => segment.location)].filter((item): item is string => Boolean(item)))],
      settlement_condition: arc.beats["合"].dramatic_function,
    };
  });

  // 旧运行协议里描述“回合形状”的两条不带入（新链路按 P4b 的正文长度写，不按事件条数）。
  const settingRules = director.constraints.filter((rule) => !/社交节拍|8至12条事件/.test(rule));

  return {
    id: "lotus99",
    title: source.title,
    story_premise: source.premise,
    player_context: source.playerContract.default_presence,
    setting_rules: settingRules,
    texture_pool: [...new Set(chapters.flatMap((chapter) => chapter.textures))],
    cast,
    relationships,
    anchors,
    chapters,
    facts: director.fact_catalog.map((fact) => ({ id: fact.id, text: fact.text, kind: fact.kind, known_by: fact.known_by, ...(fact.reveal_gate_id ? { reveal_gate_id: fact.reveal_gate_id } : {}) })),
    reveal_rules: revealRules,
    segments,
    opening: {
      locked_events: runtimePackage.runtime.opening.locked_events,
      message: runtimePackage.runtime.opening.message,
      join_hint: runtimePackage.runtime.opening.join_hint,
    },
    player_contract: runtimePackage.runtime.player_contract,
    chapter_completions: runtimePackage.runtime.chapter_completions ?? [],
    chapter_entries: runtimePackage.runtime.chapter_entries ?? [],
    finale_vote: runtimePackage.runtime.finale_vote,
    user_view: storyPackage.user_view,
    initial_anchor_id: segments[0].id,
  };
}

let cached: StoryPack | undefined;
export function lotusStoryPack(): StoryPack {
  return cached ??= buildPack();
}

export function chapterNumber(pack: StoryPack, chapterId: string) {
  return pack.chapters.findIndex((chapter) => chapter.chapter_id === chapterId) + 1;
}
