/**
 * 前端每轮按这份契约校验：事件条数落在 [min,max]、选项恰好 count 个。
 * 旧链路是 8–12 条事件；新链路 P4b 写 650–800 字正文再切成事件，条数不固定，所以把区间放宽。
 */
import { engineText } from "../../engine/i18n";

export const responseContract = {
  event_count: { min: 1, max: 60 },
  choices: {
    count: 2,
    allowed_kinds: ["action", "speech"],
    forbidden_prefixes: engineText.forbiddenPrefixes,
  },
} as const;
