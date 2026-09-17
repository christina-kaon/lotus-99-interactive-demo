/** 查案设定的语言入口（zh / en 两份形状相同，见 case-rules.zh.ts / case-rules.en.ts）。 */
import { IS_EN } from "./locale";
import { caseRules as en } from "./case-rules.en";
import { caseRules as zh } from "./case-rules.zh";

export const caseRules: typeof zh = IS_EN ? en : zh;
