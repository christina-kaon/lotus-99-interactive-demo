/**
 * 逐轮文风档（P4b 的 {{style_turn}}）。默认档 = 原 turnFilmGrammar / turnFilmGrammarEn（Lotus 的电影语法，逐字不动）；
 * 其余四档来自改名后的文风体系里最贴纽约雨夜悬疑的四个（Northbound 同名同质感），directive 按 Lotus 题材微调，
 * 张力档按 08-31 口径：只写贴近、体温、衣料、呼吸、停在临界的触碰，不写器官、不写过程、不用露骨词。
 * few_shots 留空：不搬别的 demo 的人物场景。
 */
import { IS_EN } from "../locale";
import { turnFilmGrammar, turnFilmGrammarEn } from "../workflow-prompts";
import { DEFAULT_STYLE_ID, STYLE_OPTIONS } from "../style-options";

export type StyleProfile = { id: string; name: string; directive: string; few_shots: string[] };

const zhDirectives: Record<string, string> = {
  hardboiled_feature: turnFilmGrammar,
  rain_lit_grain: "文体：雨光颗粒。用过日子的质感立住纽约雨夜：雨水、旧物件、隔夜咖啡、湿外套、锈迹、警局顶灯和压低的嗓音；线索先以东西的样子出现，再由人物的经历和习惯说出它意味着什么。艰难处境里保留小善意和玩笑，不让案情把人挤成职能；对白带着各自的出身和习惯，不用任务播报。人与人之间的暖意只走一格：湿大衣搭到肩上、分一杯热咖啡、扶一下发抖的肩；写暗示和余韵，不写器官、不写过程、不用露骨词。",
  spare_frames: "文体：留白线稿。克制、极简：不解释、不下判词，只给动作、物件、距离、声音和自然对白，段落轻，让人物从用词和选择里浮出来。悬疑靠省略推进：一句没说完的话、一件被挪过位置的东西、一个看了一眼就转开的人；谜底不替观众念出来，也不用旁白总结这一轮发生了什么。触碰只落一笔——肩、袖口、呼在冷玻璃上的一口气——到此为止，不写露骨内容。",
  slow_current: "文体：缓流。每个动作都要从人物的过往、认知边界和当下压力里长出来；平静的场景可以停在沉默和感官细节上，高压场景照样往前走，但不为奇观凭空造反转。案情像水位上涨：不靠一个爆点，而是几处细节同时开始说不通，让人物自己察觉。靠近来得慢：一只手留在另一只手旁边、同一片沉默里放缓的呼吸；停在临界，不写露骨内容。",
  quick_cut_pulse: "文体：快切脉搏。节奏快、极易读：短段落、清晰画面、即时反应、看得见的后果；冲突落在动作和对白里，追问、对峙、翻证物都用短句剪。每一轮至少让一个可核对的新事实进入案情，但不替玩家说话、不替玩家选择。热度只在一个切口里闪过——被攥住的手腕、隔着袖口摸到的脉搏——下一拍立刻落地，不停留成露骨内容。",
};

const enDirectives: Record<string, string> = {
  hardboiled_feature: turnFilmGrammarEn,
  rain_lit_grain: "Style: rain-lit grain. Plant the New York rain-night in lived-in texture: rain, old objects, day-old coffee, wet coats, rust, precinct ceiling lights and low voices; a clue arrives first as the look of a thing, then someone's experience and habits say what it means. Keep small kindnesses and jokes inside hard circumstances; never squeeze people into their job functions, and let dialogue carry each person's background and habits instead of mission briefings. Warmth passes one notch at a time—a wet coat over a shoulder, a shared cup, a hand steadying a shaking shoulder; suggestion and afterglow only, no anatomy, no act, no explicit words.",
  spare_frames: "Style: spare frames. Restrained, minimal: no explanation, no verdicts—only action, objects, distance, sound and natural dialogue; keep paragraphs light and let character surface through diction and choices. Suspense advances by omission: an unfinished sentence, an object that has been moved, someone who looks and looks away; never read the answer out for the audience, and never summarise the turn in narration. A touch is a single line—a shoulder, a sleeve, breath on cold glass—and stops there; nothing explicit.",
  slow_current: "Style: slow current. Every action must grow out of a character's history, the limits of what they know and the pressure of the moment; calm scenes may linger on silence and sensory detail, high-pressure scenes still move, but never invent a twist for spectacle. The case rises like water: not one big reveal, but several details that stop adding up at once, noticed by the characters themselves. Closeness arrives slowly—a hand left near another's, breath slowing in the same silence; stop at the threshold, nothing explicit.",
  quick_cut_pulse: "Style: quick-cut pulse. Fast, highly readable pacing: short paragraphs, clear images, immediate reactions, visible consequences; conflict lands in action and dialogue, and questioning, standoffs and evidence turned over are cut in short sentences. Every turn puts at least one checkable new fact into the case, but never speaks or chooses for the player. Heat flashes in a single cut—a caught wrist, a pulse felt through a cuff—then the next beat lands; never linger into anything explicit.",
};

const directives = IS_EN ? enDirectives : zhDirectives;

export const styleProfiles: Record<string, StyleProfile> = Object.fromEntries(
  STYLE_OPTIONS.map((option) => [option.id, { id: option.id, name: option.label, directive: directives[option.id], few_shots: [] as string[] }]),
);

for (const option of STYLE_OPTIONS) {
  if (!styleProfiles[option.id]?.directive) throw new Error(`style directive missing: ${option.id}`);
}

/** 请求体 style_id → 文风档；缺省 / 未知 id 走默认档（原 turnFilmGrammar），行为与引入下拉前一致。 */
export function styleProfile(styleId: unknown): StyleProfile {
  return typeof styleId === "string" && styleProfiles[styleId] ? styleProfiles[styleId] : styleProfiles[DEFAULT_STYLE_ID];
}
