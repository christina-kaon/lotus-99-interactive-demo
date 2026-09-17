/** 剧情卡的语言入口（zh / en 两份形状相同，见 workflow-source.zh.ts / workflow-source.en.ts）。 */
import { IS_EN } from "./locale";
import { workflowSource as en } from "./workflow-source.en";
import { workflowSource as zh } from "./workflow-source.zh";

export const workflowSource: typeof zh = IS_EN ? en : zh;
