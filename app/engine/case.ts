/**
 * 查案账本（赵艺琛 09-17）：证词三态、证物改口、警觉值、证词簿状态卡——全部由运行层按进度**确定性**计算，
 * P4b 只在 game_state 里读到结果，不负责维护。数据来自 app/case-rules.*.ts（经 story-pack 的 pack.case）。
 */
import { engineText } from "./i18n";
import type { StoryPack, Testimony, TestimonyStatus } from "./story-pack";

/**
 * 已浮现的事实：所在段已经走过（segment_index 严格早于当前锚点）且揭示门槛已开。
 * 与 runtime.establishedFacts 不同：不看 known_by——玩家在场听到的就算浮现（fact_maya_profile 的 known_by 没有 player，但它是当场说出来的）。
 */
export function surfacedFactIds(pack: StoryPack, currentIndex: number): Set<string> {
  const allowed = new Set(pack.anchors.filter((anchor) => anchor.segment_index < currentIndex).flatMap((anchor) => anchor.allowed_fact_ids));
  const surfaced = new Set<string>();
  for (const fact of pack.facts) {
    if (!allowed.has(fact.id)) continue;
    if (fact.reveal_gate_id) {
      const rule = pack.reveal_rules.find((entry) => entry.gate_id === fact.reveal_gate_id);
      if (!rule || !(rule.opens_at_index < currentIndex)) continue;
    }
    surfaced.add(fact.id);
  }
  return surfaced;
}

/** 一件证物是否足以让证人改口：单条只动摇；evidence_turns 标了 requires_two_sources 的，第二来源也要已浮现。 */
function evidenceHolds(pack: StoryPack, factId: string, surfaced: Set<string>) {
  if (!surfaced.has(factId)) return false;
  const turn = pack.case.evidence_turns.find((entry) => entry.evidence_fact_id === factId);
  if (turn?.requires_two_sources && turn.second_source_fact_id) return surfaced.has(turn.second_source_fact_id);
  return true;
}

/** 当前进度下每条证词的状态（未知 / 已证 / 已推翻）。 */
export function computeTestimonies(pack: StoryPack, currentIndex: number): Testimony[] {
  const surfaced = surfacedFactIds(pack, currentIndex);
  return pack.case.testimonies.map((definition) => {
    let status: TestimonyStatus = "unknown";
    if (definition.refuted_by && evidenceHolds(pack, definition.refuted_by, surfaced)) status = "refuted";
    else if (definition.confirmed_by && evidenceHolds(pack, definition.confirmed_by, surfaced)) status = "confirmed";
    return {
      id: definition.id,
      witness: definition.witness,
      claim: definition.claim,
      status,
      ...(status === "refuted" && definition.refuted_by ? { refuted_by: definition.refuted_by } : {}),
    };
  });
}

/** game_state.testimonies 的容错读取（P4b 或旧 token 可能没有 / 写坏了）。 */
export function readTestimonies(gameState: Record<string, unknown>): Testimony[] | null {
  const value = gameState.testimonies;
  if (!Array.isArray(value)) return null;
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const status = record.status === "confirmed" || record.status === "refuted" ? record.status : "unknown";
    if (typeof record.id !== "string" || typeof record.witness !== "string" || typeof record.claim !== "string") return [];
    return [{ id: record.id, witness: record.witness, claim: record.claim, status, ...(typeof record.refuted_by === "string" ? { refuted_by: record.refuted_by } : {}) }];
  });
}

/**
 * 证词簿状态卡（P4b 的 state_cards 形状，加 source:"runtime"）：只有本轮有状态翻转才出一张，无翻转返回 null（状态卡纪律）。
 * anchor_text 取正文最后一行的结尾片段（≤20 字）并要求全文唯一，不唯一就用整行。
 */
export function testimonyCard(previous: Testimony[] | null, next: Testimony[], prose: string) {
  const before = new Map((previous ?? []).map((testimony) => [testimony.id, testimony.status]));
  const flipped = next.filter((testimony) => (before.get(testimony.id) ?? "unknown") !== testimony.status);
  if (!flipped.length) return null;
  const lines = prose.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const last = lines[lines.length - 1] ?? "";
  let anchorText = last.slice(-20);
  if (!anchorText || prose.split(anchorText).length !== 2) anchorText = last;
  return {
    position: "after" as const,
    anchor_text: anchorText,
    label: engineText.testimonyCardLabel,
    title: engineText.testimonyCardTitle(flipped.length),
    eyebrow: engineText.testimonyCardEyebrow,
    entries: next.map((testimony) => ({ label: testimony.witness, detail: testimony.claim, status: engineText.testimonyStatus[testimony.status] })),
    accent: flipped.some((testimony) => testimony.status === "refuted") ? ("red" as const) : ("green" as const),
    source: "runtime" as const,
    flipped: flipped.map((testimony) => testimony.id),
  };
}

export type AwarenessState = { awareness: number; evidence_destroyed: string[] };

export function readAwareness(gameState: Record<string, unknown>): AwarenessState {
  const awareness = typeof gameState.awareness === "number" && Number.isFinite(gameState.awareness) ? Math.max(0, gameState.awareness) : 0;
  const destroyed = Array.isArray(gameState.evidence_destroyed) ? gameState.evidence_destroyed.filter((item): item is string => typeof item === "string") : [];
  return { awareness, evidence_destroyed: destroyed };
}

/**
 * 警觉值推进（最小机器实现，规则全文见 rule.awareness_meter / rule.awareness_destroy）：
 *   每轮先 -decay；本轮新浮现的普通线索按「翻查」各 +search_gain；两源级确凿证据（evidence_turns.requires_two_sources）各 +evidence_gain；
 *   P4a 判为 open_action（越出当前场景的剧烈行动）+action_gain。到 threshold 时把 destroyed_evidence 标记进 evidence_destroyed（只一次）。
 */
export function nextAwareness(pack: StoryPack, current: AwarenessState, previousIndex: number, currentIndex: number, mode: string): AwarenessState {
  const rule = pack.case.awareness;
  const before = surfacedFactIds(pack, previousIndex);
  const after = surfacedFactIds(pack, currentIndex);
  const hard = new Set(pack.case.evidence_turns.filter((turn) => turn.requires_two_sources).map((turn) => turn.evidence_fact_id));
  let value = Math.max(0, current.awareness - rule.decay);
  for (const factId of after) {
    if (before.has(factId)) continue;
    const fact = pack.facts.find((entry) => entry.id === factId);
    if (fact?.kind !== "clue") continue;
    value += hard.has(factId) ? rule.evidence_gain : rule.search_gain;
  }
  if (mode === "open_action") value += rule.action_gain;
  const destroyed = [...current.evidence_destroyed];
  if (value >= rule.threshold && !destroyed.includes(rule.destroyed_evidence.fact_id)) destroyed.push(rule.destroyed_evidence.fact_id);
  return { awareness: value, evidence_destroyed: destroyed };
}
