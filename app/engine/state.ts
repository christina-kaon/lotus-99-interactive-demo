/** 跨轮状态（封进 workflowToken 里随每轮往返）与它的规范化。 */
import type { Person } from "../story-data";
import type { Stage, StoryPack } from "./story-pack";
import { engineText } from "./i18n";

export type Progress = {
  chapter_id: string;
  stage: Stage;
  active_anchor_id: string | null;
  resolved_anchor_ids: string[];
  transformed_anchor_ids: string[];
  tension_summary: string;
};

export type DynamicNpc = { name: string; relationship: string; profile: string };

export type ClickedChoice = { kind: "mainline" | "deepen" | "freeplay"; anchor_id: string | null };

/**
 * 事件账本（赵艺琛 09-11：「已发生的事、已离场的人跨轮记住再投给写手」）。
 * events：此前各轮已完成的事实（最多 12 条，最近优先）；exited：已离场、此刻不在场的角色真名（最多 8 人）。
 * 随 EngineState 封进 workflowToken 往返；每轮正文放行后由一次小调用抽取更新（见 runtime.extractLedger）。
 */
export type SceneLedger = { events: string[]; exited: string[] };
export const EMPTY_LEDGER: SceneLedger = { events: [], exited: [] };

export function normaliseLedger(value: unknown): SceneLedger {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const strings = (input: unknown, limit: number) => Array.isArray(input)
    ? [...new Set(input.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))].slice(-limit)
    : [];
  return { events: strings(record.events, 12), exited: strings(record.exited, 8) };
}

export type EngineState = {
  v: 2;
  story: string;
  created_at: number;
  progress: Progress;
  handoff_snapshot: string;
  seen_character_names: string[];
  dynamic_npcs: DynamicNpc[];
  game_state: Record<string, unknown>;
  player_profile: string;
  played_media_ids: string[];
  /** 已经在正文里被揭开真名的角色（例如零点摘面罩后 daniel 可直接用真名）。 */
  revealed_ids: Person[];
  completed_chapters: string[];
  turns: number;
  finale_ready: boolean;
  finale_choice?: "destroy" | "preserve";
  /** 可选：引入账本前签发的 token 没有这个字段，openState 后用 normaliseLedger 补成空账本。 */
  scene_ledger?: SceneLedger;
};

export function initialState(pack: StoryPack): EngineState {
  const first = pack.anchors.find((anchor) => anchor.id === pack.initial_anchor_id) ?? pack.anchors[0];
  const stagePressure = pack.chapters[0].stages.find((stage) => stage.anchor_ids.includes(first.id))?.stage_pressure ?? "";
  return {
    v: 2,
    story: pack.id,
    created_at: Date.now(),
    progress: {
      chapter_id: first.chapter_id,
      stage: first.stage,
      active_anchor_id: first.id,
      resolved_anchor_ids: [],
      transformed_anchor_ids: [],
      tension_summary: stagePressure,
    },
    handoff_snapshot: pack.opening.message,
    seen_character_names: [...new Set(pack.opening.locked_events.flatMap((event) => {
      const character = event.person ? pack.cast.find((entry) => entry.id === event.person) : undefined;
      return character ? [character.name] : [];
    }))],
    dynamic_npcs: [],
    game_state: {},
    player_profile: "",
    played_media_ids: [],
    revealed_ids: [],
    completed_chapters: [],
    turns: 0,
    finale_ready: false,
    scene_ledger: { events: [], exited: [] },
  };
}

export function normaliseProgress(value: unknown, fallback: Progress): Progress {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const stage = record.stage;
  return {
    chapter_id: typeof record.chapter_id === "string" ? record.chapter_id : fallback.chapter_id,
    stage: stage === "承" || stage === "转" || stage === "合" ? stage : "起",
    active_anchor_id: typeof record.active_anchor_id === "string" ? record.active_anchor_id : null,
    resolved_anchor_ids: Array.isArray(record.resolved_anchor_ids) ? record.resolved_anchor_ids.filter((id): id is string => typeof id === "string") : fallback.resolved_anchor_ids,
    transformed_anchor_ids: Array.isArray(record.transformed_anchor_ids) ? record.transformed_anchor_ids.filter((id): id is string => typeof id === "string") : fallback.transformed_anchor_ids,
    tension_summary: typeof record.tension_summary === "string" ? record.tension_summary : fallback.tension_summary,
  };
}

export function normaliseDynamicNpcs(value: unknown): DynamicNpc[] {
  if (!Array.isArray(value)) return [];
  const names = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim().slice(0, 24) : "";
    const relationship = typeof record.relationship === "string" ? record.relationship.trim().slice(0, 60) : "";
    const profile = typeof record.profile === "string" ? record.profile.trim().slice(0, 240) : "";
    if (!name || !profile || names.has(name)) return [];
    names.add(name);
    return [{ name, relationship: relationship || engineText.npcDefaultRelationship, profile }];
  }).slice(-4);
}

export function normaliseNewNpc(value: unknown, existing: DynamicNpc[], reservedNames: Set<string>): DynamicNpc | null {
  if (!value || typeof value !== "object") return null;
  const [npc] = normaliseDynamicNpcs([value]);
  if (!npc || existing.some((item) => item.name === npc.name) || reservedNames.has(npc.name)) return null;
  return npc;
}

export function normaliseClickedChoice(value: unknown): ClickedChoice | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind !== "mainline" && record.kind !== "deepen" && record.kind !== "freeplay") return null;
  return { kind: record.kind, anchor_id: typeof record.anchor_id === "string" ? record.anchor_id : null };
}

/** 前端把点击的按钮 id 原样回传（形如 `mainline|ch01_s02` / `deepen` / `freeplay`）。 */
export function clickedChoiceFromId(choiceId: unknown): ClickedChoice | null {
  if (typeof choiceId !== "string") return null;
  const match = choiceId.match(/^(mainline|deepen|freeplay)(?:\|(.+))?$/);
  if (!match) return null;
  return { kind: match[1] as ClickedChoice["kind"], anchor_id: match[2] ?? null };
}
