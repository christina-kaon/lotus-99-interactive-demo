/** 预编译包的语言入口：中文版读 workflow-source.zh，英文版读 workflow-source.en（各自文件内已固定引用）。 */
import { IS_EN } from "./locale";
import { createPrecompiledWorkflow as en } from "./workflow-precompiled.en";
import { createPrecompiledWorkflow as zh } from "./workflow-precompiled.zh";

export const createPrecompiledWorkflow: typeof zh = IS_EN ? en : zh;
