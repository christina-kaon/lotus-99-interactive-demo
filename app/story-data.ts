/**
 * 互动层数据的语言入口：按 NEXT_PUBLIC_STORY_LANG 选中文版（story-data.zh）或英文版（story-data.en）。
 * 两份文件形状相同；类型从中文版导出，英文版以 `typeof` 对齐。
 */
import { IS_EN } from "./locale";
import * as en from "./story-data.en";
import * as zh from "./story-data.zh";

export type { Message, Person } from "./story-data.zh";

const data: typeof zh = IS_EN ? en : zh;

export const storyInteraction = data.storyInteraction;
export const cast = data.cast;
export const chapters = data.chapters;
export const chapterMessages = data.chapterMessages;
export const vlogReactionMessages = data.vlogReactionMessages;
export const chapterArrivalChoices = data.chapterArrivalChoices;
export const openingArchivePages = data.openingArchivePages;
export const costumeEntryMessages = data.costumeEntryMessages;
export type { CostumeEntryMessage } from "./story-data.zh";
