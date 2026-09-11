/**
 * 引擎层按语言分叉的文案与规则。中文值与引入语言开关前的硬编码逐字相同（中文版行为零变化）；
 * 英文值给独立英文部署用——这些字符串要么进 packet 被模型读到，要么直接显示给玩家，所以必须英文。
 * P4a / P4b 提示词本体不翻译（赵艺琛 wiki 的中文本体）：英文版只在提示词末尾追加输出语言指令（见 runtime.ts）。
 */
import { IS_EN, PLAYER_LABEL } from "../locale";

const zh = {
  playerLabel: PLAYER_LABEL,
  /** 动态 NPC 缺省表演卡文案。 */
  npcHabit: "说话会先看一眼现场的人和物，再决定是否开口。",
  npcPurpose: "处理这次突然回到你面前所带来的现实事务。",
  npcRoleSuffix: " / 临时来访者",
  npcCoreJoin: "。",
  npcVisual: "带着与身份相符、能被一眼认出的随身物进入现场。",
  npcPressure: "被质疑时先停下手边的事，再把回答落回眼前要处理的现实问题。",
  npcTactic: "不替你下结论，先用正在发生的事确认彼此还能不能把话说下去。",
  npcEntry: "带着一件必须当场处理的现实事务出现，先处理它，再与现场的人对上。",
  npcInteraction: "这个人的到场会让旧有称谓、物件归属、站位或未说完的话重新变得具体；不要替任何人下结论。",
  npcDefaultRelationship: "与你有一段已知关系的来访者",
  /** 动态 NPC profile 的分句符。 */
  profileSplitter: /[；;。]/,
  /** 知识边界。 */
  forbiddenWho: "旁白与所有在场角色（对玩家可见的文本，当前章节禁止公开）",
  listJoin: "；",
  pairJoin: "与",
  playerProfilePrefix: " 玩家自述的本次身份：",
  /** 兜底选项。 */
  fallbackDeepen: "先把眼前这件事说清楚",
  fallbackMainline: (label: string) => `先把这一步走完：${label}`,
  fallbackMainlineGeneric: "顺着眼前的安排，把这件事处理下去",
  fallbackFreeplay: "先看看现场还有什么没被注意到",
  choiceLabelMax: 42,
  /** 写手调用。 */
  jsonOnly: "只输出 JSON。",
  leakRetry: (leaked: string) => `上一稿在可见文本里出现了当前章节禁止公开的内容「${leaked}」，请保持同一场戏重写，让知情角色回避、掩饰或只说部分真话，不得让该信息出现在 prose 或 handoff_snapshot。`,
  emptyProse: "正文没有生成",
  defaultHandoff: "场内的安排尚未收束。",
  /** 故事包。 */
  aliasRoleDaniel: "匿名DJ",
  aliasRoleWard: "白发修理工",
  chapterAct: (index: number, title: string) => `第${["一", "二", "三", "四", "五"][index] ?? index + 1}章 · ${title}`,
  /** 旧运行协议里描述“回合形状”的两条约束（新链路不带入）。 */
  droppedConstraint: /社交节拍|8至12条事件/,
  /** 逐轮接口。 */
  noVisibleEvents: "正文没有可显示的内容",
  finaleHandoff: (label: string, summary: string) => `你投出最后一票：${label}。${summary}`,
  forbiddenPrefixes: ["你", "你说", "玩家", "动作："],
};

const en: typeof zh = {
  playerLabel: PLAYER_LABEL,
  npcHabit: "Looks at the people and objects in the room before deciding whether to speak.",
  npcPurpose: "Deals with the real-world business that brought them back in front of you.",
  npcRoleSuffix: " / temporary visitor",
  npcCoreJoin: ". ",
  npcVisual: "Arrives carrying something that fits who they are and can be recognized at a glance.",
  npcPressure: "When challenged, stops what they are doing first, then brings the answer back to the practical matter at hand.",
  npcTactic: "Does not draw conclusions for you; uses what is happening right now to test whether the two of you can keep talking.",
  npcEntry: "Enters with one piece of real-world business that has to be handled on the spot, handles it, then faces the people in the room.",
  npcInteraction: "This person's arrival makes old names, who owns what, where people stand, and unfinished sentences concrete again; do not draw conclusions for anyone.",
  npcDefaultRelationship: "A visitor who already has a known connection to you",
  profileSplitter: /[;；]|\.\s+|\.$/,
  forbiddenWho: "The narrator and every character present (text visible to the player; not to be disclosed in the current chapter)",
  listJoin: "; ",
  pairJoin: " and ",
  playerProfilePrefix: " The player's self-declared identity for this session: ",
  fallbackDeepen: "Get this one thing straight first",
  fallbackMainline: (label: string) => `See this step through: ${label}`,
  fallbackMainlineGeneric: "Go along with what is already in motion and handle it",
  fallbackFreeplay: "Look around for what nobody has noticed yet",
  choiceLabelMax: 90,
  jsonOnly: "Output JSON only. All player-facing text must be in English.",
  leakRetry: (leaked: string) => `The previous draft exposed information that the current chapter forbids: "${leaked}". Rewrite the same scene so that the characters who know avoid it, cover for it, or tell only part of the truth. That information must not appear in prose or handoff_snapshot.`,
  emptyProse: "No prose was generated",
  defaultHandoff: "Nothing in the room has been settled yet.",
  aliasRoleDaniel: "the anonymous DJ",
  aliasRoleWard: "the white-haired mechanic",
  chapterAct: (index: number, title: string) => `Chapter ${index + 1} · ${title}`,
  droppedConstraint: /social beats|8 to 12 events|8–12 events/i,
  noVisibleEvents: "The prose contained nothing displayable",
  finaleHandoff: (label: string, summary: string) => `You cast the final vote: ${label}. ${summary}`,
  forbiddenPrefixes: ["You", "You say", "Player", "Action:"],
};

export const engineText = IS_EN ? en : zh;

/**
 * 追加在 P4a / P4b 末尾的输出语言指令（口径对齐 storyforge-chain-demo 的 route.ts）。
 * 2026-09-11 起 P4a / P4b 模板本体为英文（与英文站同一套 prompt），两个语言分支各追加一段：
 *   en —— English-only；zh —— 简体中文输出（与 en 段对称反写），保证中文站玩家可见文本仍为中文。
 */
export const routerLanguageAddendum = IS_EN
  ? `

[LANGUAGE REQUIREMENT]
Return every player-facing free-text field in idiomatic English only. Do not output Chinese or mixed-language labels.`
  : `

【语言要求】
所有玩家可见的自由文本字段一律用地道的简体中文输出，不得输出英文或中英混杂的标签。JSON 字段名与枚举值保持原样，不翻译。`;

export const writerLanguageAddendum = IS_EN
  ? `

【English-only output】
All player-facing generated fields—prose, handoff_snapshot, choice labels, state card label/title/summary/entries, game-state strings, character names, and narration—must be idiomatic English only. Do not output Chinese or mixed-language text, even if input history contains Chinese.
The prose length rule "450–600 words" is already in English units for this story. Keep the screenplay layout for dialogue: "Name: line", using the English character names exactly as given in on_stage_characters. Address the player as "you".`
  : `

【中文输出】
所有玩家可见的生成字段——prose、handoff_snapshot、选项文字、状态卡的 label/title/summary/entries、game_state 里的字符串、人物称呼与叙述——一律用地道的简体中文，不得输出英文或中英混杂的文字，即使提示词或输入里出现英文。JSON 字段名与枚举值（如 mode、kind、position、起/承/转/合）保持原样，不翻译。正文长度规则“450–600 words”在本故事对应 650–800 个汉字，其余以词数写的长度限制按同一比例理解为汉字数（anchor_text 为 8–20 字）。对白保留剧本式排版“人名：台词”，人名严格使用 on_stage_characters 给出的中文名；以“你”称呼玩家。`;

/**
 * 事件账本（赵艺琛 09-11）。运行层自己的两段文本，不改 wiki 里的 P4b 正文：
 *   ledgerDirective —— 追加在 P4b 模板（及语言指令）之后，告诉写手已发生的事不得重演、已离场者无新入场不得出现；
 *   ledgerExtractionPrompt —— 每轮正文放行后那次小调用的 system prompt，从正文抽已完成事实 / 离场 / 入场。
 * 文本与 storyforge（黑港）b0e4386 同源。
 */
export const ledgerDirective = IS_EN
  ? "\n\n[Scene ledger — runtime projection] turn_packet.turn_context.scene_ledger.events_happened lists things that already happened and were completed in earlier turns (object handovers, promises, orders, decisions, exits, entrances): never replay them or write them as if they had not happened yet; refer to them only as settled facts and move on from them. scene_ledger.exited_characters are people who have left and are not present now: unless on_stage_characters explicitly includes such a person and the prose writes a fresh entrance, give them no lines, actions or glances."
  : "\n\n【事件账本（运行层投影）】turn_packet.turn_context.scene_ledger.events_happened 是此前各轮已经真实发生并完成的事（物件转移、承诺、命令、决定、离场、入场）：不得重演、不得当作尚未发生再写一遍，只能作为已成立的前提被提及或顺着往下走。scene_ledger.exited_characters 是已经离开现场、此刻不在场的人：除非 on_stage_characters 明确含此人并且正文写出新的入场动作，否则不得出现其台词、动作或视线。";

export const ledgerExtractionPrompt = IS_EN
  ? "You are the runtime's event clerk; you write no prose. Read one passage of interactive fiction, the previous ledger and the on-stage list, and output valid JSON only: {\"events_happened\":[\"…\"],\"exited_characters\":[\"…\"],\"entered_characters\":[\"…\"]}. events_happened: 0–4 facts from this passage that are completed and change what follows (object handovers, promises, orders, decisions, exits, entrances), one sentence each, at most 15 words, using characters' real names, no emotions, no guesses, nothing already in the previous ledger; empty array if none. exited_characters: only real names of characters who clearly leave the scene in this passage. entered_characters: only real names of characters who clearly enter. Never record anything the passage does not contain."
  : "你是运行层的事件记录员，不写正文。读入一段互动小说正文、上一轮账本与在场名单，只输出合法 JSON：{\"events_happened\":[\"…\"],\"exited_characters\":[\"…\"],\"entered_characters\":[\"…\"]}。events_happened：0–4 条本段里已经完成、会改变后续局面的事实（物件转移、承诺、命令、决定、离场、入场），每条一句、不超过 30 字、用角色真名、不写情绪不写猜测、不重复上一轮账本已有的事；没有就给空数组。exited_characters：只写本段明确离开现场的角色真名。entered_characters：只写本段明确进入现场的角色真名。正文里没有的事一律不写。";
