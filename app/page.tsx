"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { cast, chapters, chapterMessages, chapterArrivalChoices, costumeEntryMessages, openingArchivePages } from "./story-data";
import { t, ui } from "./ui-text";
import { DEFAULT_STYLE_ID, STYLE_OPTIONS, isStyleId } from "./style-options";
import "./profile-crop.css";

type EventType = "narration" | "action" | "dialogue" | "reaction";
type ChoiceKind = "action" | "speech";
type PlayerInput = { id?: string; text: string; kind: ChoiceKind | "freeform" | "identity"; displayText?: string };
type ActorId = string;
type Choice = { id?: string; text: string; kind: ChoiceKind };
type ProtocolEvent = { id: string; type: EventType; person?: ActorId; text: string };
type StoryInlineMedia = { url: string; alt: string; caption?: string };
type StoryMediaCue = { id: string; kind: "audio" | "image"; url: string; eventIndex: number; alt?: string; caption?: string };
type UiMessage = { id: string | number; person?: ActorId; label?: string; text: string; kind?: "system" | "player"; eventType?: EventType; media?: StoryInlineMedia };
type PublicCharacter = { id: ActorId; name: string; role: string; image?: string; bio: string };
type ResponseContract = { minEvents: number; maxEvents: number; choiceCount: number };
type LockedOpening = { events: ProtocolEvent[]; choices: Choice[]; wildcardSpeech: Choice[]; present: ActorId[]; roleCardActors: ActorId[]; joinHint?: string };
type ChapterReward = {
  id: string;
  type: "message" | "image" | "audio" | "video" | "document";
  title: string;
  caption?: string;
  content?: string;
  url?: string;
  poster?: string;
  status?: "pending" | "ready";
  author?: string;
  subject?: string;
  date?: string;
};
type TransitionMedia = { kind: "video" | "audio" | "image"; title: string; status?: "pending" | "ready"; url?: string; poster?: string; caption?: string };
type ChapterComplete = {
  chapterId: string;
  title: string;
  number: number;
  reward: ChapterReward;
  transitionMedia?: TransitionMedia;
};
type ChapterEntryOption = { id: string; label: string; description?: string; image?: string };
type ChapterEntryPrompt = { chapterId: string; title: string; prompt: string; image?: string; enterLabel: string; waitLabel: string; options?: ChapterEntryOption[] };
type PendingChapterTransition = { nextIndex: number; title: string; entryPrompt?: ChapterEntryPrompt };
type FinaleVote = {
  title: string;
  question: string;
  votes: Array<{ person: string; position: "destroy" | "preserve"; statement: string }>;
  options: Array<{ id: "destroy" | "preserve"; label: string; summary: string }>;
};
type EndingResult = { id: "destroy" | "preserve"; title: string; summary: string; video: { status: "pending" | "ready"; url?: string; poster?: string } };

const eventTypes = new Set<EventType>(["narration", "action", "dialogue", "reaction"]);
const chapterCompleteRevealDelayMs = 5000;
const defaultCharacters: Record<string, PublicCharacter> = Object.fromEntries(Object.entries(cast).map(([id, entry]) => [id, { id, ...entry }]));

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim();
}

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }

function staticMessages(index: number): UiMessage[] {
  return (chapterMessages[index] ?? []).map((message) => ({ ...message, eventType: message.person ? "dialogue" : "narration" }));
}

// The cast strip is a role-card directory. Story presence is enforced by the
// backend and must not make already published cards disappear from the UI.
const initialVisibleActors: ActorId[] = Object.keys(defaultCharacters);

function normalizeChoice(raw: unknown, forcedKind?: ChoiceKind): Choice | undefined {
  if (typeof raw === "string" && raw.trim()) return { text: raw.trim(), kind: forcedKind ?? "action" };
  const item = asObject(raw);
  if (!item) return;
  const text = firstString(item.text, item.label, item.utterance, item.value);
  if (!text) return;
  const kind = forcedKind ?? (item.kind === "speech" || item.type === "speech" ? "speech" : "action");
  return { ...(typeof item.id === "string" ? { id: item.id } : {}), text, kind };
}

function normalizeChoices(raw: unknown, forcedKind?: ChoiceKind): Choice[] {
  const source = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  return source.flatMap((item) => { const choice = normalizeChoice(item, forcedKind); return choice ? [choice] : []; });
}

function normalizeEvents(raw: unknown, prefix: string): ProtocolEvent[] {
  const source = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  return source.flatMap((value, index) => {
    if (typeof value === "string" && value.trim()) return [{ id: `${prefix}-${index}`, type: "narration" as const, text: value.trim() }];
    const item = asObject(value);
    if (!item) return [];
    const text = firstString(item.text, item.message, item.content);
    if (!text) return [];
    const person = firstString(item.person, item.character_id, item.actor_id);
    const candidateType = firstString(item.type, item.event_type);
    const type = candidateType && eventTypes.has(candidateType as EventType) ? candidateType as EventType : person ? "dialogue" : "narration";
    return [{ id: firstString(item.id) ?? `${prefix}-${index}`, type, ...(person ? { person } : {}), text }];
  });
}

function normalizeMediaCues(payload: Record<string, unknown>): StoryMediaCue[] {
  const rawCues = Array.isArray(payload.mediaCues ?? payload.media_cues)
    ? payload.mediaCues ?? payload.media_cues
    : payload.mediaCue || payload.media_cue
      ? [payload.mediaCue ?? payload.media_cue]
      : [];
  return (rawCues as unknown[]).flatMap((rawCue) => {
    const cue = asObject(rawCue);
    const id = firstString(cue?.id);
    const kind = cue?.kind === "audio" || cue?.kind === "image" ? cue.kind : undefined;
    const url = firstString(cue?.url);
    const eventIndex = Number(cue?.eventIndex ?? cue?.event_index);
    if (!id || !kind || !url || !Number.isInteger(eventIndex) || eventIndex < 0) return [];
    return [{
      id,
      kind,
      url,
      eventIndex,
      ...(firstString(cue?.alt) ? { alt: firstString(cue?.alt) } : {}),
      ...(firstString(cue?.caption) ? { caption: firstString(cue?.caption) } : {}),
    }];
  });
}

function characterEntries(raw: unknown): Array<[string, Record<string, unknown>]> {
  if (Array.isArray(raw)) return raw.flatMap((value) => {
    const item = asObject(value);
    const id = item && firstString(item.id, item.character_id);
    return item && id ? [[id, item] as [string, Record<string, unknown>]] : [];
  });
  const object = asObject(raw);
  return object ? Object.entries(object).flatMap(([id, value]) => {
    const item = asObject(value);
    return item ? [[id, item] as [string, Record<string, unknown>]] : [];
  }) : [];
}

function publicCharacters(payload: Record<string, unknown>) {
  const story = asObject(payload.story);
  const entries = [payload.roleCardCharacters, payload.visibleCharacters, payload.cast, payload.characters, story?.character_bios].flatMap(characterEntries);
  const characters: Record<string, PublicCharacter> = { ...defaultCharacters };
  for (const [id, item] of entries) {
    const fallback = characters[id];
    characters[id] = {
      id,
      name: firstString(item.name, item.display_name, fallback?.name) ?? id,
      role: firstString(item.role, item.title, fallback?.role) ?? t("故事角色"),
      image: firstString(item.image, item.avatar, item.image_url, fallback?.image),
      bio: firstString(item.bio, item.description, item.card, fallback?.bio) ?? t("角色资料将在故事中逐步公开。"),
    };
  }
  return {
    characters,
    visibleMetadataIds: unique([
      ...actorIds(payload.roleCardCharacters),
      ...characterEntries(payload.roleCardCharacters).map(([id]) => id),
      ...actorIds(payload.visibleCharacters),
      ...characterEntries(payload.visibleCharacters).map(([id]) => id),
    ]),
  };
}

function actorIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return unique(raw.flatMap((value) => {
    if (typeof value === "string") return [value];
    const item = asObject(value);
    const id = item && firstString(item.id, item.character_id, item.person);
    return id ? [id] : [];
  }));
}

function explicitPresent(payload: Record<string, unknown>, opening?: Record<string, unknown>) {
  const current = asObject(payload.current);
  return unique([...actorIds(payload.present), ...actorIds(current?.present), ...actorIds(opening?.present), ...actorIds(opening?.visible_character_ids)]);
}

function responseContract(raw: unknown): ResponseContract {
  const item = asObject(raw);
  const events = asObject(item?.event_count ?? item?.events);
  const choices = asObject(item?.choices);
  const minEvents = Number(item?.min_events ?? events?.min ?? 8);
  const maxEvents = Number(item?.max_events ?? events?.max ?? 12);
  const choiceCount = Number(item?.choice_count ?? item?.choices_per_turn ?? choices?.count ?? 2);
  return {
    minEvents: Number.isFinite(minEvents) ? Math.max(1, minEvents) : 8,
    maxEvents: Number.isFinite(maxEvents) ? Math.max(1, maxEvents) : 12,
    choiceCount: Number.isFinite(choiceCount) ? Math.max(0, choiceCount) : 2,
  };
}

function normalizeOpening(payload: Record<string, unknown>): LockedOpening {
  const playerContract = asObject(payload.playerContract ?? payload.player_contract);
  const opening = asObject(payload.lockedOpening ?? payload.locked_opening ?? payload.opening) ?? {};
  const events = normalizeEvents(opening.locked_events ?? opening.events ?? opening.messages ?? opening.message, "opening");
  if (!events.length) throw new Error(t("编译结果缺少 locked opening，未进入群聊。请点击重聊重新编译。"));
  const choices = normalizeChoices(playerContract?.opening_choices ?? playerContract?.openingChoices ?? opening.choices ?? payload.choices);
  const wildcardSpeech = normalizeChoices(playerContract?.wildcard_speech ?? playerContract?.wildcardSpeech ?? opening.wildcard_speech ?? payload.wildcard_speech, "speech");
  const { visibleMetadataIds } = publicCharacters(payload);
  const roleCardActors = unique([
    ...actorIds(payload.roleCardCharacters),
    ...characterEntries(payload.roleCardCharacters).map(([id]) => id),
  ]);
  const present = explicitPresent(payload, opening);
  const safePresent = visibleMetadataIds.length
    ? (present.length ? present.filter((id) => visibleMetadataIds.includes(id)) : visibleMetadataIds)
    : present;
  return { events, choices, wildcardSpeech, present: safePresent, roleCardActors: roleCardActors.length ? roleCardActors : safePresent, joinHint: firstString(opening.join_hint, opening.joinHint, playerContract?.join_hint) };
}

function responseControls(payload: Record<string, unknown>) {
  const playerContract = asObject(payload.playerContract ?? payload.player_contract);
  return {
    choices: normalizeChoices(payload.choices ?? playerContract?.choices),
    wildcardSpeech: normalizeChoices(playerContract?.wildcard_speech ?? playerContract?.wildcardSpeech ?? payload.wildcard_speech, "speech"),
  };
}

function normalizeChapterComplete(raw: unknown, fallbackNumber: number): ChapterComplete | undefined {
  const item = asObject(raw);
  if (!item) return;
  const rewardItem = asObject(item.reward);
  const transitionItem = asObject(item.transitionMedia ?? item.transition_media);
  const rewardType = firstString(rewardItem?.type);
  const safeRewardType: ChapterReward["type"] = rewardType === "image" || rewardType === "audio" || rewardType === "video" || rewardType === "document" ? rewardType : "message";
  const parsedNumber = Number(item.number ?? item.chapterNumber ?? item.chapter_number);
  const number = Number.isFinite(parsedNumber) && parsedNumber > 0 ? Math.floor(parsedNumber) : fallbackNumber;
  const chapterId = firstString(item.chapterId, item.chapter_id) ?? `chapter-${number}`;
  const title = firstString(item.title) ?? chapters[number - 1]?.title ?? ui.chapterN(number);
  const rewardContent = firstString(rewardItem?.content, rewardItem?.text, rewardItem?.transcript);
  const rewardCaption = firstString(
    rewardItem?.caption,
    rewardItem?.sender && rewardItem?.timestamp ? `${rewardItem.sender} · ${rewardItem.timestamp}` : undefined,
    rewardItem?.sender,
  );
  const reward: ChapterReward = {
    id: firstString(rewardItem?.id) ?? `${chapterId}-reward`,
    type: safeRewardType,
    title: firstString(rewardItem?.title) ?? t("本章线索"),
    ...(rewardCaption ? { caption: rewardCaption } : {}),
    ...(rewardContent ? { content: rewardContent } : {}),
    ...(firstString(rewardItem?.url) ? { url: firstString(rewardItem?.url) } : {}),
    ...(firstString(rewardItem?.poster) ? { poster: firstString(rewardItem?.poster) } : {}),
    ...(rewardItem?.status === "pending" || rewardItem?.status === "ready" ? { status: rewardItem.status } : {}),
    ...(firstString(rewardItem?.author) ? { author: firstString(rewardItem?.author) } : {}),
    ...(firstString(rewardItem?.subject) ? { subject: firstString(rewardItem?.subject) } : {}),
    ...(firstString(rewardItem?.date) ? { date: firstString(rewardItem?.date) } : {}),
  };
  if (safeRewardType === "document") reward.content = firstString(rewardItem?.text, rewardItem?.content) ?? t("论文正文待录入。");
  const transitionTitle = firstString(transitionItem?.title);
  const transitionStatus = firstString(transitionItem?.status);
  const transitionKind = firstString(transitionItem?.kind);
  const transitionMedia: TransitionMedia | undefined = transitionItem ? {
    kind: transitionKind === "audio" || transitionKind === "image" ? transitionKind : "video",
    title: transitionTitle ?? ui.transitionTitle(title),
    ...(transitionStatus === "pending" || transitionStatus === "ready" ? { status: transitionStatus } : {}),
    ...(firstString(transitionItem.url) ? { url: firstString(transitionItem.url) } : {}),
    ...(firstString(transitionItem.poster) ? { poster: firstString(transitionItem.poster) } : {}),
    ...(firstString(transitionItem.caption) ? { caption: firstString(transitionItem.caption) } : {}),
  } : undefined;
  return { chapterId, title, number, reward, ...(transitionMedia ? { transitionMedia } : {}) };
}

function normalizeEntryPrompt(raw: unknown): ChapterEntryPrompt | undefined {
  const item = asObject(raw);
  const chapterId = firstString(item?.chapter_id, item?.chapterId);
  const title = firstString(item?.title);
  const prompt = firstString(item?.prompt);
  if (!chapterId || !title || !prompt) return;
  const options = Array.isArray(item?.options) ? item.options.flatMap((rawOption) => {
    const option = asObject(rawOption);
    const id = firstString(option?.id);
    const label = firstString(option?.label);
    if (!id || !label) return [];
    return [{ id, label, ...(firstString(option?.description) ? { description: firstString(option?.description) } : {}), ...(firstString(option?.image) ? { image: firstString(option?.image) } : {}) }];
  }) : [];
  return {
    chapterId,
    title,
    prompt,
    ...(firstString(item?.image) ? { image: firstString(item?.image) } : {}),
    enterLabel: firstString(item?.enter_label, item?.enterLabel) ?? t("进入"),
    waitLabel: firstString(item?.wait_label, item?.waitLabel) ?? t("先确认退路"),
    ...(options.length ? { options } : {}),
  };
}

function normalizeFinaleVote(raw: unknown): FinaleVote | undefined {
  const item = asObject(raw);
  if (!item) return;
  const votes: FinaleVote["votes"] = Array.isArray(item.votes) ? item.votes.flatMap((rawVote) => {
    const vote = asObject(rawVote);
    const person = firstString(vote?.person);
    const position = vote?.position === "destroy" || vote?.position === "preserve" ? vote.position : undefined;
    const statement = firstString(vote?.statement);
    return person && position && statement ? [{ person, position, statement }] : [];
  }) : [];
  const options: FinaleVote["options"] = Array.isArray(item.options) ? item.options.flatMap((rawOption) => {
    const option = asObject(rawOption);
    const id = option?.id === "destroy" || option?.id === "preserve" ? option.id : undefined;
    const label = firstString(option?.label);
    const summary = firstString(option?.summary);
    return id && label && summary ? [{ id, label, summary }] : [];
  }) : [];
  const title = firstString(item.title);
  const question = firstString(item.question);
  return title && question && votes.length && options.length === 2 ? { title, question, votes, options } : undefined;
}

function ChapterRewardCard({ reward }: { reward: ChapterReward }) {
  const typeLabel = reward.type === "image" ? t("影像证物") : reward.type === "audio" ? t("音频记录") : reward.type === "video" ? t("监控影像") : reward.type === "document" ? t("文件证物") : t("消息记录");
  return <article className={`chapter-reward chapter-reward-${reward.type}`}>
    <header><span>{t("获得线索")}</span><small>{typeLabel}</small></header>
    {reward.type === "image" && <div className="reward-visual">{reward.url ? <img src={reward.url} alt={reward.title} /> : <div className="reward-empty" aria-label={t("线索图片待添加")}><span>▧</span><small>{t("影像待解锁")}</small></div>}<i aria-hidden="true">REC</i></div>}
    {reward.type === "audio" && <div className="reward-audio">{reward.url ? <audio src={reward.url} controls preload="metadata" /> : <div className="audio-wave" aria-label={t("线索音频待添加")}><i /><i /><i /><i /><i /><i /><i /><i /></div>}</div>}
    {reward.type === "video" && <div className="reward-visual reward-video">{reward.url ? <video src={reward.url} poster={reward.poster} controls playsInline preload="metadata" /> : reward.poster ? <img src={reward.poster} alt={reward.title} /> : <div className="reward-empty"><span>▶</span><small>{t("视频待添加")}</small></div>}<div className="reward-video-status">{reward.url ? "PLAY" : "VIDEO PENDING"}</div></div>}
    {reward.type === "message" && <div className="reward-message"><span aria-hidden="true">⌁</span><p>{reward.content ?? t("一条新消息已收入案件档案。")}</p></div>}
    {reward.type === "document" && <details className="reward-envelope"><summary><span aria-hidden="true">✉</span><div><small>{reward.author}{reward.date ? ` · ${reward.date}` : ""}</small><strong>{reward.subject ?? reward.title}</strong></div><b>{t("打开")}</b></summary><div className="reward-paper"><p>{reward.content}</p></div></details>}
    <div className="reward-copy"><h3>{reward.title}</h3>{reward.type !== "message" && reward.type !== "document" && reward.content && <p>{reward.content}</p>}{reward.caption && <small>{reward.caption}</small>}</div>
  </article>;
}

async function compileWorkflow(sessionId: string) {
  const response = await fetch("/api/workflow/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(firstString(payload.error) ?? ui.compileFailedHttp(response.status));
  if (!firstString(payload.sessionId)) throw new Error(t("编译响应缺少 sessionId"));
  if (!firstString(payload.workflowToken)) throw new Error(t("编译响应缺少剧情会话令牌"));
  return payload;
}

function Avatar({ actor, characters, onOpen }: { actor: ActorId; characters: Record<string, PublicCharacter>; onOpen?: (actor: ActorId) => void }) {
  const entry = characters[actor] ?? { id: actor, name: actor, role: t("故事角色"), bio: t("角色资料尚未公开。") };
  const visual = entry.image ? <img className="avatar" src={entry.image} alt={entry.name} /> : <span className="avatar avatar-fallback" aria-hidden="true">{entry.name.slice(0, 1)}</span>;
  return onOpen ? <button type="button" className="avatar-button" aria-label={ui.viewCard(entry.name)} onClick={() => onOpen(actor)}>{visual}</button> : visual;
}

function StoryEventMedia({ media }: { media: StoryInlineMedia }) {
  return <figure className="story-event-media">
    <img src={media.url} alt={media.alt} />
    {media.caption && <figcaption>{media.caption}</figcaption>}
  </figure>;
}

function OpeningArchive({ page, onPageChange, onPlay }: { page: number; onPageChange: (page: number) => void; onPlay: () => void }) {
  const dossier = openingArchivePages[page] ?? openingArchivePages[0];
  return <div className="opening-archive-wrap">
    <article className="opening-archive" aria-label={`${dossier.title}${dossier.eyebrow}`}>
      <div className="archive-masthead">
        <small>THE SILENT NEW YORK ARCHIVE</small>
        <h2>{dossier.title}</h2>
        <span>{dossier.code}</span>
      </div>
      <div className="archive-body">
        <h3>{dossier.eyebrow}</h3>
        {dossier.rows.map((row) => <section className="archive-row" key={row.label}>
          <b>{row.label}：</b>
          <p>{row.text}</p>
        </section>)}
      </div>
      <footer className="archive-footer">
        <button type="button" aria-label={t("上一页档案")} onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0}>←</button>
        <span>PAGE {page + 1} / {openingArchivePages.length}</span>
        <button type="button" aria-label={t("下一页档案")} onClick={() => onPageChange(Math.min(openingArchivePages.length - 1, page + 1))} disabled={page === openingArchivePages.length - 1}>→</button>
      </footer>
    </article>
    <div className="opening-vlog-entry">
      <div><small>CASE MATERIAL 01</small><strong>{t("玛雅留下的未经剪辑 Vlog")}</strong></div>
      <button type="button" onClick={onPlay}>{t("查看影像")} <b aria-hidden="true">▶</b></button>
    </div>
  </div>;
}

export default function Home() {
  const [chapter, setChapter] = useState(0);
  const [openingArchivePage, setOpeningArchivePage] = useState(0);
  const [messages, setMessages] = useState<UiMessage[]>(staticMessages(0));
  const [input, setInput] = useState("");
  const [playerRoleDraft, setPlayerRoleDraft] = useState("");
  const [playerProfile, setPlayerProfile] = useState("");
  const [videoState, setVideoState] = useState<"cached" | "playing" | "frame">("cached");
  const [selectedPerson, setSelectedPerson] = useState<ActorId | null>(null);
  const [pending, setPending] = useState(false);
  const [streamingId, setStreamingId] = useState<string | number | null>(null);
  const [restartNote, setRestartNote] = useState("");
  // 逐轮文风：只随每次 /api/chat 请求发送，切换只影响之后的轮次，不重开会话（重开要重过 Vlog 闸门）。
  const [styleId, setStyleId] = useState(DEFAULT_STYLE_ID);
  const [watchedVlog, setWatchedVlog] = useState(false);
  const [openingApplied, setOpeningApplied] = useState(false);
  const [compiledOpening, setCompiledOpening] = useState<LockedOpening | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<"compiling" | "ready" | "error">("compiling");
  const [workflowError, setWorkflowError] = useState("");
  const [turnError, setTurnError] = useState("");
  const [workflowSessionId, setWorkflowSessionId] = useState("");
  const [workflowToken, setWorkflowToken] = useState("");
  const [liveChoices, setLiveChoices] = useState<Choice[]>([]);
  const [wildcardSpeech, setWildcardSpeech] = useState<Choice[]>([]);
  const [characters, setCharacters] = useState<Record<string, PublicCharacter>>(defaultCharacters);
  const [visibleActors, setVisibleActors] = useState<ActorId[]>(initialVisibleActors);
  const [turnContract, setTurnContract] = useState<ResponseContract>({ minEvents: 8, maxEvents: 12, choiceCount: 2 });
  const [chapterComplete, setChapterComplete] = useState<ChapterComplete | null>(null);
  const [chapterEndingPause, setChapterEndingPause] = useState(false);
  const [pendingChapterTransition, setPendingChapterTransition] = useState<PendingChapterTransition | null>(null);
  const [transitionVideoPlaying, setTransitionVideoPlaying] = useState(false);
  const [chapterEntryPrompt, setChapterEntryPrompt] = useState<ChapterEntryPrompt | null>(null);
  const [finaleVote, setFinaleVote] = useState<FinaleVote | null>(null);
  const [endingResult, setEndingResult] = useState<EndingResult | null>(null);
  const [finalePending, setFinalePending] = useState(false);
  const [blockedStoryAudioCue, setBlockedStoryAudioCue] = useState(false);
  const [choiceWheelOpen, setChoiceWheelOpen] = useState(false);
  const [choiceWheelSelection, setChoiceWheelSelection] = useState<number | null>(null);
  const vlogVideoRef = useRef<HTMLVideoElement>(null);
  const storyAudioRef = useRef<HTMLAudioElement>(null);
  const playedStoryCues = useRef(new Set<string>());
  const sessionWildcardSpeech = useRef<Choice[]>([]);
  const compileVersion = useRef(0);
  const initialSessionStarted = useRef(false);
  const identityIntroSession = useRef("");
  const choiceWheelStartY = useRef<number | null>(null);
  const choiceWheelSelectionRef = useRef<number | null>(null);
  const [identityIntroQueued, setIdentityIntroQueued] = useState(false);
  const active = chapters[chapter] ?? chapters[0];
  const storyLocked = chapter === 0 && (!watchedVlog || !openingApplied);

  async function beginSession(reset: boolean) {
    const version = ++compileVersion.current;
    const sessionId = crypto.randomUUID();
    const storyAudio = storyAudioRef.current;
    if (storyAudio) { storyAudio.pause(); storyAudio.currentTime = 0; }
    playedStoryCues.current.clear();
    sessionWildcardSpeech.current = [];
    setBlockedStoryAudioCue(false);
    setChoiceWheelOpen(false); setChoiceWheelSelection(null); choiceWheelSelectionRef.current = null; choiceWheelStartY.current = null;
    setWorkflowStatus("compiling"); setWorkflowError(""); setTurnError(""); setWorkflowSessionId(""); setWorkflowToken("");
    setCompiledOpening(null); setOpeningApplied(false); setLiveChoices([]); setWildcardSpeech([]);
    setChapterComplete(null); setChapterEndingPause(false); setPendingChapterTransition(null); setTransitionVideoPlaying(false);
    setChapterEntryPrompt(null); setFinaleVote(null); setEndingResult(null); setFinalePending(false);
    if (reset) {
      setChapter(0); setMessages(staticMessages(0)); setVisibleActors(initialVisibleActors); setCharacters(defaultCharacters);
      setOpeningArchivePage(0);
      identityIntroSession.current = "";
      setIdentityIntroQueued(false);
      setWatchedVlog(false); setInput(""); setPlayerRoleDraft(""); setPlayerProfile(""); setVideoState("cached"); setStreamingId(null); setRestartNote(t("正在创建新的独立会话……"));
    }
    try {
      const payload = await compileWorkflow(sessionId);
      if (compileVersion.current !== version) return;
      const opening = normalizeOpening(payload);
      const dynamicCharacters = publicCharacters(payload);
      setCharacters(dynamicCharacters.characters); setCompiledOpening(opening);
      setTurnContract(responseContract(payload.responseContract ?? payload.response_contract));
      setWorkflowSessionId(firstString(payload.sessionId) ?? sessionId);
      setWorkflowToken(firstString(payload.workflowToken) ?? "");
      setWorkflowStatus("ready");
      if (opening.roleCardActors.length) setVisibleActors(opening.roleCardActors);
      if (reset) setRestartNote(t("新的会话已经就绪。先从这段 Vlog 开始。"));
    } catch (error) {
      if (compileVersion.current !== version) return;
      setWorkflowError(error instanceof Error ? error.message : t("Prompt 1/2 编译失败")); setWorkflowStatus("error");
    }
  }

  useEffect(() => {
    if (initialSessionStarted.current) return;
    initialSessionStarted.current = true;
    void beginSession(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!watchedVlog || openingApplied || workflowStatus !== "ready" || !compiledOpening) return;
    setMessages(compiledOpening.events.map((event) => ({ id: event.id, text: event.text, person: event.person, eventType: event.type, kind: event.person ? undefined : "system" })));
    sessionWildcardSpeech.current = compiledOpening.wildcardSpeech;
    setLiveChoices(compiledOpening.choices); setWildcardSpeech(compiledOpening.wildcardSpeech);
    const eventActors = compiledOpening.events.flatMap((event) => event.person ? [event.person] : []);
    if (compiledOpening.roleCardActors.length || eventActors.length) setVisibleActors(unique([...compiledOpening.roleCardActors, ...eventActors]));
    setOpeningApplied(true);
  }, [compiledOpening, openingApplied, watchedVlog, workflowStatus]);

  function startOver() { if (!pending) void beginSession(true); }

  function playIntro() {
    setVideoState("playing");
    window.requestAnimationFrame(() => {
      const video = vlogVideoRef.current;
      if (!video) return;
      video.currentTime = 0;
      void video.play().catch(() => setVideoState("frame"));
    });
  }

  function finishVlog() { setVideoState("frame"); setWatchedVlog(true); }

  async function typeScene(events: ProtocolEvent[], messageId: number, mediaCues: StoryMediaCue[] = []) {
    for (let offset = 0; offset < events.length; offset += 1) {
      const event = events[offset];
      const fullText = event.text.trim();
      if (!fullText) continue;
      const nextId = `${messageId}-${event.id}-${offset}`;
      const message: UiMessage = { id: nextId, text: "", eventType: event.type, ...(event.person ? { person: event.person } : { kind: "system" }) };
      setMessages((current) => [...current, message]); setStreamingId(nextId);
      for (let cursor = 2; cursor < fullText.length + 2; cursor += 2) {
        const visibleText = fullText.slice(0, cursor);
        setMessages((current) => current.map((item) => item.id === nextId ? { ...item, text: visibleText } : item));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 18));
      }
      setStreamingId(null);
      const imageCue = mediaCues.find((cue) => cue.kind === "image" && cue.eventIndex === offset);
      if (imageCue) {
        setMessages((current) => current.map((item) => item.id === nextId
          ? { ...item, media: { url: imageCue.url, alt: imageCue.alt ?? t("剧情影像"), ...(imageCue.caption ? { caption: imageCue.caption } : {}) } }
          : item));
      }
      if (mediaCues.some((cue) => cue.kind === "audio" && cue.id === "ch02-childhood-song" && cue.eventIndex === offset)) void playChildhoodSong();
      await new Promise<void>((resolve) => window.setTimeout(resolve, 160));
    }
  }

  async function playChildhoodSong() {
    const cueId = "ch02-childhood-song";
    if (playedStoryCues.current.has(cueId)) return;
    playedStoryCues.current.add(cueId);
    const audio = storyAudioRef.current;
    if (!audio) { setBlockedStoryAudioCue(true); return; }
    audio.currentTime = 0;
    try {
      await audio.play();
      setBlockedStoryAudioCue(false);
    } catch {
      setBlockedStoryAudioCue(true);
    }
  }

  function resumeChildhoodSong() {
    const audio = storyAudioRef.current;
    if (!audio) return;
    void audio.play().then(() => setBlockedStoryAudioCue(false)).catch(() => setBlockedStoryAudioCue(true));
  }

  async function send(choice: PlayerInput) {
    const trimmed = choice.text.trim();
    if (!trimmed || pending || chapterComplete || chapterEntryPrompt || finaleVote || endingResult || workflowStatus !== "ready" || !workflowSessionId || !workflowToken || storyLocked) return false;
    const id = Date.now();
    const historySnapshot = messages;
    const displayText = choice.displayText?.trim() || trimmed;
    setChoiceWheelOpen(false); setChoiceWheelSelection(null); choiceWheelSelectionRef.current = null; choiceWheelStartY.current = null;
    setMessages((current) => [...current, { id, kind: "player", label: choice.kind === "identity" ? t("本次身份") : t("你"), text: displayText }]);
    setRestartNote(""); setTurnError(""); setInput(""); setPending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: workflowSessionId, workflowToken, history: historySnapshot, input: trimmed, inputKind: choice.kind, style_id: styleId, ...(playerProfile ? { playerProfile } : {}), ...("id" in choice && choice.id ? { choiceId: choice.id } : {}) }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(firstString(payload.error) ?? ui.turnFailedHttp(response.status));
      const nextWorkflowToken = firstString(payload.workflowToken);
      if (!nextWorkflowToken) throw new Error(t("本轮响应缺少剧情会话令牌"));
      setWorkflowToken(nextWorkflowToken);
      const updatedPlayerProfile = firstString(payload.playerProfile, payload.player_profile)?.trim();
      if (updatedPlayerProfile && updatedPlayerProfile !== playerProfile) {
        setPlayerProfile(updatedPlayerProfile);
        setPlayerRoleDraft(updatedPlayerProfile);
      }
      const events = normalizeEvents(payload.events, `turn-${id}`);
      const contract = responseContract(payload.responseContract ?? payload.response_contract ?? turnContract);
      if (events.length < contract.minEvents || events.length > contract.maxEvents) throw new Error(ui.eventCountMismatch(events.length, contract.minEvents, contract.maxEvents));
      const controls = responseControls(payload);
      const mediaCues = normalizeMediaCues(payload);
      if (controls.choices.length !== contract.choiceCount) throw new Error(ui.choiceCountMismatch(controls.choices.length, contract.choiceCount));
      await typeScene(events, id, mediaCues);
      if (controls.wildcardSpeech.length) sessionWildcardSpeech.current = controls.wildcardSpeech;
      setLiveChoices(controls.choices);
      setWildcardSpeech(sessionWildcardSpeech.current);
      setTurnContract(contract);

      const dynamicCharacters = publicCharacters(payload);
      if (characterEntries(payload.visibleCharacters).length || characterEntries(payload.cast).length || characterEntries(payload.characters).length) setCharacters((current) => ({ ...current, ...dynamicCharacters.characters }));
      const present = explicitPresent(payload);
      const visibleIds = actorIds(payload.visibleCharacters);
      const safePresent = visibleIds.length ? present.filter((actor) => visibleIds.includes(actor)) : present;
      const eventActors = events.flatMap((event) => event.person ? [event.person] : []);
      const safeEventActors = visibleIds.length ? eventActors.filter((actor) => visibleIds.includes(actor)) : eventActors;
      // The strip is the story's role-card directory, not the current-speaker
      // roster. Keep already published cards visible while the backend's
      // `present` list continues to restrict who may speak in Prompt 3.
      setVisibleActors((current) => unique([...current, ...safePresent, ...safeEventActors]));

      const transition = asObject(payload.transition);
      const chapterId = firstString(transition?.chapterId, transition?.chapter_id);
      let nextTransition: PendingChapterTransition | null = null;
      if (chapterId) {
        const nextIndex = Number(chapterId.replace(/\D/g, "")) - 1;
        if (chapters[nextIndex]) {
          const title = firstString(transition?.title) ?? chapters[nextIndex].title;
          const entryPrompt = normalizeEntryPrompt(transition?.entryPrompt ?? transition?.entry_prompt);
          nextTransition = { nextIndex, title, ...(entryPrompt ? { entryPrompt } : {}) };
        }
      }
      const nextFinaleVote = normalizeFinaleVote(payload.finaleVote ?? payload.finale_vote);
      if (nextFinaleVote) {
        setFinaleVote(nextFinaleVote);
        setLiveChoices([]);
        setWildcardSpeech([]);
      }
      const completedChapter = normalizeChapterComplete(payload.chapterComplete ?? payload.chapter_complete, chapter + 1);
      if (completedChapter) {
        const fallbackIndex = Math.min(completedChapter.number, chapters.length - 1);
        setSelectedPerson(null);
        setLiveChoices([]);
        setWildcardSpeech([]);
        setChapterEndingPause(true);
        await new Promise<void>((resolve) => window.setTimeout(resolve, chapterCompleteRevealDelayMs));
        setChapterEndingPause(false);
        setChapterComplete(completedChapter);
        setPendingChapterTransition(nextTransition ?? (chapters[fallbackIndex] && fallbackIndex !== chapter ? {
          nextIndex: fallbackIndex,
          title: chapters[fallbackIndex].title,
        } : null));
        setTransitionVideoPlaying(false);
      } else if (nextTransition) {
        showChapter(nextTransition.nextIndex, ui.enteredChapter(nextTransition.nextIndex + 1, nextTransition.title));
      }
      return true;
    } catch (error) {
      // Keep the submitted player line visible. This is especially important
      // for dice speech: removing it made a rejected model batch look like the
      // button had never fired, even though the request reached Prompt 3.
      setTurnError(error instanceof Error ? error.message : t("本轮生成失败，请重试。故事状态没有在页面中继续推进。"));
      return false;
    } finally { setStreamingId(null); setChapterEndingPause(false); setPending(false); }
  }

  useEffect(() => {
    if (!identityIntroQueued || !playerProfile || !watchedVlog || !openingApplied || workflowStatus !== "ready" || !workflowSessionId || !workflowToken || pending || chapterComplete || storyLocked) return;
    if (identityIntroSession.current === workflowSessionId) return;
    identityIntroSession.current = workflowSessionId;
    setIdentityIntroQueued(false);
    // The identity confirmation itself is the player's first join action. It
    // waits for the Vlog and locked opening, then goes through Prompt 3 exactly
    // once so NPC attitudes and the next choices can be shaped by that identity.
    // The wording only repeats what the player typed; it invents no history,
    // temperament or ability beyond their own description.
    const openingChoices = liveChoices;
    const openingWildcardSpeech = wildcardSpeech;
    setLiveChoices([]);
    setWildcardSpeech([]);
    // A failed identity turn is deliberately not auto-retried: the backend did
    // not count it, and the player can submit their next line with the same
    // profile without duplicate bubbles or duplicate requests.
    void send({
      text: ui.identityJoinInput(playerProfile),
      displayText: ui.identityJoinDisplay(playerProfile),
      kind: "identity",
    }).then((accepted) => {
      if (accepted || identityIntroSession.current !== workflowSessionId) return;
      setLiveChoices(openingChoices);
      setWildcardSpeech(openingWildcardSpeech);
    });
    // `send` intentionally remains a render-local coordinator; primitive
    // guards above make this a one-shot effect for the active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterComplete, identityIntroQueued, openingApplied, pending, playerProfile, storyLocked, watchedVlog, workflowSessionId, workflowStatus, workflowToken]);

  function submit(event: FormEvent) { event.preventDefault(); void send({ text: input, kind: "freeform" }); }
  function updateWheelSelection(index: number | null) {
    choiceWheelSelectionRef.current = index;
    setChoiceWheelSelection(index);
  }
  function beginWheelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pending || !liveChoices.length) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    choiceWheelStartY.current = event.clientY;
    updateWheelSelection(null);
  }
  function moveWheelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (choiceWheelStartY.current === null) return;
    const distance = event.clientY - choiceWheelStartY.current;
    updateWheelSelection(distance < -16 ? 0 : distance > 16 ? Math.min(1, liveChoices.length - 1) : null);
  }
  function endWheelDrag() {
    if (choiceWheelStartY.current === null) return;
    choiceWheelStartY.current = null;
    const selected = choiceWheelSelectionRef.current;
    if (selected !== null && liveChoices[selected]) {
      setChoiceWheelOpen(false);
      updateWheelSelection(null);
      void send(liveChoices[selected]);
      return;
    }
    setChoiceWheelOpen((open) => !open);
  }
  function cancelWheelDrag() {
    choiceWheelStartY.current = null;
    updateWheelSelection(null);
  }
  function showChapter(index: number, note: string, entryMessages?: UiMessage[]) {
    const nextChapter = chapters[index];
    if (!nextChapter) return;
    setChapter(index);
    setMessages(entryMessages?.length ? entryMessages : [{
      id: `chapter-${index + 1}-entry-${Date.now()}`,
      kind: "system",
      eventType: "narration",
      text: nextChapter.scene,
    }]);
    setLiveChoices(chapterArrivalChoices[index] ?? []);
    setWildcardSpeech(sessionWildcardSpeech.current);
    setSelectedPerson(null);
    setTurnError("");
    setInput("");
    setChoiceWheelOpen(false);
    updateWheelSelection(null);
    setRestartNote(note);
  }
  function continueFromChapter() {
    if (!chapterComplete) return;
    const target = pendingChapterTransition;
    setChapterComplete(null);
    setPendingChapterTransition(null);
    setTransitionVideoPlaying(false);
    setLiveChoices([]);
    setWildcardSpeech([]);
    if (target) {
      if (target.entryPrompt) {
        setChapterEntryPrompt(target.entryPrompt);
        setRestartNote("");
      } else {
        showChapter(target.nextIndex, ui.enteredChapter(target.nextIndex + 1, target.title));
      }
    } else {
      setRestartNote(ui.chapterDone(chapterComplete.number));
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
  function enterChapter(cautious: boolean, optionId?: string, promptOverride?: ChapterEntryPrompt) {
    const entryPrompt = promptOverride ?? chapterEntryPrompt;
    if (!entryPrompt) return;
    const nextIndex = Number(entryPrompt.chapterId.replace(/\D/g, "")) - 1;
    const nextChapter = chapters[nextIndex];
    setChapterEntryPrompt(null);
    setChapterComplete(null);
    setPendingChapterTransition(null);
    setTransitionVideoPlaying(false);
    if (nextChapter) {
      const costumeMessages: Record<string, UiMessage[]> = costumeEntryMessages(Date.now());
      const selectedOption = entryPrompt.options?.find((option) => option.id === optionId);
      showChapter(nextIndex, selectedOption
        ? ui.enterWithCostume(selectedOption.label, nextIndex + 1, nextChapter.title)
        : cautious
          ? ui.enterCautious(nextIndex + 1, nextChapter.title)
          : ui.enterBold(nextIndex + 1, nextChapter.title), optionId ? costumeMessages[optionId] : undefined);
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
  async function castFinaleVote(choice: "destroy" | "preserve") {
    if (!finaleVote || finalePending || !workflowSessionId || !workflowToken) return;
    setFinalePending(true);
    setTurnError("");
    try {
      const response = await fetch("/api/finale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: workflowSessionId, workflowToken, choice }),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(firstString(payload.error) ?? t("终局投票失败"));
      const nextWorkflowToken = firstString(payload.workflowToken);
      if (nextWorkflowToken) setWorkflowToken(nextWorkflowToken);
      const rawEnding = asObject(payload.ending);
      const rawVideo = asObject(rawEnding?.video);
      const id = rawEnding?.id === "destroy" || rawEnding?.id === "preserve" ? rawEnding.id : undefined;
      const title = firstString(rawEnding?.title);
      const summary = firstString(rawEnding?.summary);
      if (!id || !title || !summary || !rawVideo) throw new Error(t("终局响应不完整"));
      setEndingResult({
        id,
        title,
        summary,
        video: {
          status: rawVideo.status === "ready" ? "ready" : "pending",
          ...(firstString(rawVideo.url) ? { url: firstString(rawVideo.url) } : {}),
          ...(firstString(rawVideo.poster) ? { poster: firstString(rawVideo.poster) } : {}),
        },
      });
      setFinaleVote(null);
    } catch (error) {
      setTurnError(error instanceof Error ? error.message : t("终局投票失败"));
    } finally {
      setFinalePending(false);
    }
  }
  function savePlayerRole(event: FormEvent) {
    event.preventDefault();
    const role = playerRoleDraft.trim().slice(0, 100);
    if (!role) return;
    setPlayerProfile(role);
    setPlayerRoleDraft(role);
    setIdentityIntroQueued(true);
  }

  const playerRoleControl = playerProfile ? null : <form className="identity-composer" onSubmit={savePlayerRole}>
    <label htmlFor="player-role">{t("本次身份")} <small>{t("可选")}</small></label>
    <div>
      <input id="player-role" aria-label={t("输入你想扮演的角色")} value={playerRoleDraft} onChange={(event) => setPlayerRoleDraft(event.target.value)} placeholder={t("例如：聪明但嘴硬的天才实习生")} maxLength={100} />
      <button type="submit" disabled={!playerRoleDraft.trim()}>{t("确认")}</button>
    </div>
  </form>;

  const selectedCharacter = selectedPerson ? characters[selectedPerson] : undefined;
  const identityIntroBlocking = Boolean(playerProfile && identityIntroQueued);
  const waitingForOpening = watchedVlog && !openingApplied && workflowStatus === "compiling";
  const completedNextNumber = pendingChapterTransition ? pendingChapterTransition.nextIndex + 1 : chapterComplete ? chapterComplete.number + 1 : chapter + 2;
  const transitionMedia = chapterComplete?.transitionMedia;
  const transitionMediaReady = Boolean(transitionMedia?.url && transitionMedia.status !== "pending");
  const combinedChapterEntry = chapterComplete?.chapterId === "ch02" && pendingChapterTransition?.entryPrompt?.chapterId === "ch03"
    ? pendingChapterTransition.entryPrompt
    : undefined;

  return <main className={`app-shell ${active.bg}`}>
    <aside className="sidebar"><button type="button" className="brand brand-reset" onClick={startOver} disabled={pending || workflowStatus === "compiling"} aria-label={t("从头开始")}><span className="brand-dot" />{t("↺ 从头开始")}</button><div className="case-label">{t("案件档案 / 03:00")}</div><nav className="chapter-list" aria-label={t("章节")}>{chapters.map((item, index) => <button key={item.title} disabled={index !== chapter} className={index === chapter ? "chapter active" : "chapter locked"}><span>0{index + 1}</span><strong>{item.title}</strong><small>{index === chapter ? item.sub : t("由故事状态解锁")}</small></button>)}</nav></aside>
    <section className="experience">
      <header className="topbar"><button className="restart" type="button" onClick={startOver} disabled={pending || workflowStatus === "compiling"}>{t("↺ 从头开始")}</button><label className="style-picker"><span>{t("文风")}</span><select value={styleId} onChange={(event) => { if (isStyleId(event.target.value)) setStyleId(event.target.value); }} disabled={pending || workflowStatus === "compiling"} aria-label={t("选择文风，只影响之后的轮次")} title={t("选择文风，只影响之后的轮次")}>{STYLE_OPTIONS.map((option) => <option key={option.id} value={option.id} title={option.note}>{option.label}</option>)}</select></label><div><span>{t("静默纽约")}</span><h1>{ui.chapterHeading(chapter + 1, active.title)}</h1></div></header>
      <div className="cast-strip" aria-label={t("故事角色")}>{visibleActors.map((actor) => { const entry = characters[actor] ?? { id: actor, name: actor, role: t("故事角色"), bio: t("角色资料尚未公开。") }; return <div className="cast-chip" key={actor}><Avatar actor={actor} characters={characters} onOpen={setSelectedPerson} /><span>{entry.name}</span></div>; })}{!visibleActors.length && <span className="cast-empty">{t("角色正在载入…")}</span>}</div>
      <section className="cinema" aria-label={t("章节影像")}><div className="cinema-noise" /><div className="cinema-copy"><p>CHAPTER {String(chapter + 1).padStart(2, "0")}</p><h2>{active.title}</h2><span>{active.sub}</span></div>{chapter === 0 && <OpeningArchive page={openingArchivePage} onPageChange={setOpeningArchivePage} onPlay={playIntro} />}<div className="video-badge">{videoState === "cached" ? t("视频待缓存") : videoState === "playing" ? t("正在播放") : t("最后一帧已锁定为背景")}</div></section>
      {videoState !== "cached" && <section className="vlog-panel" aria-label={t("玛雅的 Vlog")}><video ref={vlogVideoRef} src="/maya-opening-vlog.mp4" poster="/chapters-maya-vlog.png" playsInline controls autoPlay={videoState === "playing"} onEnded={finishVlog} />{videoState === "frame" && <button className="close-vlog" type="button" aria-label={t("关闭 Vlog")} onClick={() => setVideoState("cached")}>×</button>}</section>}
      <audio ref={storyAudioRef} src="/childhood-country-americana-approach.mp3" preload="auto" hidden aria-hidden="true" onEnded={() => setBlockedStoryAudioCue(false)} />
      <section className="story-pane"><div className="scene-line"><span>{t("当前现场")}</span>{active.scene}</div>{restartNote && <div className="restart-note">↺ {restartNote}</div>}<div className="messages">{messages.map((message) => {
        const streaming = message.id === streamingId ? "is-streaming" : "";
        if (message.kind === "player") return <article className={`message player ${streaming}`} key={message.id}><div><header>{message.label}<small>{message.label === t("本次身份") ? t("你加入故事的方式") : t("你的判断")}</small></header><p>{message.text}</p></div></article>;
        const eventType = message.eventType ?? (message.person ? "dialogue" : "narration");
        if (eventType !== "dialogue" || !message.person) return <article className={`narration-block event-${eventType} ${streaming}`} key={message.id}><p className="narration">{message.text}</p>{message.media && <StoryEventMedia media={message.media} />}</article>;
        const entry = characters[message.person] ?? { id: message.person, name: message.person, role: t("故事角色"), bio: t("角色资料尚未公开。") };
        return <article className={`dialogue event-${eventType} ${streaming}`} key={message.id}><Avatar actor={message.person} characters={characters} onOpen={setSelectedPerson} /><div className="npc-copy"><header><b>{entry.name}</b></header><p>{message.text}</p>{message.media && <StoryEventMedia media={message.media} />}</div></article>;
      })}</div>{blockedStoryAudioCue && <button className="story-audio-fallback" type="button" onClick={resumeChildhoodSong}><span aria-hidden="true">♪</span><b>{t("播放旧音响里的童年旋律")}</b><small>{t("断续、失真，像一张转坏的旧唱片")}</small></button>}{storyLocked ? <><p className={`watch-note ${workflowStatus === "error" ? "protocol-error" : ""}`}>{!watchedVlog ? t("先播放完玛雅的 Vlog，看看在场的人各自看见了什么。") : waitingForOpening ? t("Vlog 已播放，正在等待 Prompt 1/2 返回锁定开场……") : workflowStatus === "error" ? ui.compileFailedWith(workflowError || t("未知错误")) : t("正在装载锁定开场……")}</p>{playerRoleControl}</> : <>{turnError && <div className="protocol-error turn-error" role="alert"><b>{t("本轮没有通过协议")}</b><span>{turnError}</span><button type="button" onClick={() => setTurnError("")}>{t("知道了")}</button></div>}{identityIntroBlocking && <p className="narration typing">{t("正在让在场的人认识你……")}</p>}{chapterEndingPause && <p className="narration typing">{t("本章最后的画面还停在这里……")}</p>}{pending && streamingId === null && !chapterEndingPause && <p className="narration typing">{t("正在生成一整段电影探索场景……")}</p>}{playerRoleControl}<div className="interaction-dock"><form className="composer" onSubmit={submit}><input aria-label={t("输入你的行动或判断")} value={input} onChange={(event) => setInput(event.target.value)} placeholder={compiledOpening?.joinHint ?? t("说说你的判断，或者直接问一个人…")} disabled={pending || identityIntroBlocking} /><button type="submit" disabled={pending || identityIntroBlocking || !input.trim()}>{t("发送")} <span>↵</span></button></form>{liveChoices.length > 0 && !identityIntroBlocking && <div className={`choice-wheel-shell ${choiceWheelOpen ? "is-open" : ""} ${choiceWheelSelection !== null ? `is-selecting-${choiceWheelSelection}` : ""}`}><div className="choice-wheel-popover" id="story-choice-wheel" aria-hidden={!choiceWheelOpen && choiceWheelSelection === null}>{liveChoices.map((choice, index) => <button type="button" disabled={pending} className={choiceWheelSelection === index ? "is-selected" : ""} key={choice.id ?? `${choice.text}-${index}`} onClick={() => void send(choice)}><span>{choice.text}</span></button>)}{wildcardSpeech.length > 0 && <button type="button" className="choice-wheel-random" aria-label={t("掷骰子，随机说一句协议提供的话")} disabled={pending} onClick={() => void send(wildcardSpeech[Math.floor(Math.random() * wildcardSpeech.length)])}><span>{t("🎲 随机回答")}</span></button>}</div><button type="button" className="choice-wheel" aria-label={t("剧情转盘：点击展开，上下拖动并松手直接发送")} aria-expanded={choiceWheelOpen} aria-controls="story-choice-wheel" disabled={pending} onPointerDown={beginWheelDrag} onPointerMove={moveWheelDrag} onPointerUp={endWheelDrag} onPointerCancel={cancelWheelDrag} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setChoiceWheelOpen((open) => !open); } }}><span aria-hidden="true">Ⅰ</span><b>{t("选择")}</b><span aria-hidden="true">Ⅱ</span></button></div>}</div></>}</section>
      {selectedPerson && selectedCharacter && <div className="profile-overlay" role="dialog" aria-modal="true" aria-label={ui.characterCard(selectedCharacter.name)} onClick={() => setSelectedPerson(null)}><section className={`profile-card ${/^[-_a-z0-9]+$/i.test(selectedPerson) ? `profile-${selectedPerson}` : ""}`} onClick={(event) => event.stopPropagation()}><button className="profile-close" onClick={() => setSelectedPerson(null)} aria-label={t("关闭角色卡")}>×</button>{selectedCharacter.image ? <img src={selectedCharacter.image} alt={selectedCharacter.name} /> : <div className="profile-placeholder">{selectedCharacter.name.slice(0, 1)}</div>}<span>{selectedCharacter.role}</span><h2>{selectedCharacter.name}</h2><p>{selectedCharacter.bio}</p></section></div>}
      {chapterComplete && <div className="chapter-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="chapter-complete-title">
        <section className="chapter-complete-card">
          <header className="chapter-complete-head">
            <div className="chapter-complete-seal" aria-hidden="true"><span>✓</span></div>
            <p>CHAPTER {String(chapterComplete.number).padStart(2, "0")} COMPLETE</p>
            <span>{ui.chapterComplete(chapterComplete.number)}</span>
            <h2 id="chapter-complete-title">{chapterComplete.title}</h2>
            <small>{t("这一章留下的东西，已经收入你的案件档案。")}</small>
          </header>
          {transitionMedia && <section className={`chapter-transition media-${transitionMedia.kind}`}>
            <header><span>{transitionMedia.kind === "audio" ? t("章节声音") : t("章节过场")}</span><small>{transitionMediaReady ? t("可播放") : t("等待素材")}</small></header>
            <div className={`chapter-transition-frame ${transitionVideoPlaying ? "is-playing" : ""}`}>
              {transitionVideoPlaying && transitionMediaReady && transitionMedia.url && transitionMedia.kind === "video" ? <video src={transitionMedia.url} poster={transitionMedia.poster} controls playsInline autoPlay onEnded={() => setTransitionVideoPlaying(false)} /> : transitionVideoPlaying && transitionMediaReady && transitionMedia.url && transitionMedia.kind === "audio" ? <div className="transition-audio"><div className="audio-wave"><i /><i /><i /><i /><i /><i /><i /><i /></div><audio src={transitionMedia.url} controls autoPlay onEnded={() => setTransitionVideoPlaying(false)} /></div> : transitionMedia.poster ? <img src={transitionMedia.poster} alt={t("章节媒体预览")} /> : <div className="transition-placeholder" aria-hidden="true"><span>{transitionMedia.kind === "audio" ? "♫" : "▶"}</span></div>}
              {!transitionVideoPlaying && <div className="transition-frame-copy"><small>{transitionMediaReady ? "MEDIA READY" : "MEDIA PENDING"}</small><strong>{transitionMedia.title}</strong><span>{transitionMedia.caption ?? (transitionMediaReady ? t("点击下方按钮播放") : t("素材待添加"))}</span></div>}
            </div>
            <button className="transition-play" type="button" disabled={!transitionMediaReady} onClick={() => setTransitionVideoPlaying(true)}>{transitionMediaReady ? (transitionMedia.kind === "audio" ? t("播放童年音乐") : t("播放章节媒体")) : t("素材待添加")}</button>
          </section>}
          {!combinedChapterEntry && <ChapterRewardCard reward={chapterComplete.reward} />}
          {combinedChapterEntry && <section className="chapter-complete-entry" aria-labelledby="combined-chapter-entry-title">
            <div className="chapter-entry-copy"><h2 id="combined-chapter-entry-title">{combinedChapterEntry.title}</h2><p>{combinedChapterEntry.prompt}</p></div>
            <div className="costume-entry-options">{combinedChapterEntry.options?.map((option) => <button type="button" key={option.id} onClick={() => enterChapter(false, option.id, combinedChapterEntry)}>{option.image && <img src={option.image} alt={option.label} />}<span>{option.label}</span>{option.description && <small>{option.description}</small>}</button>)}</div>
          </section>}
          {!combinedChapterEntry && <footer className="chapter-complete-actions">
            <button type="button" onClick={continueFromChapter}>{pendingChapterTransition ? ui.enterChapter(completedNextNumber) : t("收下线索")}<span aria-hidden="true">→</span></button>
          </footer>}
        </section>
      </div>}
      {chapterEntryPrompt && <div className="chapter-entry-overlay" role="dialog" aria-modal="true" aria-labelledby="chapter-entry-title">
        <section className="chapter-entry-card">
          {!chapterEntryPrompt.options?.length && <div className="chapter-entry-image">{chapterEntryPrompt.image ? <img src={chapterEntryPrompt.image} alt={t("章节入口")} /> : <div className="entry-door" aria-hidden="true" />}</div>}
          <div className="chapter-entry-copy"><small>{ui.chapterEntryEyebrow(Number(chapterEntryPrompt.chapterId.replace(/\D/g, "")))}</small><h2 id="chapter-entry-title">{chapterEntryPrompt.title}</h2><p>{chapterEntryPrompt.prompt}</p></div>
          {chapterEntryPrompt.options?.length ? <div className="costume-entry-options">{chapterEntryPrompt.options.map((option) => <button type="button" key={option.id} onClick={() => enterChapter(false, option.id)}>{option.image && <img src={option.image} alt={option.label} />}<span>{option.label}</span>{option.description && <small>{option.description}</small>}</button>)}</div> : <div className="chapter-entry-actions"><button type="button" onClick={() => enterChapter(false)}>{chapterEntryPrompt.enterLabel}</button><button type="button" onClick={() => enterChapter(true)}>{chapterEntryPrompt.waitLabel}</button></div>}
        </section>
      </div>}
      {finaleVote && <div className="finale-overlay" role="dialog" aria-modal="true" aria-labelledby="finale-vote-title">
        <section className="finale-card">
          <header><small>FINAL VOTE · 1 : 1</small><h2 id="finale-vote-title">{finaleVote.title}</h2><p>{finaleVote.question}</p></header>
          <div className="finale-votes">{finaleVote.votes.map((vote) => { const entry = characters[vote.person]; return <article key={vote.person}><Avatar actor={vote.person} characters={characters} /><div><b>{entry?.name ?? vote.person}</b><small>{vote.position === "destroy" ? t("摧毁梦境") : t("保留梦境")}</small><p>{vote.statement}</p></div></article>; })}</div>
          <div className="finale-last-vote"><span>{t("最后一票属于你")}</span>{finaleVote.options.map((option) => <button type="button" key={option.id} className={`finale-option ${option.id}`} disabled={finalePending} onClick={() => void castFinaleVote(option.id)}><strong>{option.label}</strong><small>{option.summary}</small></button>)}</div>
        </section>
      </div>}
      {endingResult && <div className="ending-overlay" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <section className={`ending-card ending-${endingResult.id}`}>
          <small>THE END · {endingResult.id === "destroy" ? "REALITY" : "ELEVEN MINUTES"}</small>
          <h2 id="ending-title">{endingResult.title}</h2>
          <p>{endingResult.summary}</p>
          <div className="ending-video">{endingResult.video.url && endingResult.video.status === "ready" ? <video src={endingResult.video.url} poster={endingResult.video.poster} controls playsInline autoPlay /> : endingResult.video.poster ? <img src={endingResult.video.poster} alt={endingResult.title} /> : <div className="transition-placeholder"><span>▶</span></div>}<i>{endingResult.video.status === "ready" ? t("结局影像") : t("结局视频待添加")}</i></div>
          <button type="button" onClick={startOver}>{t("从头开始")}</button>
        </section>
      </div>}
    </section>
  </main>;
}
