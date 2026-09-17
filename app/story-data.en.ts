export type Person = "erin" | "harold" | "miller" | "maya" | "ward" | "daniel";
export type Message = { id: number; person?: Person; label?: string; text: string; kind?: "system" | "player" };
type StoryRelationship = { characters: Person[]; publicFact: string; directorNote?: string; revealFromChapter?: number };

// StoryPackage 的互动层：更换剧情卡时，只替换这份数据，不改场景编剧的通用规则。
export const storyInteraction = {
  player: {
    defaultPresence: "An independent outside visitor invited to stay on scene; name, occupation, gender, and connection to the case are all up to the player.",
    canDo: ["Observe, ask questions, take a stand, offer your own leads, help or refuse to help", "Influences the choices characters make, but never decides for any of them"],
    cannotReplace: ["Erin and Miller's investigative function", "Harold's precinct decision-making function", "Maya's function as the missing person speaking for herself", "Ward's Lotus repair and gatekeeping function", "Daniel's function as DJ, missing person, and dream anchor"],
  },
  relationships: [
    { characters: ["erin", "miller"], publicFact: "Partners working the case together. Erin picks the direction and hammers the key questions; Miller handles field support, street instinct, and breaking the tension. They can bicker, but when risk shows up they're on the same side." },
    { characters: ["erin", "harold"], publicFact: "Superior and subordinate, and old colleagues who have never respected each other much. Harold can lean on procedure; Erin can push back." },
    { characters: ["miller", "harold"], publicFact: "Precinct chief and officer. Miller talks back and jokes his way around pressure, but he can't override Harold on precinct action." },
    { characters: ["erin", "daniel"], publicFact: "Sister and brother. Daniel went missing at Lotus 99 three years ago.", directorNote: "Chapters One and Two must not reveal that Daniel is \"Zero.\"", revealFromChapter: 3 },
    { characters: ["ward"], publicFact: "The mechanic and gatekeeper of Lotus 99.", directorNote: "His real motive is to be uncovered chapter by chapter." },
    { characters: ["harold", "ward"], publicFact: "No publicly known connection yet.", directorNote: "Harold knows more than he says; in Chapter One this can only show as his eagerness to close the case, never as an explanation of why." },
    { characters: ["ward", "daniel"], publicFact: "No publicly known relationship.", directorNote: "The full nature of their relationship is a later secret; the first two chapters must not state it outright.", revealFromChapter: 3 },
  ] satisfies StoryRelationship[],
};

export const cast: Record<Person, { name: string; role: string; image: string; bio: string }> = {
  erin: { name: "Erin", role: "Missing Persons Detective", image: "/characters/erin.png", bio: "Cool-headed, sharp, stubborn. Her brother Daniel went into Lotus 99 three years ago and never came out; she won't trade reality for a dream." },
  harold: { name: "Harold", role: "Precinct Chief", image: "/characters/harold.png", bio: "Old-school, buttoned-down, used to shoving cases back into place. Doesn't say much, but when he does it's barbed and it doesn't spare anyone's feelings — he won't waste time circling a subject, and when he leans on you, one line is enough to nail you where you stand. He knows more about Lotus 99 than he admits." },
  miller: { name: "Miller", role: "Erin's partner on the force", image: "/characters/miller.png", bio: "Grew up in Baltimore, quick mouth, quicker temper. Wears off-key jokes and the occasional swear word like armor. Looks like a screwup, but nobody's better at remembering the detail on the street or in an old file that shouldn't line up." },
  maya: { name: "Maya", role: "The missing nightlife blogger", image: "/characters/maya.png", bio: "Twenty-four-year-old nightlife vlogger. Curious, sharp, used to watching other people through a lens." },
  ward: { name: "Ward", role: "A mechanic connected to Lotus 99", image: "/characters/ward.png", bio: "The white-haired mechanic. Gentle, patient, and never tells you the whole thing at once. Hasn't stepped on scene yet." },
  daniel: { name: "Daniel", role: "Erin's missing brother", image: "/characters/daniel.png", bio: "Walked into Lotus 99 three years ago and never came back to the real world. Current whereabouts unknown." },
};

export const chapters = [
  { title: "The Missing", sub: "Precinct in the Downpour · 02:59", scene: "The Seventh Precinct on a rainy night. The captain wants the case buried; Erin won't back off. Her partner Miller keeps cracking wise, but his eyes are locked on the one detail nobody wants to touch.", goal: "Find out why the precinct is in such a hurry to bury Maya's case before you decide whether to open the vlog she left behind.", bg: "bg-station" },
  { title: "Lotus 99", sub: "Docks · 02:49", scene: "You've already found the white-haired old man from the surveillance footage at the old-dock repair shed, and the conversation is just getting started. That black mech is still lying there beside him; in the footage earlier, a door behind him opened. Ask him first whether he's seen Maya, then ask where that door is and where it leads.", goal: "Keep questioning the old man about the repair shed footage: has he seen Maya, where is the door that opened, and where does it go.", bg: "bg-lotus" },
  { title: "The Other New York", sub: "Cosplay Night · 03:00", scene: "The disguise plan actually worked. You walk into the real Lotus 99 in costumes that make keeping a cop's dignity nearly impossible. Don't go looking for Zero yet — every getup here that looks like a joke might be the one wish somebody refuses to let go of.", goal: "Find Maya in the club's parade of raw feeling, let Ward explain the rules of this place, then have Erin confront Zero — who's been avoiding her — herself.", bg: "bg-dream" },
  { title: "Zero", sub: "Core control room · 03:05", scene: "Brother and sister have recognized each other. Daniel leads everyone back to the core control room, and Harold has made it there too. Nobody's arguing about who Zero is anymore; what has to be settled now is why Daniel stayed, and how long Harold has been sitting on it.", goal: "Hear out Daniel's reasons for choosing to stay, press Harold to explain years of looking the other way, and work out what each of them is really trying to protect.", bg: "bg-zero" },
  { title: "Three A.M.", sub: "Lotus 99 · The Last Vote", scene: "Ward's paper is open, but nobody in the room has voted yet. Erin wants everyone to say their piece first: she'll talk about Daniel as a kid, and she wants Harold and Miller to state to each other's faces who they're each prepared to sacrifice.", goal: "Hear out Erin's childhood memories and both sides of the argument; the last vote only comes to you once Harold and Miller are genuinely deadlocked one to one.", bg: "bg-final" },
];

export const chapterMessages: Message[][] = [
  [
    { id: 1, kind: "system", text: "At 2:59 A.M., Miller is half-kneeling under that old monitor in the records room, one hand propping up the loose back panel, the other bringing a screwdriver to a connector that's already gone black. The city promised to replace these machines three years ago; then the budget went to street cameras, and after that they didn't bother explaining anymore. Out in the hallway someone shuts off the printer, someone else gets a coat on early; New York is shipping night-shift workers into the subway, drunks into the ER, and the missing nobody noticed in time onto tomorrow morning's to-do list." },
    { id: 2, person: "miller", text: "I'll only ask once: if this thing blows a fuse, is that a technical accident, or did I finally win the whole precinct a paid blackout?" },
    { id: 3, person: "erin", text: "Put the red wire back first. If you really want to improve working conditions, start by learning to switch off the soldering iron." },
    { id: 4, person: "harold", text: "Don't encourage him. Last time he improved working conditions, the evidence room lost a chair and gained a coffee maker. Broken coffee maker, at that." },
    { id: 5, kind: "system", text: "Miller pokes his head out from under the desk, ready to defend that coffee maker, then sees Erin keeping her hand pressed on the player's power cord and swallows it. He tightens the last screw; the screen throws up a green line, then grudgingly brings the picture back. Harold stands at the window, gloves already in his hand but not on; Erin waits for the screen to hold steady before turning the player toward the middle of the desk. On screen, Maya is standing outside the door of Lotus 99, the red recording light blinking on and off. The jokes in the room don't stop — everyone just suddenly knows who to make room for." },
  ],
  [
    { id: 20, kind: "system", text: "The door to Lotus 99 only shows up after midnight. The air smells of motor oil, rain, and a fog so sweet it turns bitter." },
    { id: 21, person: "ward", text: "People who come in usually know what they're looking for. What about you three?" },
    { id: 22, person: "erin", text: "Maya. And a door." },
  ],
  [
    { id: 30, kind: "system", text: "The disguise plan actually worked. The doorman didn't even give them a second look, as if three people in full cosplay outfits, all working hard to pretend they'd never met, were the most ordinary customers Lotus 99 gets." },
    { id: 31, person: "miller", text: "Remind me — are we undercover, or shooting promo photos for bad life decisions?" },
    { id: 32, person: "erin", text: "Both of you, shut up. Find Maya first. And don't step on each other's tails." },
  ],
  [
    { id: 40, person: "daniel", text: "Sis, don't stand so close. After three, I can't promise I'm still me." },
    { id: 41, person: "erin", text: "Daniel. Take off the mask." },
  ],
  [
    { id: 50, kind: "system", text: "A fine silver rain comes down over the city. Every screen is counting down." },
    { id: 51, person: "ward", text: "I didn't force anyone to stay. I only opened the door." },
    { id: 52, person: "harold", text: "Once that door is open for good, reality doesn't get a choice." },
  ],
];

export const vlogReactionMessages: Message[] = [
  { id: 11, kind: "system", text: "The footage cuts to black. The player's fan is still turning; all that's left on the screen is snow. Nobody in the records room moves first: Erin stands by the desk, Harold looks out the window, Miller sets his cold coffee down beside an old case file. A ring of water has seeped out from under the cup and is slowly working its way into the pages." },
  { id: 12, person: "harold", text: "Who gave you this thing?" },
  { id: 13, person: "erin", text: "Came into my cold-case inbox this afternoon. No message, just the raw file and a one-time address. The address is dead now." },
  { id: 14, person: "miller", text: "If it's a prank, they've got a bigger budget than this building. Both those mascot suits are newer than my vest." },
  { id: 15, kind: "system", text: "Harold walked over to the monitor, didn't touch the keyboard, just ran those two seconds in the back alley again, stopping where the mascot suit turns around. The water cooler in the outer room gulped once, then went quiet." },
  { id: 16, person: "harold", text: "Original file stays here. It goes to forensics first thing in the morning. Nobody chases a piece of video out that door tonight." },
  { id: 17, person: "erin", text: "Maya's been missing less than six hours. By the time forensics clocks in, she may not be where she was." },
  { id: 18, kind: "system", text: "Miller moved the paper cup aside before it could soak the file any worse. He looked at Erin first, then at Harold. Nobody left; the records room door stood half open, and the digital clock at the end of the hall kept walking toward three." },
];

// ---- 以下三组原先内联在 app/page.tsx 里，为了按语言分叉搬到这里；文案逐字不变。 ----

/** 每章入场时的两条起手选项（索引 = 章节下标）。 */
export const chapterArrivalChoices: Record<number, Array<{ kind: "action" | "speech"; text: string }>> = {
  1: [
    { kind: "action", text: "Show him the frame where the door opens" },
    { kind: "speech", text: "Ask him first if he's seen Maya" },
  ],
  2: [
    { kind: "action", text: "Follow the strangest patroller first" },
    { kind: "action", text: "Skip the spectacle — find Maya first" },
  ],
  3: [
    { kind: "speech", text: "Ask Daniel why he stayed" },
    { kind: "action", text: "First find out which memories this place copied" },
  ],
  4: [
    { kind: "speech", text: "Let Harold finish his reasons first" },
    { kind: "speech", text: "Make Miller say who he's trying to protect" },
  ],
};

/** 开场档案页（Vlog 门之前的两页世界档案）。 */
export type OpeningArchivePage = { eyebrow: string; title: string; code: string; rows: Array<{ label: string; text: string }> };

export const openingArchivePages: OpeningArchivePage[] = [
  {
    eyebrow: "I. Setting File",
    title: "The Silent New York",
    code: "NYC–2147–NIGHT",
    rows: [
      { label: "Time Frame", text: "2147, the post-cyber urban reconstruction era. The old districts have been through three rounds of infrastructure overhaul, yet most public systems still limp along on hardware left over from the last century." },
      { label: "Location", text: "North American East Coast Federal Zone · New York. The story opens in the Seventh Precinct's jurisdiction and runs south to the old docks of Red Hook, the after-hours venues, and a long-idle belt of warehouses." },
      { label: "Social Assessment", text: "The city has smarter surveillance, faster transit, and pricier body work, and none of it has made the place any more decent. Housing is tight, the night economy is swelling, and missing persons get filed into the pending queue fast. Technology handles the record-keeping. People still decide which records are worth looking at." },
    ],
  },
  {
    eyebrow: "II. Institutional File",
    title: "The Seventh Precinct (NYPD)",
    code: "NYPD–07–GRAVEYARD",
    rows: [
      { label: "Type of Institution", text: "A frontline general-service precinct of the New York Police Department. Handles patrol, missing-persons intake, preliminary evidence collection, cold-case filing, and overnight incident response." },
      { label: "Jurisdiction and Resources", text: "The district cuts across old residential blocks, freight corridors, and the dockside entertainment strip. The night shift has been short-handed for years; forensics and tech keep only a duty seat after midnight, and beat cops routinely juggle several unrelated messes at once." },
      { label: "Internal Assessment", text: "Captain Harold is good at managing risk, and just as good at managing who gets told what; Erin takes the missing-persons cases nobody can close; Miller handles field work and on-scene support, and proves the night shift hasn't finished him off yet by telling jokes at the worst possible moments. The people here don't always trust each other, but they usually know who'll still be standing there when things go sideways." },
    ],
  },
];

export type CostumeEntryMessage = { id: string; person?: Person; kind?: "system"; eventType: "narration" | "dialogue"; text: string };

/** 第三章换装入场的开场三句（按所选服装）。stamp 用于拼消息 id。 */
export function costumeEntryMessages(stamp: number): Record<string, CostumeEntryMessage[]> {
  return {
    dobby: [
      { id: `dobby-entry-${stamp}-1`, kind: "system", eventType: "narration", text: "Three of them slipped into the back alley in Dobby suits, no two the same size. The burlap drank the rain; the ears cleared the doorframe before the rest of the team did. The guy at the door gave them one look and waved them through—at Lotus 99, dressing too normal is what makes you suspicious." },
      { id: `dobby-entry-${stamp}-2`, person: "miller", eventType: "dialogue", text: "Let's get one thing straight: anybody takes a picture, I write them into the case report. Title: The Case of the Missing Dignity." },
      { id: `dobby-entry-${stamp}-3`, person: "erin", eventType: "dialogue", text: "Tuck in the ears. We're here to find someone, not to get wedged in a doorway." },
    ],
    guardians: [
      { id: `guardians-entry-${stamp}-1`, kind: "system", eventType: "narration", text: "The Guardians of the Galaxy outfits came out three shades brighter than planned. The tree-man shell nearly snagged on the fire escape, the raccoon tail swept the doorman's cup off its perch; the doorman looked like he saw this kind of disaster every day and waved them in." },
      { id: `guardians-entry-${stamp}-2`, person: "miller", eventType: "dialogue", text: "This isn't going undercover. This is giving the whole block advance notice: three grown adults have abandoned all judgment." },
      { id: `guardians-entry-${stamp}-3`, person: "erin", eventType: "dialogue", text: "You picked the raccoon. Less complaining, and keep that tail off the evidence." },
    ],
  };
}
