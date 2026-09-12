/**
 * 新链路输出 → Lotus 前端契约的确定性转换。
 * 前端（app/page.tsx）不改：它继续吃 {events[], choices[], mediaCues, chapterComplete, transition, finaleVote}。
 */
import type { ChapterClueReward, ChapterCompletePayload } from "../workflow-contract";
import type { SidecarChoice } from "./runtime";
import type { StoryPack } from "./story-pack";

export type FrontendEvent = { type: "narration" | "dialogue"; person?: string; text: string };
export type FrontendChoice = { id: string; text: string; kind: "action" | "speech" };
export type SpeakerLabel = { label: string; person?: string };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * P4b 的 prose 是“角色名：台词”剧本排版 + 穿插的场景段。
 * 只有已知说话人（在场角色的显示名、全体角色真名/别名、动态 NPC）开头的行才算对白，其余一律旁白，
 * 避免把“凌晨三点：静默纽约”这种带冒号的旁白误判成台词。
 */
export function proseToEvents(prose: string, speakers: SpeakerLabel[]): FrontendEvent[] {
  const labels = [...new Map(speakers.filter((speaker) => speaker.label.trim()).map((speaker) => [speaker.label.trim(), speaker])).values()]
    .sort((left, right) => right.label.length - left.label.length);
  const speakerPattern = labels.length
    ? new RegExp(`^\\**(${labels.map((speaker) => escapeRegExp(speaker.label)).join("|")})\\**(?:[（(][^）)]{0,16}[）)])?\\s*[：:]\\s*(.+)$`)
    : null;
  const byLabel = new Map(labels.map((speaker) => [speaker.label, speaker]));
  const events: FrontendEvent[] = [];
  for (const rawLine of prose.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[>*\-–—]\s*/, "");
    if (!line) continue;
    const match = speakerPattern?.exec(line);
    if (match) {
      const speaker = byLabel.get(match[1])!;
      const text = match[2].trim().replace(/^[“"「]|[”"」]$/g, "").trim();
      if (!text) continue;
      events.push({ type: "dialogue", person: speaker.person ?? speaker.label, text: text.slice(0, 600) });
      continue;
    }
    events.push({ type: "narration", text: line.slice(0, 900) });
  }
  return events;
}

/**
 * 与旧链路 visibleCharacterIds 同口径：角色卡从 user_view.character_bios 的 public_from_segment 起对玩家公开。
 * 返回当前进度下已公开的角色 id。
 */
export function publicCharacterIds(pack: StoryPack, currentIndex: number) {
  const segmentIndex = new Map(pack.segments.map((segment, index) => [segment.id, index]));
  return pack.user_view.character_bios
    .filter((bio) => {
      const from = bio.public_from_segment ? segmentIndex.get(bio.public_from_segment) : undefined;
      return from === undefined || from <= currentIndex;
    })
    .map((bio) => bio.id);
}

export function toFrontendChoices(choices: SidecarChoice[]): FrontendChoice[] {
  return choices.map((choice) => ({
    id: choice.kind === "mainline" && choice.anchor_id ? `mainline|${choice.anchor_id}` : choice.kind,
    text: choice.label,
    kind: choice.kind === "deepen" ? "speech" : "action",
  }));
}

function exposedReward(definition: NonNullable<StoryPack["chapter_completions"][number]>["reward"]): ChapterClueReward {
  const { source_refs: sourceRefs, ...reward } = definition;
  return { ...reward, sourceRefs } as ChapterClueReward;
}

/** 章节切换时给前端的结算卡（素材原样来自 chapter_completions）与下一章入口（chapter_entries）。 */
export function chapterChangePayload(pack: StoryPack, previousChapterId: string, nextChapterId: string) {
  const previousIndex = pack.user_view.chapter_outline.findIndex((chapter) => chapter.id === previousChapterId);
  const previous = pack.user_view.chapter_outline[previousIndex];
  const next = pack.user_view.chapter_outline.find((chapter) => chapter.id === nextChapterId);
  const definition = pack.chapter_completions.find((entry) => entry.chapter_id === previousChapterId);
  const chapterComplete: ChapterCompletePayload | undefined = previous && definition
    ? {
      chapterId: previous.id,
      chapterNumber: previousIndex + 1,
      title: previous.title,
      reward: exposedReward(definition.reward),
      ...(definition.transition_media
        ? {
          transitionMedia: {
            kind: definition.transition_media.kind,
            title: definition.transition_media.title,
            status: definition.transition_media.url && definition.transition_media.status !== "pending" ? "ready" as const : "pending" as const,
            ...(definition.transition_media.url ? { url: definition.transition_media.url } : {}),
            ...(definition.transition_media.poster ? { poster: definition.transition_media.poster } : {}),
            ...(definition.transition_media.caption ? { caption: definition.transition_media.caption } : {}),
          },
        }
        : {}),
    }
    : undefined;
  const entryPrompt = pack.chapter_entries.find((entry) => entry.chapter_id === nextChapterId);
  const transition = next
    ? { chapterId: next.id, title: next.title, goal: next.synopsis, ...(entryPrompt ? { entryPrompt } : {}) }
    : undefined;
  return { chapterComplete, transition };
}

export function finaleVotePayload(pack: StoryPack) {
  const finale = pack.finale_vote;
  if (!finale) return undefined;
  return {
    title: finale.title,
    question: finale.question,
    votes: finale.votes,
    options: finale.options.map((option) => ({ id: option.id, label: option.label, summary: option.summary })),
  };
}
