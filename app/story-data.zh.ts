export type Person = "erin" | "harold" | "miller" | "maya" | "ward" | "daniel";
export type Message = { id: number; person?: Person; label?: string; text: string; kind?: "system" | "player" };
type StoryRelationship = { characters: Person[]; publicFact: string; directorNote?: string; revealFromChapter?: number };

// StoryPackage 的互动层：更换剧情卡时，只替换这份数据，不改场景编剧的通用规则。
export const storyInteraction = {
  player: {
    defaultPresence: "受邀留在现场的独立外部来访者；姓名、职业、性别和与案件的关系都由玩家自行决定。",
    canDo: ["观察、发问、表达立场、提供自己的线索、协助或拒绝协助", "影响人物之间的选择，但不替任何角色作决定"],
    cannotReplace: ["艾琳与米勒的办案功能", "哈罗德的警局决策功能", "玛雅作为失踪者亲自表达选择的功能", "沃德的 Lotus 修理与守门功能", "丹尼尔的 DJ、失踪者与梦境锚点功能"],
  },
  relationships: [
    { characters: ["erin", "miller"], publicFact: "共同办案的搭档。艾琳负责判断方向、追紧关键问题；米勒负责现场支援、街头直觉和拆气氛。两人可以拌嘴，但风险到来时站在同一边。" },
    { characters: ["erin", "harold"], publicFact: "上级与下属，也是长期互不服气的旧同事。哈罗德能压程序，艾琳能顶回来。" },
    { characters: ["miller", "harold"], publicFact: "局长与警官。米勒会顶嘴、会用笑话绕开压力，但不能越过哈罗德决定警局行动。" },
    { characters: ["erin", "daniel"], publicFact: "姐弟。丹尼尔三年前在 Lotus 99 失踪。", directorNote: "第一、二章不得揭示丹尼尔就是“零点”。", revealFromChapter: 3 },
    { characters: ["ward"], publicFact: "Lotus 99 的修理工和守门人。", directorNote: "他的真实动机要循章节逐步揭开。" },
    { characters: ["harold", "ward"], publicFact: "暂无公开交情。", directorNote: "哈罗德知道得比他说得多；第一章只能表现为他急于收束案件，不能解释原因。" },
    { characters: ["ward", "daniel"], publicFact: "暂无公开关系。", directorNote: "两人的完整关系是后续秘密，前两章不得直说。", revealFromChapter: 3 },
  ] satisfies StoryRelationship[],
};

export const cast: Record<Person, { name: string; role: string; image: string; bio: string }> = {
  erin: { name: "艾琳", role: "失踪案警探", image: "/characters/erin.png", bio: "冷静、敏锐、固执。弟弟丹尼尔三年前进入 Lotus 99 后失踪，她不接受用梦境交换现实。" },
  harold: { name: "哈罗德", role: "警局局长", image: "/characters/harold.png", bio: "老派、克制，习惯把案件压回秩序里。话不多，但开口常带刺、不给人留面子，懒得跟谁绕弯子，压人时一句话就能把对方钉在原地；他知道 Lotus 99 比自己承认的更多。" },
  miller: { name: "米勒", role: "艾琳的搭档警官", image: "/characters/miller.png", bio: "巴尔的摩长大，嘴快、脾气也快。拿不着调的玩笑和偶尔的粗口当护甲；看着不靠谱，偏偏最能记住街头和旧案里不该对上的细节。" },
  maya: { name: "玛雅", role: "失踪的夜生活博主", image: "/characters/maya.png", bio: "二十四岁的夜生活Vlog博主。好奇、敏锐，习惯隔着镜头观察别人。" },
  ward: { name: "沃德", role: "与 Lotus 99 有关的修理工", image: "/characters/ward.png", bio: "白发修理工，温和耐心，但从不一次把话说全；目前尚未进入现场。" },
  daniel: { name: "丹尼尔", role: "艾琳失踪的弟弟", image: "/characters/daniel.png", bio: "三年前进入 Lotus 99 后再未回到现实，目前行踪不明。" },
};

export const chapters = [
  { title: "失踪者", sub: "暴雨警局 · 02:59", scene: "雨夜的第七分局。局长在压案，艾琳不肯退；她的搭档米勒嘴上插科打诨，眼睛却盯住了一个谁都不愿碰的细节。", goal: "先弄清警局为什么急着压下玛雅的案子，再决定要不要打开她留下的 Vlog。", bg: "bg-station" },
  { title: "Lotus 99", sub: "码头区 · 02:49", scene: "你们已经在旧码头维修棚找到监控里的白发老人，交涉刚刚开始。那具黑色机甲还躺在他手边；刚才的监控里，他身后的门曾经打开。现在先问他见没见过玛雅，再问那扇门在哪里、通向哪里。", goal: "围绕维修棚监控继续询问老人：他是否见过玛雅，那扇打开过的门在哪里、通向什么地方。", bg: "bg-lotus" },
  { title: "另一座纽约", sub: "Cosplay Night · 03:00", scene: "乔装计划居然奏效了。你们穿着一套很难维持警察尊严的Cosplay服装走进真正的Lotus 99；先别急着找零点，这里每个看似玩笑的造型都可能是某个人最不肯放下的愿望。", goal: "在俱乐部的情感奇观中找到玛雅，听沃德说明这里的规则，再让艾琳亲自质问一直躲着她的零点。", bg: "bg-dream" },
  { title: "零点", sub: "核心控制区 · 03:05", scene: "姐弟已经相认。丹尼尔把众人带回核心控制区，哈罗德也赶到了。没人再争论零点是谁；现在要说清的是，丹尼尔为什么留下，以及哈罗德究竟隐瞒了多久。", goal: "听清丹尼尔主动留下的理由，逼哈罗德解释长期默许，并判断每个人真正想保护的是什么。", bg: "bg-zero" },
  { title: "凌晨三点", sub: "Lotus 99 · 最后一票", scene: "沃德的论文已经打开，但屋里还没有人投票。艾琳要求所有人先把话说完：她会讲丹尼尔小时候的事，也要哈罗德和米勒当面说清，他们各自准备牺牲谁。", goal: "听完艾琳的童年回忆与两方辩论；等哈罗德和米勒真正形成一比一，最后一票才会交到你手里。", bg: "bg-final" },
];

export const chapterMessages: Message[][] = [
  [
    { id: 1, kind: "system", text: "凌晨两点五十九分，米勒半跪在档案室那台旧显示器下面，一手托着松动的背板，一手拿螺丝刀去碰已经发黑的接口。市里三年前答应更换这批机器，后来预算先去了街面监控，再后来连解释也省了。走廊里有人关打印机，有人提前穿上外套；纽约正在把夜班工人送进地铁，把喝醉的人送进急诊，也把没人及时发现的失踪者送进明早的待办列表。" },
    { id: 2, person: "miller", text: "我只问一次：这玩意要是把保险丝烧了，算技术事故，还是算我终于替全局争取到一个带薪停电？" },
    { id: 3, person: "erin", text: "先把红线接回去。你要真想改善劳动条件，可以从学会关掉焊笔开始。" },
    { id: 4, person: "harold", text: "别鼓励他。上回他改善劳动条件，证物室少了一把椅子，多了一台咖啡机。咖啡机还是坏的。" },
    { id: 5, kind: "system", text: "米勒从桌子底下探出头，想替那台咖啡机辩护，看见艾琳一直按着播放器的电源线，又把话咽了回去。他把最后一颗螺丝拧紧，屏幕先亮出一道绿线，随后勉强恢复画面。哈罗德站在窗边，手套已经拿在手里，却没有戴上；艾琳等屏幕稳定，才把播放器转到桌子中央。画面里的玛雅站在 Lotus 99 门外，红色录制灯一下一下闪。房间里的玩笑没有消失，只是忽然都知道该给谁让路。" },
  ],
  [
    { id: 20, kind: "system", text: "Lotus 99 的门在午夜后才出现。空气里有机油、雨水和甜得发苦的雾。" },
    { id: 21, person: "ward", text: "进来的人，通常都知道自己在找什么。你们呢？" },
    { id: 22, person: "erin", text: "玛雅。还有一扇门。" },
  ],
  [
    { id: 30, kind: "system", text: "乔装计划居然奏效了。门卫甚至没有多看一眼，仿佛三个穿着成套Cosplay服装、还努力装作互不认识的人，正是Lotus 99最普通的客人。" },
    { id: 31, person: "miller", text: "提醒我一下，我们现在是在潜伏，还是在替错误的人生决定拍宣传照？" },
    { id: 32, person: "erin", text: "都闭嘴。先找玛雅。还有，别踩到彼此的尾巴。" },
  ],
  [
    { id: 40, person: "daniel", text: "姐，别站那么近。三点之后，我不保证自己还是我。" },
    { id: 41, person: "erin", text: "丹尼尔。把面罩摘了。" },
  ],
  [
    { id: 50, kind: "system", text: "城市上空落下银色细雨。每一块屏幕都在倒数。" },
    { id: 51, person: "ward", text: "我没有强迫任何人留下。我只把门打开。" },
    { id: 52, person: "harold", text: "门一旦永久打开，现实就没有选择了。" },
  ],
];

export const vlogReactionMessages: Message[] = [
  { id: 11, kind: "system", text: "片尾黑了。播放器的风扇还在转，屏幕上只剩一层雪花。档案室里没人先动：艾琳站在桌边，哈罗德看着窗外，米勒把冷咖啡放到旧卷宗旁。杯底渗出一圈水，正慢慢往纸页里走。" },
  { id: 12, person: "harold", text: "这东西，谁给你的？" },
  { id: 13, person: "erin", text: "下午进了我的旧案邮箱。没有正文，只有原片和一次性地址。地址现在已经失效了。" },
  { id: 14, person: "miller", text: "要是恶搞，他们比我们这栋楼有预算。那两套玩偶服都比我的防弹背心新。" },
  { id: 15, kind: "system", text: "哈罗德走到显示器前，没有碰键盘，只把后巷那两秒重看了一遍，停在玩偶服转身的地方。外间饮水机抽了一下水，随即安静。" },
  { id: 16, person: "harold", text: "原文件留下。明早送鉴证，今晚谁也别顺着一段视频跑出去。" },
  { id: 17, person: "erin", text: "玛雅失踪不到六小时。等鉴证上班，她可能已经不在原来的地方了。" },
  { id: 18, kind: "system", text: "米勒把纸杯挪开，免得它继续泡坏卷宗。他先看艾琳，再看哈罗德。没人离开；档案室的门半开着，走廊尽头的电子钟还在往三点走。" },
];

// ---- 以下三组原先内联在 app/page.tsx 里，为了按语言分叉搬到这里；文案逐字不变。 ----

/** 每章入场时的两条起手选项（索引 = 章节下标）。 */
export const chapterArrivalChoices: Record<number, Array<{ kind: "action" | "speech"; text: string }>> = {
  1: [
    { kind: "action", text: "给他看门打开的那一帧" },
    { kind: "speech", text: "先问他见没见过玛雅" },
  ],
  2: [
    { kind: "action", text: "先跟着最奇怪的巡逻者走" },
    { kind: "action", text: "不看热闹，先找玛雅" },
  ],
  3: [
    { kind: "speech", text: "先问丹尼尔为什么留下" },
    { kind: "action", text: "先看看这里复制了哪些记忆" },
  ],
  4: [
    { kind: "speech", text: "先听哈罗德把理由说完" },
    { kind: "speech", text: "先让米勒说他想保住谁" },
  ],
};

/** 开场档案页（Vlog 门之前的两页世界档案）。 */
export type OpeningArchivePage = { eyebrow: string; title: string; code: string; rows: Array<{ label: string; text: string }> };

export const openingArchivePages: OpeningArchivePage[] = [
  {
    eyebrow: "一、时代背景档案",
    title: "静默纽约",
    code: "NYC–2147–NIGHT",
    rows: [
      { label: "时间范围", text: "2147 年，后赛博城市重建期。旧城区完成过三次基础设施改造，但大量公共系统仍靠上个世纪留下的设备勉强运转。" },
      { label: "地点", text: "北美东岸联邦区 · 纽约。故事从第七分局辖区开始，向南连接 Red Hook 旧码头、夜间娱乐场所和长期闲置的仓储带。" },
      { label: "社会环境评估", text: "城市拥有更聪明的监控、更快的交通和更昂贵的身体改造，却没有因此变得更体面。住房紧张，夜间经济膨胀，失踪人口被系统迅速归入待处理队列。科技负责留下记录，人仍然负责决定哪些记录值得被看见。" },
    ],
  },
  {
    eyebrow: "二、机构档案",
    title: "纽约第七分局",
    code: "NYPD–07–GRAVEYARD",
    rows: [
      { label: "机构性质", text: "纽约市警察局基层综合分局。负责辖区巡逻、失踪人口受理、初步取证、旧案归档与夜间突发事件处置。" },
      { label: "辖区与资源", text: "辖区横跨老住宅区、货运通道和码头娱乐带。夜班人手长期不足，鉴证与技术部门在凌晨只保留值守席位，基层警员经常同时处理数个互不相干的麻烦。" },
      { label: "内部生态评估", text: "局长哈罗德擅长控制风险，也习惯控制知情范围；艾琳负责最难收尾的失踪案；米勒承担外勤与现场支援，并用不合时宜的笑话证明自己还没被夜班彻底弄坏。这里的人并不总相信彼此，但通常知道谁会在事情失控时留下。" },
    ],
  },
];

export type CostumeEntryMessage = { id: string; person?: Person; kind?: "system"; eventType: "narration" | "dialogue"; text: string };

/** 第三章换装入场的开场三句（按所选服装）。stamp 用于拼消息 id。 */
export function costumeEntryMessages(stamp: number): Record<string, CostumeEntryMessage[]> {
  return {
    dobby: [
      { id: `dobby-entry-${stamp}-1`, kind: "system", eventType: "narration", text: "三个人穿着尺寸各不相同的多比服装混进后巷。粗布吸了雨，耳朵比调查组先通过门框。门口的人只扫了一眼就放行——在 Lotus 99，打扮得太正常反而更可疑。" },
      { id: `dobby-entry-${stamp}-2`, person: "miller", eventType: "dialogue", text: "先说清楚，谁敢拍照，我就把谁写进案情报告。标题叫《尊严失踪案》。" },
      { id: `dobby-entry-${stamp}-3`, person: "erin", eventType: "dialogue", text: "耳朵收好。我们是来找人，不是来卡门的。" },
    ],
    guardians: [
      { id: `guardians-entry-${stamp}-1`, kind: "system", eventType: "narration", text: "银河护卫队主题服装比计划亮了三个色号。树人外壳差点挂住消防梯，浣熊尾巴扫过门卫的杯子；对方却像每天都见这种灾难，抬手放他们进去。" },
      { id: `guardians-entry-${stamp}-2`, person: "miller", eventType: "dialogue", text: "这不叫潜伏。这叫提前通知整条街：三个成年人放弃了判断。" },
      { id: `guardians-entry-${stamp}-3`, person: "erin", eventType: "dialogue", text: "你选的浣熊。少抱怨，尾巴别碰证物。" },
    ],
  };
}
