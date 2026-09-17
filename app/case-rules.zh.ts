/**
 * 查案设定（赵艺琛 09-17，借酒馆卡的结构不借文本）：中文数据。
 *   setting_rules        —— 条目化世界规则（RuleEntry：id / content / keys / constant），追加在既有字符串规则之后
 *   investigation_stages —— 查案四阶段 → 既有锚点的映射（阶段 requires 前一阶段）
 *   anchor_annotations   —— 每个锚点补 keys / requires（只写真前置）/ investigation_stage
 *   testimonies          —— 初始证词簿（三态：未知 / 已证 / 已推翻；翻转只由证物引起）
 *   evidence_turns       —— 哪件证物让哪个 NPC 改口（覆盖全部 clue 证物）
 *   settlement_conditions—— 每章成功 / 失败 / 超时三条（超时用轮数，与 chapterTurnLimits 同源）
 *   knowledge_boundaries —— 认知隔离常驻底座
 *   awareness            —— 「查得越猛凶手越早销毁证物」的数值规则
 * 这些文本对玩家可见（证词簿卡）或进 P4b 输入，所以揭示前只用别名（白发修理工），不出现门槛后的专名。
 */
import type { CaseRules } from "./engine/story-pack";

export const caseRules: CaseRules = {
  setting_rules: [
    { id: "rule.case_pace", content: "每回合只放出一条新线索，或只让一位证人开口；其余线索与证人留到下一回合。", keys: ["线索", "证人", "监控", "卷宗", "证词"], constant: true },
    { id: "rule.stage_gate", content: "查案按现场探察、证据搜集、嫌疑人讯问、推理判定四步走；上一步没有落地，下一步的人不会开口。", keys: ["现场", "证据", "讯问", "推理"], constant: true },
    { id: "rule.testimony_states", content: "每条证词只有三种状态：未知(?)、已证(√)、已推翻(×)；翻转只由证物引起，不由情绪或口才引起。", keys: ["证词", "证词簿", "推翻", "口供"] },
    { id: "rule.two_sources", content: "一条证物只能让证人动摇、改措辞；手里有两条互相印证的可信来源，证人才会真正改口。", keys: ["证物", "改口", "监控", "私信", "录像"] },
    { id: "rule.awareness_meter", content: "藏事的人有一条警觉值：拿到确凿证据 +20，强闯、翻查、当面对质 +2 到 4，每回合自然回落 1。", keys: ["强闯", "翻查", "对质", "警觉", "证据"] },
    { id: "rule.awareness_destroy", content: "警觉值到 40，藏事的人会先处理掉一件原始证物，现场只剩翻拍、复印或口述。", keys: ["原始", "录像", "监控", "销毁", "覆盖"] },
  ],
  investigation_stages: [
    { id: "scene_survey", label: "现场探察", anchor_ids: ["ch01_s01", "ch01_s02", "ch01_s03", "ch01_s04"] },
    { id: "evidence_gathering", label: "证据搜集", anchor_ids: ["ch02_s01", "ch02_s02", "ch02_s03"], requires: "scene_survey" },
    { id: "suspect_interrogation", label: "嫌疑人讯问", anchor_ids: ["ch03_s01", "ch03_s02", "ch03_s03", "ch04_s01", "ch04_s02"], requires: "evidence_gathering" },
    { id: "deduction", label: "推理判定", anchor_ids: ["ch05_s01", "ch05_s02"], requires: "suspect_interrogation" },
  ],
  anchor_annotations: {
    ch01_s01: { keys: ["Vlog", "原片", "邮箱", "档案室", "室友"], investigation_stage: "scene_survey" },
    ch01_s02: { keys: ["交通记录", "轮渡", "监控", "Red Hook", "第99号仓库"], requires: ["ch01_s01"], investigation_stage: "scene_survey" },
    ch01_s03: { keys: ["修车铺", "铁门", "砖墙", "门牌", "后巷"], requires: ["ch01_s02"], investigation_stage: "scene_survey" },
    ch01_s04: { keys: ["监控", "白发老人", "黑色机甲", "维修棚", "店员"], requires: ["ch01_s03"], investigation_stage: "scene_survey" },
    ch02_s01: { keys: ["维修棚", "卷帘门", "机甲", "白发修理工", "侧门"], requires: ["ch01_s04"], investigation_stage: "evidence_gathering" },
    ch02_s02: { keys: ["空置外场", "吧台", "舞池", "灰尘", "后台"], requires: ["ch02_s01"], investigation_stage: "evidence_gathering" },
    ch02_s03: { keys: ["隔板", "螺丝", "旧音响", "吉他", "面罩", "Cosplay"], requires: ["ch02_s02"], investigation_stage: "evidence_gathering" },
    ch03_s01: { keys: ["Cosplay", "多比", "银河护卫队", "门卫", "舞池"], requires: ["ch02_s03"], investigation_stage: "suspect_interrogation" },
    ch03_s02: { keys: ["后台", "玛雅", "镜头", "白发修理工", "假入口"], requires: ["ch03_s01"], investigation_stage: "suspect_interrogation" },
    ch03_s03: { keys: ["零点", "面罩", "DJ台", "凌晨三点", "规则"], requires: ["ch03_s02"], investigation_stage: "suspect_interrogation" },
    ch04_s01: { keys: ["童年住宅", "夏天", "丹尼尔", "吉他", "留下"], requires: ["ch03_s03"], investigation_stage: "suspect_interrogation" },
    ch04_s02: { keys: ["核心控制区", "哈罗德", "信封", "旧设备", "犯罪率"], requires: ["ch04_s01"], investigation_stage: "suspect_interrogation" },
    ch05_s01: { keys: ["论文", "控制台", "停电", "黑猫", "投票"], requires: ["ch04_s02"], investigation_stage: "deduction" },
    ch05_s02: { keys: ["最后一票", "摧毁", "保留", "入口"], requires: ["ch05_s01"], investigation_stage: "deduction" },
  },
  testimonies: [
    { id: "t_harold_first_time", witness: "哈罗德", claim: "这个地址我也是今晚第一次听说。", refuted_by: "fact_harold_complicity" },
    { id: "t_mechanic_never_saw_maya", witness: "白发修理工", claim: "这里只是维修棚，玛雅没来过。", refuted_by: "fact_true_lotus_entry" },
    { id: "t_mechanic_nothing_behind", witness: "白发修理工", claim: "卷帘门后面没有别的入口。", refuted_by: "fact_false_lotus_entry" },
    { id: "t_roommate_ferry", witness: "玛雅的室友", claim: "最后一通电话里听见了轮渡汽笛。", confirmed_by: "fact_maya_route" },
    { id: "t_father_normal", witness: "玛雅的父亲", claim: "她失踪前一直照常报平安，没说要去哪。", confirmed_by: "fact_maya_profile" },
    { id: "t_erin_captive", witness: "艾琳", claim: "丹尼尔是被困住的，他不会自己消失。", refuted_by: "fact_daniel_chose_dream" },
  ],
  evidence_turns: [
    { evidence_fact_id: "fact_maya_vlog", witness: "哈罗德", from_claim: "一段来路不明的视频，不值得今晚为它动人。", to_claim: "原片另存、不准覆盖；它是一份要保全的证据。" },
    { evidence_fact_id: "fact_maya_profile", witness: "米勒", from_claim: "她就是个找刺激的博主。", to_claim: "她每天给父亲和室友报平安，不是会随手断联的人。", testimony_id: "t_father_normal" },
    { evidence_fact_id: "fact_maya_motive", witness: "哈罗德", from_claim: "来源不明，今晚先暂停。", to_claim: "批准继续核对她的现实路线。" },
    { evidence_fact_id: "fact_maya_route", witness: "玛雅的室友", from_claim: "她只说去码头拍夜景。", to_claim: "电话里有轮渡汽笛，她进了第99号仓库背街就没出来。", testimony_id: "t_roommate_ferry" },
    { evidence_fact_id: "fact_lotus_surface_schedule", witness: "哈罗德", from_claim: "那地址就是间修车铺。", to_claim: "两点四十九分以后那里有另一种营业，值得派一次同行核查。" },
    { evidence_fact_id: "fact_lotus_no_entry", witness: "艾琳", from_claim: "按 Vlog 的角度，铁门就在这面墙上。", to_claim: "入口不在墙上，只能靠后巷的商铺摄像头。" },
    { evidence_fact_id: "fact_unknown_mechanic_trace", witness: "米勒", from_claim: "这片街口深夜没人。", to_claim: "有个白发老人带着工具往维修棚跑，维修棚开到三点。" },
    { evidence_fact_id: "fact_false_lotus_entry", witness: "白发修理工", from_claim: "卷帘门后面没有别的入口。", to_claim: "承认那处空场是他指的路，只不解释为什么。", requires_two_sources: true, second_source_fact_id: "fact_unknown_mechanic_trace", testimony_id: "t_mechanic_nothing_behind" },
    { evidence_fact_id: "fact_zero_childhood_song", witness: "米勒", from_claim: "艾琳听见的只是一段旧录音。", to_claim: "这首歌不可能是巧合；今晚到此为止，换装再来。" },
    { evidence_fact_id: "fact_true_lotus_entry", witness: "白发修理工", from_claim: "玛雅没来过这里。", to_claim: "承认自己的名字，承认玛雅就在里面。", requires_two_sources: true, second_source_fact_id: "fact_false_lotus_entry", testimony_id: "t_mechanic_never_saw_maya" },
    { evidence_fact_id: "fact_ward_paper", witness: "哈罗德", from_claim: "默许是为了辖区安全。", to_claim: "论文写明门外的人会失去拒绝的权利；他投票摧毁。", requires_two_sources: true, second_source_fact_id: "fact_harold_complicity" },
  ],
  settlement_conditions: {
    ch01: { success: "白发修理工进入监控画面，且众人决定去维修棚找他。", failure: "哈罗德把三人全部留在警局拖过三点，或原片被覆盖、丢失。", timeout: "本章第 20 轮仍未看到监控里的白发老人。", timeout_turns: 20 },
    ch02: { success: "米勒叫停今晚行动，乔装计划被采纳。", failure: "艾琳独自追进 DJ 通道消失，或众人在空壳里一无所获就撤回警局。", timeout: "本章第 20 轮仍未听到旧音响里的童年歌曲。", timeout_turns: 20 },
    ch03: { success: "零点在艾琳面前摘下面罩。", failure: "众人被识破乔装赶出俱乐部，或玛雅拒绝再与任何人交谈。", timeout: "本章第 20 轮仍未在后台找到玛雅。", timeout_turns: 20 },
    ch04: { success: "哈罗德当面承认长期默许，且封存信封被取出。", failure: "艾琳答应留在梦境，或众人在争吵中散开、没人再提信封。", timeout: "本章第 15 轮仍未取出旧设备后的信封。", timeout_turns: 15 },
    ch05: { success: "哈罗德与米勒各投一票形成一比一，最后一票交到玩家手里。", failure: "有人在表决前离开入口，或艾琳拒绝让任何人投票。", timeout: "本章第 10 轮仍未形成一比一僵局。", timeout_turns: 10 },
  },
  knowledge_boundaries: [
    { id: "kb.all.spoken_only", who: "所有角色", does_not_know: "玩家没有说出口的念头、打算、来历与身份；发生在另一处场景里的对话，不在场的人听不到，也不会凭空知道。", keys: ["说出口", "听见", "不在场", "另一处"], constant: true },
  ],
  awareness: {
    threshold: 40,
    evidence_gain: 20,
    search_gain: 4,
    action_gain: 3,
    decay: 1,
    destroyed_evidence: { fact_id: "fact_unknown_mechanic_trace", label: "商铺后巷监控的原始录像", consequence: "商铺后巷监控的原始录像已被覆盖，只剩众人手机里的翻拍；再要调取只能靠口述与翻拍。" },
  },
};
