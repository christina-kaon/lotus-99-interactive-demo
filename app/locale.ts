/**
 * 语言开关。构建时由 NEXT_PUBLIC_STORY_LANG 决定（Next 会把 NEXT_PUBLIC_* 内联进客户端与服务端代码）：
 *   未设置 / 其他值 → zh（中文版，行为与引入开关前完全一致）
 *   "en"            → en（独立英文部署）
 * 所有按语言分叉的数据模块（story-data / workflow-source / workflow-precompiled / lotus-media / ui-text）都只读这里。
 */
export type StoryLang = "zh" | "en";

export const STORY_LANG: StoryLang = process.env.NEXT_PUBLIC_STORY_LANG === "en" ? "en" : "zh";
export const IS_EN = STORY_LANG === "en";

/** 关系对里代表玩家的名字（关系卡 pair / 知识边界 / 场景摘录里的说话人标签都用它）。 */
export const PLAYER_LABEL = IS_EN ? "You" : "你";

/** 「人名：台词」的分隔符（场景摘录回灌给模型时用）。 */
export const SPEAKER_SEPARATOR = IS_EN ? ": " : "：";
