/**
 * 文风下拉的选项表（前端 + 后端共用；只含名字，不含 directive，客户端可安全引入）。
 * 命名与黑港 / Northbound 同一套改名后的体系（2026-09-11「文风改名对应表」）：只描述质感（节奏 / 镜头 / 温度），
 * 不带人名、预设名、站名。id 即请求体 style_id。
 */
import { IS_EN } from "./locale";

export type StyleOption = { id: string; label: string; note: string };

export const DEFAULT_STYLE_ID = "hardboiled_feature";

const zh: StyleOption[] = [
  { id: "hardboiled_feature", label: "冷硬正片", note: "默认 · 电影语法、群像拍、一个硬比喻" },
  { id: "rain_lit_grain", label: "雨光颗粒", note: "雨、旧物、低嗓音" },
  { id: "spare_frames", label: "留白线稿", note: "极简，只给动作与物件" },
  { id: "slow_current", label: "缓流", note: "慢推进，细节同时失衡" },
  { id: "quick_cut_pulse", label: "快切脉搏", note: "短段快剪，即时后果" },
];

const en: StyleOption[] = [
  { id: "hardboiled_feature", label: "Hard-Boiled Feature", note: "default · film grammar, ensemble beats, one hard simile" },
  { id: "rain_lit_grain", label: "Rain-Lit Grain", note: "rain, old objects, low voices" },
  { id: "spare_frames", label: "Spare Frames", note: "minimal: action and objects only" },
  { id: "slow_current", label: "Slow Current", note: "slow build; details stop adding up" },
  { id: "quick_cut_pulse", label: "Quick-Cut Pulse", note: "short cuts, immediate consequences" },
];

export const STYLE_OPTIONS: StyleOption[] = IS_EN ? en : zh;

export function isStyleId(value: unknown): value is string {
  return typeof value === "string" && STYLE_OPTIONS.some((option) => option.id === value);
}
