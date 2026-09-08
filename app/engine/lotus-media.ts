/**
 * Lotus 99 的剧情内媒体触发（图片 / 音频）。URL、alt、caption 与正文匹配正则沿用旧 chat/route.ts 的定义；
 * 旧链路按“material 是否已使用”门控，新链路没有 material 账本，改为按“锚点（segment）是否激活/正在进行”门控，
 * 每次游玩只触发一次（played_media_ids 记在 token 里）。
 */
import type { Person } from "../story-data";
import type { FrontendEvent } from "./adapter";

type CueDefinition = {
  id: string;
  kind: "image" | "audio";
  url: string;
  alt?: string;
  caption?: string;
  /** 锚点刚被激活的那一轮触发（不要求正文匹配，匹配只决定挂在哪条事件上）。 */
  on_activate?: string;
  /** 锚点正在进行时，正文出现匹配才触发。 */
  while_active?: string;
  anchor: RegExp | ((events: FrontendEvent[]) => number);
  /** 触发后视为该角色真身已在正文里揭开。 */
  reveals?: Person;
};

const childhoodSong = (events: FrontendEvent[]) => events.findIndex((event, index, all) => {
  const nearby = all.slice(index, index + 3).map((entry) => entry.text).join(" ");
  return /(旧音响|壁挂音响|扬声器|琴声|歌曲|旋律|电流爆音|合成琴)/.test(event.text)
    && /(艾琳|她)/.test(nearby)
    && /(听见|听到|认出|僵住|僵在|手电|弟弟)/.test(nearby);
});

export const lotusMediaCues: CueDefinition[] = [
  {
    id: "ch01-drive-to-red-hook",
    kind: "image",
    url: "/ch01-drive-to-red-hook.png",
    alt: "艾琳和米勒离开警局，驱车前往旧码头",
    caption: "离开第七分局 · 前往旧码头",
    on_activate: "ch01_s03",
    anchor: /(离开|走出|出了|从).{0,8}(警局|第七分局).{0,10}(出发|上车|开车|前往)|(?:警局|第七分局).{0,8}(门外|台阶|停车场).{0,10}(出发|上车|开车)|(旧码头|Red Hook|第99号仓库)/,
  },
  {
    id: "ch01-red-hook-camera-search",
    kind: "image",
    url: "/ch02-red-hook-arrival.png",
    alt: "众人抵达旧码头，在沿街商铺调查后巷监控",
    caption: "旧码头 · 调查周边监控",
    // 这一段（ch01_s04）本身就是“找到临街商铺调后巷监控”，所以锚点一激活就出图；正文匹配只决定挂在哪条事件上。
    on_activate: "ch01_s04",
    while_active: "ch01_s04",
    anchor: /(旧码头|Red Hook|第99号仓库|99号|街口|商铺|杂货铺|五金店|店员).{0,20}(监控|摄像头|录像|探头)|(?:监控|摄像头|录像|探头).{0,20}(旧码头|街口|商铺|后巷|杂货铺)/,
  },
  {
    id: "ch01-unknown-mechanic-monitor",
    kind: "image",
    url: "/ch01-unknown-mechanic-monitor.png",
    alt: "监控拍到身份不明的白发老人推着工具车穿过雨夜后巷",
    caption: "第一章 · 后巷监控画面",
    while_active: "ch01_s04",
    anchor: /(监控|录像|画面|探头|归档|屏幕).{0,30}(白发|老人|修理工)|(?:白发|老人|修理工).{0,30}(监控|录像|画面|探头|归档|屏幕)/,
  },
  {
    id: "ch02-childhood-song",
    kind: "audio",
    url: "/childhood-country-americana-approach.mp3",
    while_active: "ch02_s03",
    anchor: childhoodSong,
  },
  {
    id: "ch03-maya-found",
    kind: "image",
    url: "/ch03-maya-found.png",
    alt: "众人在 Lotus 99 找到仍然活着的玛雅",
    caption: "Lotus 99 · 找到玛雅",
    while_active: "ch03_s02",
    anchor: /(玛雅|后台|活着|本人)/,
  },
  {
    id: "ch03-zero-unmasked",
    kind: "image",
    url: "/ch03-zero-unmasked.png",
    alt: "零点摘下面罩，艾琳认出弟弟丹尼尔",
    caption: "Lotus 99 · 零点摘下面罩",
    while_active: "ch03_s03",
    // 摘面罩是 ch03_s03 的核心节拍；除动作句外，也认“认出/看清……弟弟/丹尼尔/脸”这类写法，避免措辞不同就整局丢图。
    anchor: /(摘|揭|取|拿|扯|掀)[^。]{0,8}面罩|面罩[^。]{0,10}(摘|揭|取|拿|扯|落|掀|掉)|(露出|看清|认出|盯着)[^。]{0,12}(脸|面孔|弟弟|丹尼尔)/,
    reveals: "daniel",
  },
];

export type MediaCue = { id: string; kind: "image" | "audio"; url: string; alt?: string; caption?: string; eventIndex: number };

export function resolveMediaCues(events: FrontendEvent[], activeAnchorId: string | null, activatedAnchorId: string | null, played: string[]) {
  const cues: MediaCue[] = [];
  const reveals: Person[] = [];
  for (const definition of lotusMediaCues) {
    if (played.includes(definition.id) || !events.length) continue;
    const matchIndex = typeof definition.anchor === "function"
      ? definition.anchor(events)
      : events.findIndex((event) => (definition.anchor as RegExp).test(event.text));
    const activated = definition.on_activate && activatedAnchorId === definition.on_activate;
    const active = definition.while_active && activeAnchorId === definition.while_active && matchIndex >= 0;
    if (!activated && !active) continue;
    cues.push({
      id: definition.id,
      kind: definition.kind,
      url: definition.url,
      ...(definition.alt ? { alt: definition.alt } : {}),
      ...(definition.caption ? { caption: definition.caption } : {}),
      eventIndex: matchIndex >= 0 ? matchIndex : Math.max(0, events.length - 1),
    });
    if (definition.reveals) reveals.push(definition.reveals);
  }
  return { cues, reveals };
}
