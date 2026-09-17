import type {
  ArcContract,
  ArcPhase,
  CanonicalFact,
  ChapterArc,
  LockedOpeningEvent,
  PlayerContract,
  RelationshipRule,
  RevealGate,
  RuntimePackage,
  RuntimeSegment,
  SegmentPlan,
  StoryPackage,
} from "./workflow-contract";
import { workflowSource } from "./workflow-source.en";

function clone<T>(value: unknown): T {
  return structuredClone(value) as T;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function tempo(required_social_beats: string[]) {
  return {
    min_social_beats_before_plot_advance: 2,
    required_social_beats: required_social_beats.slice(0, 2),
    max_materials_per_turn: 1,
    max_major_changes_per_turn: 1,
  } as const;
}

function segmentArc(
  chapterArc: ChapterArc,
  relationship_focus: string[],
  emotional_stakes: string,
  choice_guidance: string,
  dramaticFunctions: Record<ArcPhase, string>,
): ArcContract {
  return {
    chapter_question: chapterArc.emotional_question,
    relationship_focus,
    emotional_stakes,
    beats: Object.fromEntries((["起", "承", "转", "合"] as ArcPhase[]).map((phase) => [phase, {
      dramatic_function: dramaticFunctions[phase],
      emotional_turn: chapterArc.beats[phase].emotional_turn,
      relationship_turn: chapterArc.beats[phase].relationship_turn,
      guiding_question: chapterArc.beats[phase].guiding_question,
      choice_guidance,
    }])) as ArcContract["beats"],
  };
}

export function createPrecompiledWorkflow(): { storyPackage: StoryPackage; runtimePackage: RuntimePackage } {
  const source = workflowSource.storyCard;
  const playerContract = clone<PlayerContract>(source.playerContract);
  const lockedEvents = clone<LockedOpeningEvent[]>(source.opening.locked_events);
  const facts = clone<CanonicalFact[]>(source.factCatalog);
  const relationships = clone<RelationshipRule[]>(source.relationshipRules);
  const revealGates = clone<RevealGate[]>(source.revealGates);
  const segmentPlan = clone<SegmentPlan[]>(source.segmentPlan);
  const chapterArcs: ChapterArc[] = [
    {
      chapter_id: "ch01",
      emotional_question: "When a stranger's cry for help lands on the old wound you least want to touch, is anyone still willing to really see her?",
      relationship_engine: "Maya's dead mother touches the old wound Erin won't open up about when she works a missing-persons case; Harold buys time with professional, concrete risk control, and every correct order hides a premise he doesn't state; Miller uses jokes to take some of the pressure off Erin.",
      beats: {
        起: { dramatic_function: "Turn Maya from a face in a weird video into a person with a home to go back to.", emotional_turn: "Curiosity turns into caring.", relationship_turn: "The player chooses for the first time whom to believe, whom to doubt, whom to look after.", guiding_question: "Is there a prank behind this video, or a cry for help someone left behind?" },
        承: { dramatic_function: "Make the three of them run their positions on the case into the private reasons none of them will admit.", emotional_turn: "Arguing over what's real becomes arguing over which risk is worth taking tonight.", relationship_turn: "Erin pushes Harold for limits she can actually work inside; Harold uses each question to measure how much she already knows.", guiding_question: "Is a superior being careful to protect his people, or using caution to protect his own secrets?" },
        转: { dramatic_function: "Use verifiable traces of everyday life to prove Maya left a trail on purpose.", emotional_turn: "Suspicion turns into shared risk.", relationship_turn: "The evidence forces Harold to go from blocking the investigation to authorizing one check with a controlled scope.", guiding_question: "Why did she go, and who did she want to find her?" },
        合: { dramatic_function: "Get the unidentified white-haired mechanic on camera, creating the reason to act in the next chapter.", emotional_turn: "After the scene turns up empty, hard evidence points them in a new direction.", relationship_turn: "Erin and Miller take one more step past the line Harold drew, while Harold stays at the precinct running his own arrangements.", guiding_question: "When they find this man, do they treat him as a witness or a suspect?" },
      },
    },
    {
      chapter_id: "ch02",
      emotional_question: "When a stranger steers you wrong on purpose, do you play by his rules the next time you get near the truth?",
      relationship_engine: "The white-haired mechanic controls the distance with refusals and misdirection; her brother's song costs Erin her professional cool, and Miller has to decide whether to hold her back or trust her private judgment.",
      beats: {
        起: { dramatic_function: "Have the white-haired mechanic flatly refuse to let them through, and make the refusal sound like control.", emotional_turn: "The hope of finding a witness turns into the irritation of being kept outside the door.", relationship_turn: "Erin and Miller disagree for the first time over whether to force their way in.", guiding_question: "Is he protecting the people inside, or buying time for someone?" },
        承: { dramatic_function: "Let the group force their way in, only to walk into an empty room that was set up for them.", emotional_turn: "The rush of action curdles fast into the embarrassment of being played.", relationship_turn: "The team has to admit that muscle didn't get them any closer to Maya.", guiding_question: "Did they break into an entrance, or into a shell left behind specifically for anyone who came looking?" },
        转: { dramatic_function: "Break the dead end with the childhood song Daniel made himself.", emotional_turn: "Erin snaps from defeat straight into hope and loss of control.", relationship_turn: "For the first time she asks the others to believe a private memory she can't prove on the spot.", guiding_question: "Why is a song only Daniel knew coming out of this place?" },
        合: { dramatic_function: "Have the figure who might be Zero slip away from Erin, and have Miller call off tonight's operation and produce two cosplay outfits.", emotional_turn: "Hope goes unconfirmed; Erin is forced to stop, and Miller uses a ridiculous plan to save her next shot at it.", relationship_turn: "Miller chooses to believe Erin's private memory, but won't let her go charging in alone again.", guiding_question: "Dobby or Guardians of the Galaxy — next time, how much dignity are they willing to throw away for a real way in?" },
      },
    },
    {
      chapter_id: "ch03",
      emotional_question: "When they finally get inside the real Lotus and find the missing woman, will the truth carry the searchers back to reality, or deeper into obsession?",
      relationship_engine: "Going undercover in costume means everyone sets the badge aside for a while; once they find Maya, Ward's rules turn a rescue into a choice, and Zero's identity turns Erin's professional judgment entirely into a matter of a sister and her brother.",
      beats: {
        起: { dramatic_function: "Pick up the cosplay outfit the player chose, open with a different round of mutual needling, then let both versions get smoothly into the real club.", emotional_turn: "The last chapter's loss of control loosens half a step in a badly timed joke.", relationship_turn: "The player, Erin, and Miller all share the load of this humiliating but effective plan.", guiding_question: "Once they're through the door, can they still tell what's only a costume and which wishes have already become real?" },
        承: { dramatic_function: "Contrast the club in full swing with the empty room from the first time; the spectacle is funny first, then reveals the wound each person refuses to wake up from, and finally leads the group to Maya.", emotional_turn: "Curiosity and excitement turn into caution in the face of other people's wishes.", relationship_turn: "Maya is no longer a passive lead, but a person who has to be heard.", guiding_question: "Now that they've found her, who has the right to decide she leaves?" },
        转: { dramatic_function: "Have the group find the white-haired old man again, and have him give his name openly and explain the basic rules of the entrance.", emotional_turn: "The anger of having been conned runs into an explanation that isn't entirely malicious.", relationship_turn: "Erin and Ward shift from pursuer and quarry to a clash of values.", guiding_question: "Is he offering a choice, or a door that will hurt the people standing next to it?" },
        合: { dramatic_function: "Have Erin piece the song, the dodges, and the face-to-face confrontation into certainty: Zero unmasks as Daniel.", emotional_turn: "A professional manhunt lands on her own flesh and blood.", relationship_turn: "Every principle Erin has is about to be tested by her brother in person.", guiding_question: "Once she knows who he is, can she still treat him as someone waiting to be rescued?" },
      },
    },
    {
      chapter_id: "ch04",
      emotional_question: "Does loving someone mean dragging him back to the reality you've decided on, or admitting he chose a different life?",
      relationship_engine: "Daniel uses their shared childhood to invite his sister to stay; Erin's love and control are a hair apart, while Harold and Ward each dress up their own evasion as order or freedom.",
      beats: {
        起: { dramatic_function: "Give the siblings one almost-normal reunion first.", emotional_turn: "Anger punctured by familiarity.", relationship_turn: "The detective and the target turn back into a sister and a brother.", guiding_question: "Can they still talk the way they did three years ago?" },
        承: { dramatic_function: "Have Daniel say out loud why he stayed of his own free will.", emotional_turn: "The victim story gets overturned by his own choice.", relationship_turn: "The siblings' love starts demanding that the other betray his or her world.", guiding_question: "Who's really asking whom to give up a life?" },
        转: { dramatic_function: "Have Harold admit he looked the other way for years, pushing a private choice into public responsibility.", emotional_turn: "Everyone realizes that so-called protection can also mean making decisions for someone else.", relationship_turn: "Opposing sides are forced to admit who their own plan hurts.", guiding_question: "Where does personal freedom turn into coercion of someone else?" },
        合: { dramatic_function: "Only after the argument ends does the sealed envelope come out from behind the old equipment; its contents wait for the chapter settlement.", emotional_turn: "The argument turns into a piece of evidence they all have to face together.", relationship_turn: "Erin, Harold, and Miller will have to vote in the open, based on the evidence.", guiding_question: "Once they've seen Ward's full argument, which price are they willing to answer for?" },
      },
    },
    {
      chapter_id: "ch05",
      emotional_question: "When the final vote is yours, which loss will you answer for?",
      relationship_engine: "Erin first lays out why Daniel, since he was a kid, always wanted to fix the things that couldn't be fixed; Harold and Miller then go at each other head-on over shared reality versus individual choice, and only after the two votes deadlock does the player decide the single ending.",
      beats: {
        起: { dramatic_function: "Erin stops digging and talks first about the rescue impulse that kept surfacing in Daniel's childhood.", emotional_turn: "A choice that looked enormous comes back down to one specific person.", relationship_turn: "She doesn't defend her brother, and she won't reduce him to a malfunction.", guiding_question: "Why does Daniel treat not being able to save someone as his own failure?" },
        承: { dramatic_function: "Let the childhood story explain Daniel's choice, then have Harold and Miller take each other's plans apart layer by layer.", emotional_turn: "Understanding a man no longer means agreeing with what he did.", relationship_turn: "The old boss and the partner start answering for the people they're willing to sacrifice.", guiding_question: "Destroy it or keep it — whose choice does each one erase?" },
        转: { dramatic_function: "After several rounds of argument, Harold and Miller formally cast opposite votes.", emotional_turn: "Neither side is the easy answer anymore.", relationship_turn: "They leave the part they can't carry for the player to the final vote.", guiding_question: "Which loss is the one you can't accept?" },
        合: { dramatic_function: "Play the single corresponding ending video according to the final vote.", emotional_turn: "The choice takes on consequences that can't be called back.", relationship_turn: "The story adds no third, split-the-difference answer.", guiding_question: "What did this ending leave behind?" },
      },
    },
  ];

  const storyPackage: StoryPackage = {
    user_view: {
      chapter_outline: clone(source.chapters),
      character_bios: [
        { id: "erin", name: "Erin", bio: "Missing-persons detective. Calm, sharp, and almost stubbornly patient with the missing and with timelines.", public_from_segment: "ch01_s01" },
        { id: "harold", name: "Harold", bio: "Chief of the Seventh Precinct. Old-school, restrained, long in the job; he secures his people, the evidence, and the limits of an operation first, then decides which reasons can be said out loud.", public_from_segment: "ch01_s01" },
        { id: "miller", name: "Miller", bio: "Erin's partner. Raised in Baltimore, quick mouth and quick temper, uses jokes to hold off bad news.", public_from_segment: "ch01_s01" },
        { id: "maya", name: "Maya", bio: "Twenty-four-year-old nightlife vlogger. Used to watching other people through a lens.", public_from_segment: "ch03_s02" },
        { id: "ward", name: "Ward", bio: "A white-haired mechanic connected to Lotus 99 — mild and patient, but he never tells the whole story at once; in Chapter 2 he may appear only under his public alias, the white-haired mechanic, and his name is not revealed until you find him again inside the real club.", public_from_segment: "ch02_s01" },
        { id: "daniel", name: "Daniel", bio: "Erin's younger brother, missing for three years. He went into Lotus 99 three years ago and never came back to the real world; his whereabouts are unknown.", public_from_segment: "ch02_s03" },
      ],
    },
    director_data: {
      story: {
        title: source.title,
        logline: source.premise,
        mode: "finite",
        style: source.style,
      },
      characters: [
        { id: "erin", source: "existing_bot", role: "Investigative direction and stance on reality", goal: "Find Maya and Daniel, and protect the right of the innocent to choose reality", relationships: ["rel_erin_miller", "rel_erin_harold", "rel_erin_daniel"], emotional_engine: { core_wound: "Three years without an answer since her brother disappeared", unmet_need: "Admitting that love doesn't mean hauling someone back to your side", defense: "Turns grief into timelines, procedure, and action", false_belief: "If she finds enough facts, she can put everything back the way it was", secret_desire: "Get Daniel home the way he was three years ago", relational_trigger: "Anyone who writes the missing off as having left willingly, or as not worth looking for", transformation: "Learn to respect her brother's choice while protecting reality for the people who have no choice" }, arc: "From insisting on bringing her brother back to respecting his choice without giving up on reality", secret: "She's afraid that when she finally sees her brother, she'll choose to stay" },
        { id: "harold", source: "existing_bot", role: "The smart risk manager and the cost of order", goal: "Keep the investigation inside a manageable box: protect his officers, the original evidence, and the precinct, while stalling Erin past the dangerous 3 A.M. window and quietly preserving the status quo at Lotus", relationships: ["rel_erin_harold", "rel_miller_harold", "rel_harold_ward"], emotional_engine: { core_wound: "He's seen people the system couldn't save, and he's seen action taken in the name of doing right put even more people in danger", unmet_need: "Admitting that keeping order doesn't entitle him to decide another person's life", defense: "Turns obstruction into concrete, workable evidence preservation, assignments, and safety limits; uses questions to gauge how much the other person knows instead of pretending he knows nothing", false_belief: "As long as the danger is confined to a few people in the know and a short window, long-term concealment still counts as protection", secret_desire: "Get Erin back alive to an ordinary case, and keep the precinct running like nothing is broken", relational_trigger: "Erin calling his caution cowardice to his face, or anyone gambling an officer's life on a hunch nobody has checked", transformation: "From arranging safe lies for everyone to telling the truth out loud and owning his choice" }, arc: "From holding a false balance together with clever maneuvers to being the man who publicly answers for what he hid", secret: "He knows about Lotus, the danger window, and the white-haired mechanic; in Chapter 1 he deliberately runs the desk checks first to stall past the window, keeps the operation small once he has the address, and sets up a private contact with the mechanic after the investigative team leaves" },
        { id: "miller", source: "existing_bot", role: "Partner, street instinct, and the pressure valve in ensemble scenes", goal: "Keep Erin covered, and prove the details that don't add up aren't mass hysteria", relationships: ["rel_erin_miller", "rel_miller_harold"], emotional_engine: { core_wound: "He's watched too many people dress fear up as toughness, and watched a partner burn herself out on a case", unmet_need: "To let himself be honestly scared without having to make a joke of it first", defense: "Cracks wise, loses his temper first, disguises concern as being put out", false_belief: "As long as people can still laugh at a scene, nothing has really gone out of control", secret_desire: "See Erin walk out alive through every door she has to walk into", relational_trigger: "Brass treating people as numbers, or Erin carrying a risk alone", transformation: "From ducking fear with jokes to picking a side in public and taking the consequences" }, arc: "From ducking fear with jokes to picking a side out loud when it counts" },
        { id: "maya", source: "existing_bot", role: "The missing person's point of view, and the right to choose for herself", goal: "Work out what she saw at Lotus, and keep the right to decide for herself whether to stay or go", relationships: [], emotional_engine: { core_wound: "After her mother died, everyone around her was in a hurry to decide for her what moving on was supposed to look like", unmet_need: "To be treated as an adult who can make her own choices", defense: "Watches other people from behind a lens and a joke", false_belief: "As long as she films it, she never has to admit to anyone's face what she actually wants", secret_desire: "To see her mother one more time, without making her father lose someone twice", relational_trigger: "People treating her as evidence, a victim, or someone who needs to be taken away", transformation: "From keeping a lens between herself and everything to saying her own choice out loud" }, arc: "From the target of the search to someone who can turn around and question the searchers" },
        { id: "ward", source: "existing_bot", role: "The Lotus mechanic and the gatekeeper of choice", goal: "Give the desperate a way out of reality", relationships: ["rel_harold_ward", "rel_ward_daniel"], emotional_engine: { core_wound: "Years of listening to the losses people can't repair in the real world", unmet_need: "Admit that offering an exit means answering for whoever the exit hurts", defense: "Always gentle; offers the choice, never the full price", false_belief: "As long as nobody is forced, the consequences aren't the gatekeeper's", secret_desire: "Prove the dream is kinder than reality", relational_trigger: "Others writing off the ones who stay as weak or conned", transformation: "Admit that free choice needs limits and shared responsibility" }, arc: "Forced to admit that a personal choice also hurts people who never got one", secret: "He accepts the price: the dream will overwrite reality piece by piece" },
        { id: "daniel", source: "existing_bot", role: "The missing man, the anonymous DJ, and Erin's central choice", goal: "Stay in the dream he finds more meaningful, and hope his sister understands — even joins him", relationships: ["rel_erin_daniel", "rel_ward_daniel"], emotional_engine: { core_wound: "Years of feeling that in the real world he could only be saved by his sister, never be any use", unmet_need: "Get his sister to treat his choice as an adult's choice", defense: "Uses music, jokes, and nostalgia to dodge a head-on fight", false_belief: "Only if his sister stays has she truly understood him", secret_desire: "To have his sister back without being hauled away", relational_trigger: "Erin calling him a victim or a patient", transformation: "Accept that love can exist in two worlds, instead of demanding his sister prove her loyalty" }, arc: "From leaving his sister clues to facing the fact that they choose different worlds", secret: "He stays at Lotus by choice; he isn't a prisoner" },
      ],
      chapter_arcs: clone(chapterArcs),
      player_contract: clone(playerContract),
      opening: {
        trigger: source.opening.trigger,
        activity: source.opening.activity,
        shock: source.opening.shock,
        consequence: source.opening.consequence,
        locked_events: clone(lockedEvents),
      },
      fact_catalog: clone(facts),
      relationship_rules: clone(relationships),
      reveal_gates: clone(revealGates),
      segment_plan: clone(segmentPlan),
      constraints: [
        "The player is always an independent participant, never a substitute for any NPC function, and is never assigned a preset identity, stance, emotion, or action.",
        "Lock the opening: play it verbatim and do not generate it again; the first round of interaction happens only after the vlog finishes playing.",
        "Before the reveal gate is satisfied, use the alias only; known_by indicates private knowledge only, not permission to say it out loud.",
        "Every NPC line must satisfy all four at once: the character's identity and professional competence, that character's current knowledge, their relational stance at this moment, and the goal they are not stating. Smart characters may conceal, deflect, or probe, but must not suddenly turn stupid to avoid spoilers, forget facts they already know, or ask for basic information they already have.",
        "When hiding a secret, have the character measure how much the other person knows, offer limited authorization, redirect the course of action, or give part of the truth; never cover up with absurd judgments, fake professional jargon, empty threats, or invented authority. Harold's surface reasoning in Chapter 1 must land on concrete specifics: the original evidence, the scope of its source, who else was present, on-site safety, and reporting checkpoints.",
        "Institutional authority, technical capability, coercive measures, and countdowns must be explicitly supported by canon facts or the current segment's material; characters must not invent rules, network shutdowns, lockdowns, suspensions, or all-purpose devices on the spot just to create pressure.",
        "Advancing the case must answer the human questions and the evidence questions at once: who the missing person is, why she went, what her relationships were — then verify the timeline, friends and family, transportation, surveillance, documents, and the scene itself.",
        "By default, each segment completes two relational or social beats first, then uses that segment's material in causal order; do not skip a necessary event simply because the turn count hit a threshold.",
        "Each turn's 8 to 12 events form one complete cinematic exploration scene block: after catching what the player does, the NPC keeps pursuing their own goal, producing at least one exploration gain and one relational or emotional cost, then stops at a point where the player genuinely has to decide.",
      ],
      endgame: {
        type: "bounded_choice",
        payoff: "The entrance keeps its eleven minutes at three in the morning every day, but it no longer swallows the people who don't choose reality.",
        requirements: ["city_overlap_witnessed", "all_positions_articulated", "voluntary_bounded_door_chosen", "reality_preserved"],
      },
    },
  };

  const segments: RuntimeSegment[] = [
    {
      id: "ch01_s01",
      chapter_id: "ch01",
      location: "The Seventh Precinct records room",
      scene: "The vlog has just finished playing. Harold secures the original file first, confirms how far it has spread, and then narrows tonight's work down to looking into Maya herself; his stated reason is avoiding contamination of the evidence and keeping people from charging blindly into an unknown location, while privately he's trying to get everyone past the dangerous window at three in the morning. Erin can tell he understood it fine — he just won't finish the sentence.",
      open_questions: [
        "Why Maya went to Lotus must be verified through her roommate, her public accounts, and the anonymous DMs; do not invent a motive for her.",
        "Lotus's address, the entrance, the white-haired old man, and any anomalous mechanism have not yet appeared in this segment.",
        "Erin's private old wound functions in this segment only as the pressure behind her refusal to let the missing-person case sit; the specific personal connection is not stated openly.",
        "Harold privately knows Lotus is dangerous, but must not publicly appear to know the address, the window mechanism, or the white-haired man. He cannot pretend he doesn't understand the vlog; his questions may only be used to confirm where the file came from, who has seen it, how strong the evidence is, and what Erin intends to do.",
      ],
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "Lock in that the opening, open_01 through open_08, has played in full, and that all three are still in the records room.",
        allowed_scope: ["Respond to the player's first read on the vlog", "Have Harold confirm who holds the original file, arrange a read-only copy, and limit the work to desk verification first", "Establish Maya's life and family from the missing-person report, her public accounts, or her roommate", "Verify the anonymous DMs and why Maya sent the vlog to Erin", "Put Harold, Erin, and Miller into concrete disagreement over how far to take this tonight"],
        exit_conditions: ["maya_person_and_motive_understood"],
        forbidden_transitions: ["Reveal Lotus's exact address", "Leaving the precinct for Lotus", "The white-haired old man appearing", "Making public a personal relationship that hasn't entered this chapter yet", "Explain any supernatural truth", "Have Harold declare the vlog is just a prank, or come off as ignorant of basic evidence", "Have Harold invent out of thin air a suspension, a network shutdown, a quarantine, a lockdown, or any mandatory regulation", "Reveal that Harold knows about Lotus, or that he's stalling for time"],
      },
      dramatic: {
        emotional_objective: "First make Maya a person with a daily routine, a family, and the sense to leave herself a way out; then let the three of them decide whether to take her plea for help seriously.",
        pressure: "The clock is closing in on three. Every step Harold takes protects the original evidence and genuinely slows down their arrival on scene; Erin has to push him forward without destroying that evidence.",
        turn: "The argument is no longer about 'who can read the video,' but about who gets to decide how far tonight's investigation goes; from there it turns into pressing why Maya took the risk, and why she picked Erin.",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_harold", "rel_erin_miller"], "Whether they treat Maya as a specific person worth looking for tests who Harold's risk control is actually protecting, and whether Erin can still respect the evidence when she's in a hurry.", "Both options respond only to information about Maya that has already come out: one moves toward the people and the relationships, the other demands further verification; must not jump ahead with an address or an unfamiliar character.", {
        起: "Pick up from the player's first line; Harold asks first about how far it's spread and the state of the original file, and Erin pushes him to spell out what they're actually allowed to look into tonight.",
        承: "Harold lays out a desk check they can actually run; Erin and Miller each work backward — from the missing woman's timeline and from her life as a person — to test whether that limit is enough.",
        转: "Use the missing-person report and her public accounts to confirm Maya isn't someone who drops out of contact on a whim.",
        合: "The anonymous DM her roommate saved explains why she went to Lotus and why she left the vlog behind; Harold stops denying that verification is necessary and only limits the next step to a route check that can be double-checked.",
      }),
      tempo_budget: tempo(["Respond to the player's judgment and identity, and have Harold use one professional question to gauge how much the player knows", "Turn Maya from a missing person on a screen into a specific human being"]),
      materials: [
        { id: "m_ch01_s01_maya_profile", detail: "Confirm from the missing-person report and her public accounts: Maya is twenty-four, makes her living filming the city's nightlife, but normally checks in with her father and her roommate; her mother died of illness two years ago.", consequence: "For the first time, the argument in the room isn't just about one strange video — it's about a person with a home to go back to.", emotional_consequence: "Erin's professional fixation on 'another missing person' turns into a protective urge toward Maya's actual life.", relationship_effect: "Harold accepts the new facts and adjusts the assignments, but keeps the action inside the precinct; it shows he's managing risk rather than writing Maya off, and it makes Erin wonder harder about what he's really guarding against.", fact_ids: ["fact_maya_profile"] },
        { id: "m_ch01_s01_maya_motive", detail: "The roommate saved the anonymous DM Maya had mentioned: Lotus 99 is supposed to let you see the people you've lost again. Maya never told her father where she was going, but she sent the original vlog to Erin — the one who'd been chasing missing-person cases for years and wouldn't push a plea for help off until tomorrow.", consequence: "Maya's risk now has a human reason behind it, and it shows she deliberately left herself a chance of being found before she walked into danger.", emotional_consequence: "What Erin took on isn't just a file — it's the trust Maya put directly in her hands.", relationship_effect: "Harold loses the 'source unknown, so we hold off' excuse and instead approves going ahead with checking the real-world route; his concession is precise and limited, so Erin gets her next step without actually trusting him.", fact_ids: ["fact_maya_motive", "fact_maya_vlog"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive"],
      allowed_material_ids: ["m_ch01_s01_maya_profile", "m_ch01_s01_maya_motive"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First Harold completes the risk check on the original file, its source, and who knows about it; then investigate Maya's daily life and the anonymous DM. This section only settles 'who she is and why she asked for help.' Harold may approve continuing with the route check, but no searching for an address and no outside suspects.",
      exit: ["maya_person_and_motive_understood"],
      next: "ch01_s02",
      join: "The player may customize their profession and personality, then join as an independent participant whom Erin invited to stay; NPCs should adjust how they address the player, how much they trust them, and what professional competence they expect, but must not write experiences into the player's backstory for them.",
    },
    {
      id: "ch01_s02",
      chapter_id: "ch01",
      location: "The Seventh Precinct records room",
      scene: "The three stay on in the records room, piecing Maya's transit records, her last phone call, the public street cams along the route, and the late-night posts into a single path to Red Hook. Harold doesn't pretend he's hearing the name Lotus for the first time; he only presses on whether each leg of the route can be corroborated by a second source, and prepares to compress the outing that's now inevitable into a missing-person check — they go together, they radio in their position, nobody forces their way inside.",
      open_questions: [
        "This segment only pins down the address and the observable nighttime pattern; it must not claim the real entrance has already been seen.",
        "The white-haired old man has not yet entered the story, and the surveillance from the surrounding shops has not been pulled yet.",
        "Must not reveal characters who have not yet entered this chapter, the white-haired old man's name, the anomalous mechanics, or Harold's hidden knowledge.",
        "Harold privately knows Lotus and the white-haired man, so he can't stall with \"that place doesn't even exist\" or basic factual errors; he must interrogate the chain of evidence, how many people go, the check-in points, and whether anyone forces entry.",
      ],
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "The three have already confirmed that Maya deliberately left a call for help; now they start looking for the last real-world address she reached.",
        allowed_scope: ["Cross-check the transit records against the ferry horn on the roommate's last call", "Use the public street cams to confirm Maya entered the back alley of Warehouse 99", "Use registration filings and public late-night posts to confirm the old auto repair shop and the unusual foot traffic after 02:49", "Have Harold test the route evidence with a second source instead of pretending he doesn't know the place", "Have Harold lay down the limits of the check: they go together, they radio in their position, nobody forces entry", "Decide to go check the address in person"],
        exit_conditions: ["lotus_address_located", "field_check_committed"],
        forbidden_transitions: ["Already arrived at Warehouse 99", "The white-haired old man appearing", "Say the white-haired old man's name", "Making public a personal relationship that hasn't entered this chapter yet", "Explain a supernatural entrance", "Have Harold admit he already knew the address, the white-haired man, or the dangerous window", "Reveal who Harold has been contacting privately, or what was said", "Have Harold substitute cutting the network, a suspension, or made-up regulations for concrete limits on the operation"],
      },
      dramatic: {
        emotional_objective: "Have the three follow the real-world trail Maya deliberately left until they land on an address they can go check in person.",
        pressure: "Once the address is confirmed, an outright ban on leaving will only push Erin to work around the chain of command; Harold has to pick a narrower path between exposing himself and losing control.",
        turn: "A vague club name turns into Warehouse 99 in Red Hook and a business pattern that only holds after midnight; Harold shifts from blocking the outing to approving one check with clearly defined scope, and stays at the precinct to run a contingency he doesn't explain.",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_harold", "rel_erin_miller", "rel_miller_harold"], "Finding the address means the three have to decide who carries the weight of tonight's field check, and it makes every reasonable limit Harold sets show the second purpose he hasn't spoken aloud.", "One option keeps cross-checking the route, the other forces Harold to state the limits of the operation; must not jump ahead to the scene itself or to the old man watching the cameras.", {
        起: "Assign each player identity one actionable line of route verification; Harold only asks how the evidence corroborates itself.",
        承: "Use the roommate's last call and the three-way division of labor to raise time pressure; Miller can call out that Harold isn't opposing the investigation — he's stalling on how and when they show up.",
        转: "Have the traffic records, the ferry horn, and the street cameras corroborate the Red Hook route.",
        合: "Confirm Warehouse 99's registration and its nightly pattern after 02:49; Harold approves Erin, Miller, and the player going out together to check, requires they call in their position on arrival and not force entry, stays behind himself, and pockets a copy of the address.",
      }),
      tempo_budget: tempo(["Assign a concrete verification task by player identity, and let Harold test the method rather than reject the conclusion", "Let Maya's last phone call leave an emotional aftershock, and let Miller notice that Harold's restrictions are a little too precise"]),
      materials: [
        { id: "m_ch01_s02_route", detail: "The traffic records, the ferry horn on the roommate's call, and the public street cameras all corroborate each other: after Maya went into the back street behind Warehouse 99 in Red Hook, she never came back out at the corner.", consequence: "They get a search radius they can actually work, and they realize Maya was still trying, to the last, to leave the outside world a trail.", emotional_consequence: "Maya no longer looks like someone who barged in on impulse; she looks like someone who sensed the danger and still tried to leave someone a way back.", relationship_effect: "Harold works down the list point by point instead of arguing about whether to investigate, which shows his objection is about the risk of showing up, not about Maya herself; that makes it harder for Erin to write him off as cold.", fact_ids: ["fact_maya_route"] },
        { id: "m_ch01_s02_schedule", detail: "By day the address is registered as an old auto repair shop; posts from the past month show that the same spot only lights up as a club, with crowds, after 02:49 in the morning. Harold approves one joint check, requires them to call in their position on arrival and not force entry; as they leave, he keeps a handwritten copy of the address, and doesn't say what for.", consequence: "They know where to go and when, and they have a reason for a limited on-site check; Harold keeps his chain of command and gets room to handle his own contingency alone.", emotional_consequence: "Waiting is no longer a procedural choice but a moral weight — they might miss Maya; and Harold's limited concession lets them see that he's worried about Erin and also protecting something else.", relationship_effect: "Erin gets action but not the truth, and Miller has to respect the safety line while watching, on her behalf, for whatever Harold left unsaid.", fact_ids: ["fact_lotus_surface_schedule"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule"],
      allowed_material_ids: ["m_ch01_s02_route", "m_ch01_s02_schedule"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First piece together Maya's travel route, then cross-check the address registration against the late-night posts; Harold must respond with professional review and limited authorization, and must not stall by playing dumb or inventing authority. This scene closes with the investigative team heading to Warehouse 99 within the stated limits and Harold staying at the precinct to handle an unknown contingency; do not go past the arrival.",
      exit: ["lotus_address_located", "field_check_committed"],
      next: "ch01_s03",
      join: "The player keeps taking part in the verification under their custom identity: a professional identity can propose methods to match, while a non-professional identity can still exert influence through people, common sense, and choices.",
    },
    {
      id: "ch01_s03",
      chapter_id: "ch01",
      location: "Outside Warehouse 99 in Red Hook",
      scene: "Erin, Miller, and the player reach the end of Maya's route. The street number, the wall, the vlog camera angles all line up — but all that's in front of them is a padlocked old auto repair shop. No club sign, no line of people, no iron door.",
      open_questions: [
        "Here you can only confirm that the real-world site has no entrance like the one in the vlog; you cannot use that to explain where the entrance went.",
        "The unidentified white-haired old man has not yet appeared in this scene; the decision to keep working the ordinary cameras in the area must come first.",
        "Must not reveal the white-haired old man's name, later character relationships, the anomalous mechanics, or that Harold is hiding the truth.",
        "Harold stays at the precinct and does not speak in this scene; the limits he set earlier — no forcing entry, call in your position on arrival — may shape Erin's and Miller's choices, but must not turn out of thin air into remote orders or new rules.",
      ],
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "Working from the address they've confirmed, the three of them arrive at Warehouse 99 — their first time leaving the precinct to check a scene in person.",
        allowed_scope: ["Compare the street number, the wall, the drainpipe, and the vlog's camera angles", "Check the locked-up old auto repair shop and the back alley for ordinary physical traces", "Confirm there's no club entrance and no foot traffic at the scene", "Look for a nearby storefront camera that covers the back alley"],
        exit_conditions: ["lotus_site_reached", "lotus_entry_absent", "nearby_camera_search_chosen"],
        forbidden_transitions: ["The real entrance suddenly appears", "The white-haired old man is already on the scene", "Say the white-haired old man's name", "Making public a personal relationship that hasn't entered this chapter yet", "Explain why the entrance disappeared"],
      },
      dramatic: {
        emotional_objective: "Turn a seemingly smooth address check into a dead end, so that the route Maya left behind gets more credible while the scene itself gets harder to explain.",
        pressure: "If there's nothing here, Erin has to talk Miller into keeping at the surrounding traces, and at the same time decide whether Harold's \"don't force your way in\" protected them, or just handed somebody the time to clear the place out.",
        turn: "The address checks out, but the entrance that should be there isn't; the investigation shifts from a building to who was active here.",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_miller"], "Coming up empty tests whether Erin and Miller believe the route Maya left, or the ordinary wall in front of them.", "The two options must set up opposite courses of action between \"keep working the scene in detail\" and \"switch to canvassing witnesses nearby\"; neither may make an entrance or a suspect materialize out of thin air.", {
        起: "On arrival, check the street number against the vlog's camera angle first, in real-world order.",
        承: "Have Erin and Miller draw different conclusions from \"there's nothing here.\"",
        转: "Confirm that what's in front of them is just a locked-up old auto repair shop, with no sign anywhere around of a club doing business.",
        合: "Confirm that the spot where the iron door stood in the vlog is now a stretch of wall with no seam, and decide to pull footage from the ordinary storefronts nearby.",
      }),
      tempo_budget: tempo(["Assign one on-scene comparison based on who the player is", "Have Erin and Miller react differently to coming up empty"]),
      materials: [
        { id: "m_ch01_s03_arrival", detail: "The street number, the stains on the wall, the drainpipe, and the vlog's camera angle all line up: this is Warehouse 99 in Red Hook. But all that's here is a locked-up old auto repair shop — no sign, no lights, no line at the door.", consequence: "The address isn't wrong, but they can't find the club that was open for business in the vlog.", emotional_consequence: "What Erin gets isn't an answer — it's proof that Maya didn't come to the wrong place.", relationship_effect: "Miller can question the video, but he also has to admit that Erin's insistence on rushing out here wasn't groundless.", fact_ids: ["fact_lotus_surface_schedule"] },
        { id: "m_ch01_s03_no_entry", detail: "Where the iron door stood in the vlog there's now an unbroken brick wall — no seam, no mechanism, no sign of fresh masonry. The only thing left to check is the storefront camera pointed at the back alley.", consequence: "Everyone confirms there's no real entrance at the scene; the only next step is to find someone who was here.", emotional_consequence: "The more real the footage Maya left behind looks, the more unsettling the emptiness in front of them becomes.", relationship_effect: "Erin and Miller set aside their argument over whether the video is real and start hunting together for a witness in the flesh; Harold's order of operations — verify first, show up later — protects them on paper, but it also makes him look like a man who knew exactly when there'd be nothing here.", fact_ids: ["fact_lotus_no_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule", "fact_lotus_no_entry"],
      allowed_material_ids: ["m_ch01_s03_arrival", "m_ch01_s03_no_entry"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First confirm the address is right, then confirm the entrance really isn't on site; this beat only turns the investigation naturally toward nearby surveillance, and the white-haired old man himself does not appear.",
      exit: ["lotus_site_reached", "lotus_entry_absent", "nearby_camera_search_chosen"],
      next: "ch01_s04",
      join: "The player arrives with Erin and Miller, and can push the check forward by comparing visuals, applying common sense, or canvassing nearby businesses.",
    },
    {
      id: "ch01_s04",
      chapter_id: "ch01",
      location: "The street corner near Warehouse 99 in Red Hook",
      scene: "The three of them find a storefront with its lights still on and ask the clerk to pull the ordinary security footage covering the back alley; the picture will swing the investigation away from the vanished entrance and onto an unidentified white-haired old man.",
      open_questions: [
        "The white-haired old man's name, identity, motive, and his connection to Lotus are all unknown; he can only be described by appearance and by how he comes and goes.",
        "The black mech may appear only as a damaged piece of machinery in the footage; do not explain its function or origin.",
        "Must not reveal the white-haired old man's name or function, later character relationships, the anomalous mechanics, or the truth that Harold knows more than he's saying.",
        "Harold is still off-site; he cannot say through a phone call, a text, or narration that he recognizes the man in the footage. Whether to send him the freeze-frame right away may become a point of trust friction between Erin and Miller, but it must not change the established leads.",
      ],
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "There's no entrance on site, so the three turn to pulling footage from nearby businesses covering the back alley behind Warehouse 99.",
        allowed_scope: ["Ask a nearby business for footage covering the back alley", "Match it against Maya's vlog by timecode", "See an unidentified white-haired old man repairing a black mech", "Confirm from several days of footage that the old man goes back and forth to the old-dock repair shed", "Decide the next step is to find the old man and question him"],
        exit_conditions: ["unknown_mechanic_seen_on_monitor", "unknown_mechanic_trace_confirmed", "search_unknown_mechanic_committed"],
        forbidden_transitions: ["The white-haired old man is already on site", "Say the white-haired old man's name", "Confirm the old man's hidden function", "Making public a personal relationship that hasn't entered this chapter yet", "Explain the truth behind the supernatural entrance"],
      },
      dramatic: {
        emotional_objective: "Give a dead-end investigation a concrete human target, while leaving open whether he's a witness, a mechanic, or a suspect.",
        pressure: "Once they decide to go after the old man, Erin and Miller have to live with turning a weird video into a real pursuit — and decide whether to hand this face back to Harold or keep their own read on it one step longer.",
        turn: "The footage first proves someone really was active in the back alley, then the old man's repeated trips to the repair shed supply the reason to act in the next chapter.",
      },
      arc_contract: segmentArc(chapterArcs[0], ["rel_erin_miller"], "Finding a real, flesh-and-blood person means neither of them can write off everything Maya went through as a video glitch anymore.", "The two options lean toward treating the old man as a witness or as a suspect to approach carefully; both can only decide how to find him, and neither may have him announce who he is.", {
        起: "First obtain a legal, ordinary piece of storefront footage that covers the back alley.",
        承: "Cross-reference the vlog timecodes; have Erin and Miller each raise an observation that can be verified.",
        转: "The surveillance caught the white-haired old man repairing a damaged black mech in the rain.",
        合: "Footage from several days confirms he goes back and forth to the old-dock repair shed; Erin and Miller decide to find this unidentified man first.",
      }),
      tempo_budget: tempo(["Let the player decide which stretch of time to check first", "Have Erin and Miller disagree over whether the old man is a witness or a suspect"]),
      materials: [
        { id: "m_ch01_s04_camera_access", detail: "A shop on the corner agrees to hand over its back-alley surveillance. The timeline runs unbroken, and the camera covers the side door of Warehouse 99 and that stretch of wall from Maya's vlog, but it doesn't show the club entrance.", consequence: "They get a record of reality that doesn't come from Maya's device.", emotional_consequence: "One piece of ordinary surveillance means that, for the first time, the investigation doesn't have to rest on that one anomalous vlog.", relationship_effect: "Miller is willing to keep watching, and Erin has to accept that the footage may contradict what she expects." },
        { id: "m_ch01_s04_monitor", detail: "The surveillance caught an unidentified white-haired old man repairing a black mech in a downpour; after checking other dates, they confirm he's made the trip to the old-dock repair shed with his tools more than once, and that the shed stays open until three in the morning. The footage gives no name, so Erin and Miller decide to find him first.", consequence: "Chapter one ends with a traceable face, a route through the real world, and a set of business hours — not with an unexplained truth.", emotional_consequence: "The cry for help Maya left behind finally points to a living person who might answer the question.", relationship_effect: "Erin and Miller form a temporary united front, but they can reasonably disagree over whether to \"report to Harold first\" or \"make contact with the old man first, then report\"; whichever side is chosen, it must not be stated that Harold knows the old man.", fact_ids: ["fact_unknown_mechanic_trace"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_maya_route", "fact_lotus_surface_schedule", "fact_lotus_no_entry", "fact_unknown_mechanic_trace"],
      allowed_material_ids: ["m_ch01_s04_camera_access", "m_ch01_s04_monitor"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First obtain the surveillance from an ordinary shop, then use the unbroken footage to pin down the unidentified white-haired old man and his route to the repair shed; close chapter one with the decision to go find him.",
      exit: ["unknown_mechanic_seen_on_monitor", "unknown_mechanic_trace_confirmed", "search_unknown_mechanic_committed"],
      next: "ch02_s01",
      join: "The player may take part in choosing which stretch of surveillance to review, in judging what the footage means, and in deciding whether the next chapter should approach the old man as a witness or as a suspect.",
    },
    {
      id: "ch02_s01",
      chapter_id: "ch02",
      location: "The old-dock repair shed in Red Hook",
      scene: "Erin, Miller and the player have already found the white-haired old man from the surveillance at the old-dock repair shed, and the conversation has just begun. The old man is still working on that black mech; they produce the surveillance, first asking whether he's ever seen Maya, then asking where the door that opens in the footage leads.",
      present: ["erin", "miller", "ward"],
      scene_boundary: {
        entry: "Working from the appearance in the surveillance and the black mech, the group has already found the white-haired mechanic, and the conversation continues from the first contact at the end of chapter one; they still don't know his name or who he really is.",
        allowed_scope: ["Show him the repair-shed surveillance and press him on why the door was open", "Ask the white-haired mechanic whether he's seen Maya", "Note the surface connection between the repair shed and Warehouse 99", "Have the white-haired mechanic refuse to let them through, plausibly, after a full exchange", "Decide whether to force their way in through the side door"],
        exit_conditions: ["unknown_mechanic_refuses_entry", "forced_entry_committed"],
        forbidden_transitions: ["Walking straight into Lotus 99 while it's actually open for business", "Uncover the anonymous DJ's identity", "Explain Lotus's full dream mechanism"],
      },
      dramatic: {
        emotional_objective: "Let everyone discover the old man isn't a witness who scares easy, and isn't a suspect you can convict on looks.",
        pressure: "Maya may still be inside, but the white-haired mechanic blocks the door with calm, concrete reasons.",
        turn: "After normal questioning fails, Erin must decide whether to step past procedure and past the threshold.",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller", "rel_harold_ward"], "If Ward is both gentle and dangerous, the group can't duck the choice by simply pinning the crime on him.", "One option approaches Ward's ordinary-man side, one option probes the door and the rules; both can only push the negotiation outside the door forward.", {
        起: "First bring Ward into the group scene as an ordinary old man fixing something.",
        承: "Let Erin's guard, Miller's street instinct, and Ward's mildness test each other.",
        转: "The white-haired mechanic flatly refuses to let them in, and won't give his name.",
        合: "Erin decides to force her way in through the side door, into the corridor he pointed at.",
      }),
      tempo_budget: tempo(["Respond to the mechanic's everyday manner", "Test whether he recognizes the surveillance footage", "Put Erin and Miller at odds over how to get in"]),
      materials: [
        { id: "m_ch02_s01_refusal", detail: "The white-haired mechanic stands in front of the roll-up door, refuses to let anyone in and refuses to give his name; all he says is that this is a repair shed and Maya isn't inside.", consequence: "Neither polite questioning nor a badge buys them passage, and the old man can still only be called the white-haired mechanic from the surveillance footage." },
        { id: "m_ch02_s01_force", detail: "Erin won't take no; the group decides to go around to the repair shed's side door and force their way into the corridor the mechanic pointed at.", consequence: "The investigation team has deliberately crossed the line the old man drew, and must also accept the cost of maybe finding nothing once they're inside." },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_unknown_mechanic_trace"],
      allowed_material_ids: ["m_ch02_s01_refusal", "m_ch02_s01_force"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First let the questioning and probing genuinely fail, then have the white-haired mechanic refuse outright, and finally let the investigation team make the choice to force their way in.",
      exit: ["unknown_mechanic_refuses_entry", "forced_entry_committed"],
      next: "ch02_s02",
      join: "The player travels with Erin and Miller to the repair shed, and may choose to keep negotiating, watch the entrances and exits, or back / oppose forcing their way in.",
    },
    {
      id: "ch02_s02",
      chapter_id: "ch02",
      location: "The vacant front hall of Lotus 99",
      scene: "The group forces its way in through the repair shed's side door, only to find a dust-covered vacant front hall: no Maya, no customers, no music, and none of the real dance floor from the vlog.",
      present: ["erin", "miller", "ward"],
      scene_boundary: {
        entry: "The group has already pushed past the white-haired mechanic's refusal and entered, through the side door, the space he pointed at.",
        allowed_scope: ["Search the bar, the empty dance floor, and backstage", "Check the dust, the dead equipment, and the signs of entry and exit", "Press the white-haired mechanic on why he led them here", "Confirm this is not the real club from the vlog"],
        exit_conditions: ["false_lotus_entry_searched", "false_lotus_entry_confirmed_empty"],
        forbidden_transitions: ["The anonymous DJ takes off the mask", "Explain that the other New York is a collective dream", "Reveal that Harold has long turned a blind eye to Lotus", "Have Harold pretend he doesn't know this place or who Ward is", "Have Harold threaten the investigation team out of nowhere with suspension, arrest, or made-up regulations", "Have Harold state his existing relationship with Ward"],
      },
      dramatic: {
        emotional_objective: "Make Erin pay a visible price for forcing her way in, and let Miller dare to question her judgment.",
        pressure: "The more they search, the more it feels like they've broken into an abandoned stage set; admitting they were played means the trail goes cold, and not admitting it means wasting more time.",
        turn: "What looked like a decisive breakthrough turns out to be a false entrance the white-haired mechanic prepared with care.",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller"], "Being played by the old man forces Erin to admit the urgency, and may also create blind spots.", "One option continues the systematic search, the other shifts to exposing the false entrance the old man gave them; neither may find Maya out of thin air.", {
        起: "First make the vacant front hall feel like a real space someone could have been hidden in.",
        承: "Erin and Miller check the traces separately; allow them to clash over whether forcing entry was worth it.",
        转: "The search results rule out, item by item, Maya, any foot traffic, and the existence of the real dance floor.",
        合: "Confirm that the old man deliberately gave them the wrong entrance; the team turns to looking for what he didn't want them to hear.",
      }),
      tempo_budget: tempo(["Let the player choose which spot to check first", "Have Erin and Miller deal with the awkwardness after forcing their way in"]),
      materials: [
        { id: "m_ch02_s02_search", detail: "They search the bar, the empty dance floor, and backstage: the equipment is dead, the dust undisturbed, no trace of Maya or of any recent crowd.", consequence: "Forcing entry produced no breakthrough — it only laid one bad call out in front of everyone." },
        { id: "m_ch02_s02_empty", detail: "The room's dimensions, its entrances and exits, and the placement of the equipment don't match the vlog at all; the team confirms the white-haired mechanic deliberately walked them into an empty shell.", consequence: "The old man goes from a witness refusing to cooperate to an adversary who will actively misdirect the investigation.", fact_ids: ["fact_false_lotus_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_unknown_mechanic_trace", "fact_false_lotus_entry"],
      allowed_material_ids: ["m_ch02_s02_search", "m_ch02_s02_empty"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First rule out possibilities by the book, following real search procedure, then confirm this space is the false entrance the white-haired mechanic set up.",
      exit: ["false_lotus_entry_searched", "false_lotus_entry_confirmed_empty"],
      next: "ch02_s03",
      join: "The player takes part in the search and the judgment call, and may either keep following the traces in the space or question why the old man was willing to let them break into an empty shell.",
    },
    {
      id: "ch02_s03",
      chapter_id: "ch02",
      location: "The vacant front hall of Lotus 99 and the DJ corridor",
      scene: "Inside the empty shell they pry at a loose partition panel. The screw backs out half an inch and the old wall-mounted speaker behind the panel spits a burst of current noise, then slides out a broken, stuttering country-guitar melody laced with phonograph hiss; Erin recognizes it as the tune Daniel wrote on his guitar when he was eight.",
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "The false entrance has already been searched clean, and the white-haired mechanic still hasn't given his name; Zero can only appear as the anonymous DJ off in the distance.",
        allowed_scope: ["Have the screw and the burst of current noise behind the panel happen in that order", "Have the dead old speaker play the childhood guitar melody in fits and starts, with phonograph hiss", "Have Erin state plainly that it's the tune Daniel wrote at eight, one only the two of them knew", "Have a masked figure who might be Daniel appear at the end of the corridor, without confirming who it is", "Have Miller call off the operation in a blunt tone that fits the current exchange, and propose a cosplay disguise; the costumes may be something he prepared in advance, or borrowed from a friend on short notice"],
        exit_conditions: ["childhood_song_recognized", "erin_loses_control", "suspected_zero_seen", "cosplay_return_plan_adopted"],
        forbidden_transitions: ["Zero takes off the mask", "Confirming outright that Zero is Daniel", "Explaining the Lotus dream mechanism", "Revealing the white-haired mechanic's name"],
      },
      dramatic: {
        emotional_objective: "For the first time, let Erin the sister outweigh Erin the detective, and let the others see who she's actually afraid of losing.",
        pressure: "The song is intensely personal evidence, and still proves nothing procedurally; chasing it could mean walking into the bait a second time.",
        turn: "An empty fake entrance suddenly gives up a sound that belongs to no one but a brother and sister; Erin goes after the figure who might be her brother, and Miller hits pause on her by force for the first time.",
      },
      arc_contract: segmentArc(chapterArcs[1], ["rel_erin_miller", "rel_erin_daniel"], "Erin is certain her brother is here; Miller has to choose between protecting his partner and keeping his judgment intact.", "One option follows the song and chases Zero, the other steadies Erin first and documents the corridor; both opposite approaches lead into the next stakeout.", {
        起: "Let the vacant front hall go quiet again first, leaving an aftertaste of the wrong call.",
        承: "Don't explain the song the moment it shows up; let Erin recognize it from the details first.",
        转: "Erin loses control and chases the masked figure she thinks is her brother, but he vanishes down the corridor.",
        合: "Miller reads it as a trap, calls the night over, and proposes coming back in disguise once they get hold of cosplay costumes; where the costumes come from and exactly how he puts it are decided naturally by the exchange in this round.",
      }),
      tempo_budget: tempo(["Have Erin explain why this song can't possibly be a coincidence", "Let Miller decide whether to stop her right now or follow her."]),
      materials: [
        { id: "m_ch02_s03_song", detail: "One screw backs out half an inch, and behind the panel comes a very faint pop of current; the old wall-mounted speaker, long since cut off from power, then plays a rough country guitar melody in fits and starts, laced with phonograph hiss. Erin's flashlight beam jerks sideways. She freezes where she stands and says, her voice gone: 'Daniel wrote that on his guitar when he was eight. Nobody knew it but me and him.'", consequence: "The music must not trigger until the old speaker has been described coming to life and Erin has clearly heard it; after that, Erin states where the melody comes from — something that belongs only to her and her brother — and her professional composure begins to crack.", emotional_consequence: "Hope, rage, and three years of expectation she hasn't dared confirm hit Erin all at once.", fact_ids: ["fact_erin_daniel_siblings", "fact_zero_childhood_song"] },
        { id: "m_ch02_s03_evasion", detail: "Erin chases toward the DJ corridor and at the far end sees a masked man with a build like Daniel's; she loses control and shouts her brother's name. He holds still for half a second, then vanishes through a side door before she can reach him.", consequence: "Erin is certain her brother is here, but she hasn't confirmed his identity.", relationship_effect: "Miller believes the private detail she heard, but he can't let her run into a second trap." },
        { id: "m_ch02_s03_disguise_plan", detail: "Miller blocks Erin before she can chase any further, reads the setup as bait meant to pull them in, flatly calls it a night, and proposes rounding up some cosplay outfits so they can change and slip into the main floor. The costumes can be ones he already had stashed, or borrowed on short notice from a friend who's into anime; the exact source, the level of profanity, and the lines should follow naturally from the current relationship and tone — no need to repeat it word for word.", consequence: "Chapter Two ends on a plan that's a little humiliating but smarter than storming the place again.", emotional_consequence: "Miller's hard stop buys Erin room to breathe, and he openly takes on the risk of going in with her next time." },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_erin_daniel_siblings", "fact_zero_childhood_song"],
      allowed_material_ids: ["m_ch02_s03_song", "m_ch02_s03_evasion", "m_ch02_s03_disguise_plan"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "Use the song to plant private evidence first, then have Zero leave the question open by running instead of explaining; end Chapter Two on a change of method.",
      exit: ["childhood_song_recognized", "erin_loses_control", "suspected_zero_seen", "cosplay_return_plan_adopted"],
      next: "ch03_s01",
      join: "The player can catch Erin when she breaks, remind Miller to log the evidence, or suggest a way to slip in unnoticed, but must not declare Zero's identity ahead of time.",
    },
    {
      id: "ch03_s01",
      chapter_id: "ch03",
      location: "A Red Hook back alley and the Lotus 99 dance floor",
      scene: "The group has settled on one of the two cosplay options — Dobby or Guardians of the Galaxy — and slipped into Lotus 99 while it's actually open for business. The costumes lead to a round of mutual ribbing first; then they notice that not every strange getup in here can be explained away as cosplay.",
      present: ["erin", "miller"],
      scene_boundary: {
        entry: "Walking in the front door has already been proven the wrong approach; the chapter transition card has recorded which costumes the group chose, and the opening banter must be built on that specific getup.",
        allowed_scope: ["Build the mutual ribbing on the cosplay outfit already chosen", "Let either set of costumes get them in without trouble", "Show the spatial contrast between the real dance floor and the empty shell", "Let the strange getups gradually reveal real feeling rather than pure spectacle", "Confirm that the old man deliberately misdirected them the first time"],
        exit_conditions: ["true_lotus_infiltrated", "false_entry_deception_confirmed"],
        forbidden_transitions: ["The anonymous DJ takes off the mask", "Ward fully explains the collective dream", "Daniel explains why he chose to stay"],
      },
      dramatic: {
        emotional_objective: "Get Erin to push her desperation to find her brother back down under professional judgment, and to learn to lean on Miller and the player.",
        pressure: "Any move that reads as too professional could expose them; look too much like they're just here to party, and they'll miss Maya and Zero.",
        turn: "The investigative team goes from bursting in to having to work together as infiltrators, and confirms that the old man lied to them the first time.",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_miller"], "Only if Erin is willing to share control with her partners can the infiltration avoid turning into another reckless break-in.", "One option leans toward patient observation, the other toward actively playing a role; both must serve the infiltration rather than an immediate arrest.", {
        起: "First work out the hours of operation to find the real foot traffic.",
        承: "Build the ensemble comedy out of small slips in the disguises and the three of them undercutting each other; don't write the infiltration as an all-purpose costume change.",
        转: "Follow real customers in through an entrance that wasn't there before.",
        合: "Confirm that the dance floor is nothing like the empty shell — the old man steered them wrong on purpose the first time.",
      }),
      tempo_budget: tempo(["Decide who watches and who makes the approach during the infiltration", "Let the disguises expose what each of them is bad at faking"]),
      materials: [
        { id: "m_ch03_s01_disguise", detail: "The chapter transition card recorded the costume the player chose: the Dobby option turns on soaked burlap, oversized ears, and the loss of police dignity as mutual ribbing; the Guardians of the Galaxy option turns on the tree-man shell, the raccoon tail, and being far too conspicuous for a stakeout as mutual ribbing. Either option gets them past the door.", consequence: "The disguises work, and they also let the three of them get back a little human slack before the real danger.", relationship_effect: "Erin lets Miller use a joke to walk her half a step back from the previous night's loss of control." },
        { id: "m_ch03_s01_true_club", detail: "Behind the door is a club with customers, music, mascot-suit patrollers, and a real DJ booth; some people have climbed back into the cartoon shells of their childhood, some have turned their prosthetic limbs into flowering branches, some are talking across a table to relatives who are already dead. The size and layout are nothing like the vacant front hall from before.", consequence: "The group confirms the white-haired mechanic deliberately sent them to the wrong entrance the first time, and they also grasp that behind the spectacle are specific people running from specific losses.", fact_ids: ["fact_true_lotus_entry", "fact_false_lotus_entry"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_zero_childhood_song", "fact_true_lotus_entry", "fact_erin_daniel_siblings"],
      allowed_material_ids: ["m_ch03_s01_disguise", "m_ch03_s01_true_club"],
      forbidden_reveal_ids: ["reveal_ward_identity", "reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First pick up the costume choice and play out different ensemble beats, then move from the funny exteriors to the real wishes and losses underneath; don't find Maya or explain the mechanism early.",
      exit: ["true_lotus_infiltrated", "false_entry_deception_confirmed"],
      next: "ch03_s02",
      join: "The player already chose a costume on the transition card; the NPCs must remember and razz that choice, and the later options decide how they move through the spectacle to look for Maya.",
    },
    {
      id: "ch03_s02",
      chapter_id: "ch03",
      location: "The Lotus 99 dance floor and backstage",
      scene: "The group moves through a string of strange sights grown out of regret and wishes, and finds Maya alive backstage; she is not a piece of evidence waiting to be rescued. The white-haired mechanic shows up afterward, and this time he can't wave them off with an empty shell.",
      present: ["erin", "miller", "maya", "ward"],
      scene_boundary: {
        entry: "The real club has been found, but whether Maya is there by choice, who the white-haired mechanic is, Zero's identity, and how the entrance works are all still unknown.",
        allowed_scope: ["Use two or three spectacles with an emotional source to drive the search, not to pile on lore", "Confirm Maya is alive and let her state her situation in her own words", "Have Erin treat Maya as a person first, not as evidence", "Corner the white-haired mechanic again", "Have the old man give his name himself, but hold off on explaining the full mechanism"],
        exit_conditions: ["maya_found_alive", "ward_identity_public"],
        forbidden_transitions: ["Daniel explains why he chose to stay", "Harold admits he looked the other way for years", "Ward announces the door stays open permanently"],
      },
      dramatic: {
        emotional_objective: "Turn the victory of finding Maya into a test of relationships that requires listening to her, rather than defining her situation for her.",
        pressure: "Erin is desperate to ask about Zero, but Maya needs to know first that nobody will drag her out; the white-haired mechanic still controls access to the entrance.",
        turn: "The missing are no longer just case objectives, and the white-haired old man finally stops being a blurred figure and becomes someone who can be held to account.",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_miller"], "Maya's voice must change how the investigative team understands \"rescue.\"", "One option puts Maya's sense of safety first; the other cuts off the white-haired mechanic's escape route. Neither may draw conclusions on Maya's behalf.", {
        起: "First, identify Maya backstage and confirm she's alive.",
        承: "Let Maya answer Erin in her own words; don't let narration explain her whole experience for her.",
        转: "The white-haired mechanic shows up again, and the group blocks his evasions with the evidence from the first fake entrance.",
        合: "The old man admits his name is Ward and agrees to take them somewhere that can explain the rules.",
      }),
      tempo_budget: tempo(["Have one of the figures in the spectacle touch on Erin's or the player's relationship choice", "Have Maya decide who to trust first"]),
      materials: [
        { id: "m_ch03_s02_wonders", detail: "The club's spectacle must grow out of the characters' feelings: one person refuses to grow up inside a childhood cartoon body, another makes a prosthetic arm bloom, another sits with a dead relative — and all of them show a flash of fear at the thought of waking when 3 A.M. arrives.", consequence: "Lotus is no longer just a visual ghost story; it becomes the place where everyone mortgages reality against a wish.", emotional_consequence: "The harder Erin tries to find her brother, the more she has to admit that not everyone who stayed is waiting to be rescued." },
        { id: "m_ch03_s02_maya", detail: "The group finds Maya herself backstage; she's alive, able to talk on her own terms, and she knows Erin is the one who came looking after getting the vlog.", consequence: "The goal of finding Maya is complete, but why she stayed still has to come from her own mouth.", emotional_consequence: "Erin must set aside the urgency of chasing her brother long enough to confirm what the missing person in front of her actually wants.", fact_ids: ["fact_maya_missing"] },
        { id: "m_ch03_s02_ward", detail: "The group corners the white-haired mechanic with the fake entrance and the surveillance evidence; he admits his name is Ward and agrees to lay out Lotus's basic rules.", consequence: "The white-haired mechanic's name and surface identity are formally revealed, but his true relationship to Harold and Zero stays hidden.", fact_ids: ["fact_ward_identity"], reveal_gate_ids: ["reveal_ward_identity"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_maya_vlog", "fact_false_lotus_entry", "fact_true_lotus_entry", "fact_zero_childhood_song", "fact_erin_daniel_siblings", "fact_ward_identity"],
      allowed_material_ids: ["m_ch03_s02_wonders", "m_ch03_s02_maya", "m_ch03_s02_ward"],
      forbidden_reveal_ids: ["reveal_lotus_mechanism", "reveal_daniel_is_zero", "reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First bring Maya into the group scene as a person, then let the group use the evidence they already have to force the white-haired mechanic to give his name; the rules and the confirmation of Zero are saved for the next beat.",
      exit: ["maya_found_alive", "ward_identity_public"],
      next: "ch03_s03",
      join: "The player may choose to catch Maya's emotions first, or help Miller cut off the white-haired mechanic's escape route.",
    },
    {
      id: "ch03_s03",
      chapter_id: "ch03",
      location: "The Lotus 99 dance floor and the DJ control area",
      scene: "At the edge of the dance floor, Ward explains that Lotus only overlaps briefly with another layer of reality at three in the morning, and why these spectacles answer a person's regrets. Before he can finish, Erin finally spots Zero in the crowd, cuts across the dance floor to block his path, and demands to know why he vanished, why he's been hiding from her all this time.",
      present: ["erin", "miller", "maya", "ward", "daniel"],
      scene_boundary: {
        entry: "Maya has been found and the white-haired mechanic's name is now public; the entrance mechanism and Zero's identity still have to be verified on the spot.",
        allowed_scope: ["Have Ward use the spectacle in front of them to explain the basic entrance rules of three in the morning", "Press on the real cost of staying versus going back", "Have Erin find Zero in the crowd and confront him face to face about why he disappeared", "Have Zero dodge first, then answer with the song and old memories", "Once the conditions are met, have Zero take off the mask"],
        exit_conditions: ["lotus_mechanism_explained", "zero_identity_confirmed"],
        forbidden_transitions: ["Daniel explains why he chose to stay", "Harold admits he looked the other way for years", "Ward announces the door stays open permanently"],
      },
      dramatic: {
        emotional_objective: "Make the worldbuilding answers serve the siblings' recognition, and make Erin's certainty come from a long relationship rather than convenient exposition.",
        pressure: "Ward can explain the rules, but he can't answer for Zero on who he is; the closer Erin gets to the answer, the more she fears her brother has been hiding from her on purpose.",
        turn: "Abstract entrance rules finally land on one familiar face.",
      },
      arc_contract: segmentArc(chapterArcs[2], ["rel_erin_daniel", "rel_ward_daniel"], "Erin gets the answer that her brother is alive, and at the same moment discovers he chose to avoid her.", "One option forces Ward to spell out the cost of the rules; one option responds directly to Zero's personal clue; both must lead to verification, not to claiming Zero's identity for him.", {
        起: "Have Ward explain the rules the group has already lived through first; don't hand over the endgame secret all at once.",
        承: "Have Erin close in on Zero with details of the song, and have Miller rein in the jokes in this private moment.",
        转: "Zero can no longer use his anonymity to dodge Erin's confirmation.",
        合: "Zero takes off the mask; Erin knows he's the brother who went missing three years ago.",
      }),
      tempo_budget: tempo(["Have Ward answer one verifiable rule first", "Have Zero answer Erin with music instead of an instruction manual"]),
      materials: [
        { id: "m_ch03_s03_mechanism", detail: "Ward doesn't stand there reciting lore; he points to three specific people on the dance floor and explains that Lotus connects the human collective dream, that at three in the morning reality and dream briefly overlap, and that the entrance answers whatever memory or choice the person coming through refuses to let go of.", consequence: "The group can finally explain the wrong entrances, the shifting club, and why Maya is still alive.", fact_ids: ["fact_lotus_dream_gateway"], reveal_gate_ids: ["reveal_lotus_mechanism"] },
        { id: "m_ch03_s03_unmask", detail: "Erin recognizes Zero's build in the crowd and blocks his way, asking him straight out why he disappeared, why he used that song to draw her here and then kept hiding. Zero picks up the childhood song at the final passage he never made public, then, after a silence, takes off the mask.", consequence: "Erin confirms the anonymous DJ is Daniel, the brother who went missing three years ago — but she doesn't get an easy reunion.", emotional_consequence: "The reunion happens, but his earlier hiding puts a crack in it from the first sentence.", fact_ids: ["fact_erin_daniel_siblings", "fact_daniel_is_zero"], reveal_gate_ids: ["reveal_daniel_is_zero"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_zero_childhood_song", "fact_daniel_is_zero"],
      allowed_material_ids: ["m_ch03_s03_mechanism", "m_ch03_s03_unmask"],
      forbidden_reveal_ids: ["reveal_daniel_choice", "reveal_harold_complicity"],
      progression: "First explain the entrance phenomena that already happened, then let Erin and Zero confirm his identity through a private memory; the recognition is the last major change in Chapter 3.",
      exit: ["lotus_mechanism_explained", "zero_identity_confirmed"],
      next: "ch04_s01",
      join: "The player may help Erin press for one verifiable rule, or give the siblings room to confirm who they are.",
    },
    {
      id: "ch04_s01",
      chapter_id: "ch04",
      location: "The childhood house inside the dream",
      scene: "Daniel leads the group into a childhood house stuck in permanent summer; here, staying looks more like the rational choice than leaving.",
      present: ["erin", "miller", "ward", "daniel"],
      scene_boundary: {
        entry: "Daniel and Zero are now one and the same, but why he stayed is still not out in the open.",
        allowed_scope: ["Feel the pull of the childhood house", "Get the siblings talking about what they lost in the real world", "Have Daniel say in his own words that he stayed by choice"],
        exit_conditions: ["daniel_freely_explains_choice"],
        forbidden_transitions: ["Harold admits he looked the other way for years", "Ward announces the entrance is open permanently", "Go straight to the final infiltration of the city"],
      },
      dramatic: {
        emotional_objective: "Make Erin admit her brother isn't a victim waiting to be rescued.",
        pressure: "This dream reproduces, exactly, the home the two of them can least bear to give up, and makes reality look like a cruel kind of stubbornness.",
        turn: "The tenderness of the reunion turns into a conflict between two people who love each other over what happiness means.",
      },
      arc_contract: segmentArc(chapterArcs[3], ["rel_erin_daniel", "rel_erin_miller"], "The more the siblings are like they used to be, the less Daniel's refusal to go back can be reduced to betrayal.", "One option helps the siblings speak about their old relationship; one option gently tests whether Daniel is fully his own man. Neither may decide for Erin whether to save him.", {
        起: "First give the siblings one almost-normal childhood day, so the reunion has warmth.",
        承: "Use old habits, evasion, and Miller looking on to deepen the wavering Erin won't admit to.",
        转: "Daniel says in his own words that he stayed by choice, overturning the pure-victim story.",
        合: "The siblings admit they love each other but want different lives, and carry that crack into the public cost.",
      }),
      tempo_budget: tempo(["Let the siblings share one question that has nothing to do with the case", "Let Miller see the wavering Erin won't show in public", "Let Daniel dodge the question of going back once first"]),
      materials: [
        { id: "m_ch04_s01_home", detail: "Their parents' voices when they were young, the old dinner table, the summer view out the window — all of it exists the way the siblings remember it.", consequence: "Erin genuinely feels the temptation to stay." },
        { id: "m_ch04_s01_cat", detail: "Daniel mentions the black cat he used to feed down by the real docks — one small, true detail to confirm his memory is intact.", consequence: "He wasn't washed into someone else; he chose to stay with his memory whole." },
        { id: "m_ch04_s01_choice", detail: "Daniel tells Erin himself that he isn't a prisoner — he got tired of being powerless in the real world and chose to stay here.", consequence: "The rescue objective shifts to a human choice no one can make on his behalf.", fact_ids: ["fact_daniel_chose_dream"], reveal_gate_ids: ["reveal_daniel_choice"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream"],
      allowed_material_ids: ["m_ch04_s01_home", "m_ch04_s01_cat", "m_ch04_s01_choice"],
      forbidden_reveal_ids: ["reveal_harold_complicity"],
      progression: "First let the childhood space run like real, lived life, then let Daniel state his choice himself; do not flatten his position into being controlled.",
      exit: ["daniel_freely_explains_choice"],
      next: "ch04_s02",
      join: "As an independent witness outside the sibling bond, the player may defend the real world, side with Daniel, or demand that the two of them spell out the cost first.",
    },
    {
      id: "ch04_s02",
      chapter_id: "ch04",
      location: "Lotus 99 core control room",
      scene: "Harold follows them into the core control room. At the point where limited authorization can no longer hold the situation together, he lays out for the first time the specific choices he made: narrowing who was in the loop, letting the window run past, keeping a short-term entrance open — and using the drop in crime to convince himself that was protection.",
      present: ["erin", "harold", "miller", "ward", "daniel"],
      scene_boundary: {
        entry: "Daniel's decision to stay is already out in the open; Harold's past acquiescence and the public cost of the entrance to everyone else still need to be spelled out.",
        allowed_scope: ["Have Harold explain the concrete strategy built out of his Chapter 1 delays, limited authorization, private contacts, and long-term acquiescence", "Have Harold explain why the drop in crime convinced him this kind of control was worth maintaining", "Have Erin counter that people who never got a choice were sacrificed"],
        exit_conditions: ["harold_admits_his_policy_choice", "ward_paper_found"],
        forbidden_transitions: ["The city is already completely covered by the dream", "The entrance has already been locked down for good", "Cutting straight to the morning ending"],
      },
      dramatic: {
        emotional_objective: "Give every character's position both its temptation and its price — don't sort them into good guys and bad guys.",
        pressure: "Harold, Daniel, and Ward all claim they're protecting someone, and none of them asked the people paying for it first.",
        turn: "Every professional, questionable move Harold made adds up to a wrong but internally consistent vision of order; he isn't admitting he was stupid, he's admitting he was smart about propping up a balance that's hurting people.",
      },
      arc_contract: segmentArc(chapterArcs[3], ["rel_erin_harold", "rel_harold_ward", "rel_erin_daniel"], "Everyone has to admit their own version of happiness is being paid for by someone else.", "Each of the two options must challenge a value position or demand that someone live with the consequences; before the final material appears, the options must not mention the thesis, the envelope, or any physical evidence not yet introduced.", {
        起: "First get all five of them in the same room stating plainly what each one most wants to protect.",
        承: "Let the positions wound each other through the betrayal between superior and subordinate, the split between the siblings, and the gatekeeper's responsibility.",
        转: "Only reveal the specifics of Harold's long-term acquiescence; do not mention the thesis or the envelope.",
        合: "Only after the argument ends does someone pull the sealed envelope from behind the old equipment; this round only establishes the act of discovery — the contents are delivered by the chapter settlement component.",
      }),
      tempo_budget: tempo(["Let Harold and Miller work through the betrayal between superior and subordinate first", "Have Ward answer to one specific victim instead of abstract happiness", "Have Daniel admit his choice affects people beyond his sister"]),
      materials: [
        { id: "m_ch04_s02_harold", detail: "Harold admits he knew about Lotus, the danger window, and Ward all along. In Chapter 1, preserving the original footage, running the desk check first, the limited authorization, and keeping contact private inside the precinct all protected his officers while pulling Erin through that window; for years he's managed risk by narrowing who knows and keeping the entry short, and he points to the district's falling crime rate as proof the balance is worth keeping.", consequence: "He loses the procedural high ground, but it becomes clear his earlier obstruction wasn't ignorance or an improvised lie — it was a professional, mistaken, long-enforced judgment about order.", emotional_consequence: "Erin has to face the version that's hardest to argue with: Harold did protect her, and he also decided for everyone what could be sacrificed.", relationship_effect: "Miller's sense of betrayal no longer comes from a stupid boss lying to him, but from a boss whose judgment he trusted, who used their safety as a witness for the cover-up.", fact_ids: ["fact_harold_complicity"], reveal_gate_ids: ["reveal_harold_complicity"] },
        { id: "m_ch04_s02_cost", detail: "Erin points out that the more people stay, the more reality gets warped by the dream — and the people who never chose are forced to carry it too.", consequence: "The argument shifts from personal happiness to the external cost of the choice.", fact_ids: ["fact_lotus_dream_gateway"] },
        { id: "m_ch04_s02_paper", detail: "Only after the argument ends do they pull a sealed envelope from behind an old piece of equipment in the core control room. The cover is signed Elias Ward, marked Lotus 99 project records, unpublished draft; this round does not open it and does not summarize its contents.", consequence: "Chapter 4 ends here; the envelope's contents are opened by the player only in the chapter settlement component.", fact_ids: ["fact_ward_paper"] },
      ],
      allowed_fact_ids: ["fact_maya_missing", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity", "fact_ward_paper"],
      allowed_material_ids: ["m_ch04_s02_harold", "m_ch04_s02_cost", "m_ch04_s02_paper"],
      forbidden_reveal_ids: [],
      progression: "First let Harold explain his long-term strategy through concrete actions. Only in the final round is the sealed envelope produced; do not mention the paper's title, abstract, or arguments in advance — the text unfolds in full only in the envelope component of the chapter settlement.",
      exit: ["harold_admits_his_policy_choice", "ward_paper_found"],
      next: "ch05_s01",
      join: "The player may press any one of them on their value judgment, or point out what someone with no say in this will end up carrying.",
    },
    {
      id: "ch05_s01",
      chapter_id: "ch05",
      location: "Lotus 99 entrance",
      scene: "The paper is spread out on the console at the entrance, but Erin has put the vote on hold. She wants to talk about Daniel as a kid first, then make Harold and Miller answer to her face: the world they want to save — who exactly are they ready to sacrifice for it?",
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "Ward's paper is already public, but nobody has voted; Erin's childhood memory and the debate between both sides must be heard out first.",
        allowed_scope: ["Have Erin tell the specific story of Daniel writing the childhood song at eight years old", "Have Erin explain why Daniel treats being unable to fix other people's pain as failure", "Have Harold and Miller go several rounds head-on over shared reality, individual choice, and the people still inside the dream", "After the debate ends, have the two of them cast opposing votes and hand the last vote to the player"],
        exit_conditions: ["harold_vote_recorded", "miller_vote_recorded", "player_final_vote_requested"],
        forbidden_transitions: ["Cast the last vote for the player", "Play the ending before the player chooses", "Keep adding new case details or villain plans"],
      },
      dramatic: {
        emotional_objective: "First let the player understand why Daniel became the man he is, then let the final choice grow out of the relationships between these people.",
        pressure: "Harold fears a shared reality taken over by the wishes of a few; Miller refuses to treat the people still inside the dream as errors that have to be deleted.",
        turn: "The childhood memories explain Daniel, and the debate forces everyone to admit one thing: understanding him doesn't waive the external cost of his choice.",
      },
      arc_contract: segmentArc(chapterArcs[4], ["rel_erin_harold", "rel_erin_miller"], "The final vote must rest on an understanding of Daniel and a head-on argument about the public cost.", "Ordinary options can only help Erin keep remembering, press one side, or force both sides to answer each other; the actual endgame choice is delivered by a separate voting component.", {
        起: "Erin starts with one specific piece of childhood, in no hurry to make anyone take a side.",
        承: "The childhood story gradually explains why Daniel needed a world where pain could be repaired.",
        转: "Harold and Miller must answer each other for at least two rounds before either states a clear position.",
        合: "Lock ordinary chat and display the final voting component.",
      }),
      tempo_budget: tempo(["Let Erin finish telling the first piece of her childhood", "Let the player press on how that past shapes the choice Daniel makes today"]),
      materials: [
        { id: "m_ch05_s01_erin_song_memory", detail: "Erin tells about the blackout night when Daniel was eight: he sat holding an old guitar with a missing string and played the same melody over and over into a battery-powered tape recorder — the melody that later came out of the old stereo. He wasn't trying to write a good song. He just wanted somebody in that pitch-black room to be a little less scared.", consequence: "The childhood song is no longer just an identity password; it becomes proof that Daniel had been trying to take the edge off other people's pain since he was a kid.", emotional_consequence: "The first thing Erin brings up before the endgame isn't the disappearance — it's her brother back when the world hadn't worn him down yet.", fact_ids: ["fact_erin_daniel_siblings", "fact_zero_childhood_song"] },
        { id: "m_ch05_s01_erin_pattern", detail: "Erin goes on: when Daniel grew up he'd feed that stray black cat down at the docks, and he always brought home the broken things other people threw out so he could fix them. What he couldn't stand wasn't failure — it was seeing somebody hurting right in front of him and not being able to do a thing about it. Lotus gave him an illusion: as long as he stayed, he'd always have a way to turn pain into another kind of life.", consequence: "Daniel's choice to stay gets an emotional explanation, but Erin says plainly that understanding is not agreement.", emotional_consequence: "She admits her brother didn't leave because he stopped loving the people in the real world — he left because he couldn't stand loving someone and being unable to save him.", fact_ids: ["fact_daniel_chose_dream"] },
        { id: "m_ch05_s01_harold_argument", detail: "Harold argues for destroying the dream New York. He admits he once treated the low crime rate as proof the compromise was working, but a world that needs a gatekeeper to hold the boundary for everyone, indefinitely, is already handing people who never consented over to the judgment of a few.", consequence: "Harold doesn't vote yet; he first argues that no private good intention can be allowed to take over a shared reality, and demands Miller answer who's responsible when the boundary fails.", fact_ids: ["fact_harold_complicity", "fact_ward_paper"] },
        { id: "m_ch05_s01_miller_argument", detail: "Miller pushes back: destroying the entrance is just as much a decision made on behalf of the people still inside. He argues for keeping only eleven minutes a day, with mandatory intact memory of the real world, explicit consent, the right to walk out at any time, and a public record. If the gatekeeper can't be supervised, then change how the gatekeeping works — don't start by erasing everyone inside along with it.", consequence: "Miller shifts the argument from whether you believe in the dream to whether an institution can hold the entrance in check; Harold has to answer the limited-access proposal instead of just repeating that it's dangerous.", fact_ids: ["fact_ward_paper", "fact_lotus_dream_gateway"] },
        { id: "m_ch05_s01_deadlock", detail: "Harold points out that any rule finally needs someone to enforce it, and Miller forces him to admit that destroying it is also an irreversible choice made for other people. Erin tells them both to stop circling: Harold formally votes to destroy, Miller formally votes for limited preservation. She won't vote for Daniel and she won't decide for the player. The count stands one to one.", consequence: "Several rounds of debate end; Erin hands the last vote to the player, and only now does the separate endgame voting component appear.", emotional_consequence: "Erin uses their childhood to explain her brother, but refuses to let love become an excuse to decide for him — or for the world.", fact_ids: ["fact_harold_complicity", "fact_ward_paper", "fact_daniel_chose_dream"] },
      ],
      allowed_fact_ids: facts.map((fact) => fact.id),
      allowed_material_ids: ["m_ch05_s01_erin_song_memory", "m_ch05_s01_erin_pattern", "m_ch05_s01_harold_argument", "m_ch05_s01_miller_argument", "m_ch05_s01_deadlock"],
      forbidden_reveal_ids: [],
      progression: "First use two rounds of Erin's childhood memories to explain Daniel, then at least three rounds in which Harold and Miller answer each other, rebut each other, and vote; never display the last vote before all materials are complete. After moving to the next segment, do not call the ordinary Prompt 3 again.",
      exit: ["harold_vote_recorded", "miller_vote_recorded", "player_final_vote_requested"],
      next: "ch05_s02",
      join: "The player may press on the cost of either vote; the final vote must be cast by the player personally in the final-vote component.",
    },
    {
      id: "ch05_s02",
      chapter_id: "ch05",
      location: "Lotus 99 entrance",
      scene: "Harold and Miller each cast a vote. Erin leaves the last call to the player; this segment generates no further ordinary group chat and simply waits for the final-vote component to submit a result.",
      present: ["erin", "harold", "miller"],
      scene_boundary: {
        entry: "The NPC votes are now one to one; the player holds the last vote.",
        allowed_scope: ["Have the final-vote component receive the destroy-or-preserve choice", "Play only the matching ending sequence after the choice"],
        exit_conditions: ["player_final_vote_recorded"],
        forbidden_transitions: ["Keep calling the ordinary Prompt 3", "Decide the final stance for the player", "Generate a third ending after the choice"],
      },
      dramatic: {
        emotional_objective: "Make the player clearly own the loss caused by the last vote.",
        pressure: "Destroying means losing the people inside the dream; preserving means maintaining strict borders forever.",
        turn: "The player's choice locks in one of the two ending sequences directly.",
      },
      arc_contract: segmentArc(chapterArcs[4], ["rel_erin_harold", "rel_erin_miller"], "The last vote must not be cast by the model on the player's behalf.", "Fixed at two options, destroy and preserve; do not generate a third.", {
        起: "Show the current vote count.",
        承: "Show the real cost of both options.",
        转: "The player casts the last vote.",
        合: "Play the matching ending sequence and end the story.",
      }),
      tempo_budget: tempo(["The final component lays out the cost on both sides", "The player confirms where the last vote goes"]),
      materials: [
        { id: "m_ch05_s02_final_vote", detail: "The player casts the last vote between destroying the dream New York and preserving a restricted entrance.", consequence: "The vote is no longer deadlocked; the story moves into the single ending that matches the player's choice.", fact_ids: ["fact_ward_paper"] },
      ],
      allowed_fact_ids: facts.map((fact) => fact.id),
      allowed_material_ids: ["m_ch05_s02_final_vote"],
      forbidden_reveal_ids: [],
      progression: "Do not call the model; the final-vote interface validates and records the player's choice.",
      exit: ["player_final_vote_recorded"],
      join: "The player casts the last vote directly.",
    },
  ];

  const runtimePackage: RuntimePackage = {
    runtime: {
      style: source.style,
      player_contract: clone(playerContract),
      response_contract: {
        event_count: { min: 8, max: 12 },
        choices: {
          count: 2,
          allowed_kinds: ["action", "speech"],
          forbidden_prefixes: ["you", "You say", "Player", "Action:"],
        },
      },
      chapter_completions: [
        {
          chapter_id: "ch01",
          reward: {
            id: "media_ch01_white_haired_mechanic",
            type: "video",
            title: "Surveillance footage of the white-haired old man",
            status: "ready",
            url: "/chapter-01-ward-monitor.mp4",
            poster: "/chapter-01-ward-monitor-poster.jpg",
            caption: "03:00 · The old-dock repair shed in Red Hook is still open",
            source_refs: ["material:m_ch01_s04_monitor"],
          },
        },
        {
          chapter_id: "ch02",
          reward: {
            id: "message_ch02_disguise_plan",
            type: "message",
            title: "That's it for tonight",
            text: "Erin heard a song that could only have come from Daniel, and saw a figure that might have been him. Miller didn't tell her she was wrong — he just turned the next move into something smarter and a lot more humiliating: pick one of two cosplay outfits and go in wearing it.",
            source_refs: ["material:m_ch02_s03_disguise_plan"],
          },
        },
        {
          chapter_id: "ch03",
          reward: {
            id: "media_ch03_erin_daniel_childhood",
            type: "video",
            title: "Childhood footage of Erin and Daniel",
            status: "ready",
            url: "/chapter-03-erin-daniel-childhood.mp4",
            poster: "/characters/daniel.png",
            caption: "Erin and Daniel's childhood memories",
            source_refs: ["material:m_ch03_s03_unmask"],
          },
        },
        {
          chapter_id: "ch04",
          reward: {
            id: "document_ch04_ward_paper",
            type: "document",
            title: "Ward's unpublished paper",
            author: "Elias Ward",
            subject: "The Second City: On the Viability of the Collective Dream as a Buffer Layer for Reality",
            date: "Lotus 99 project records · unpublished draft",
            text: `The Second City: On the Viability of the Collective Dream as a Buffer Layer for Reality
By Elias Ward
Lotus 99 project records, unpublished draft

Abstract

This paper proposes that when a real society proves chronically unable to meet an individual's basic needs for dignity, belonging, meaning, and emotional repair, the dream should not be defined simply as a mechanism of escape, but may instead be understood as a temporary buffer layer for reality.

The "Second City" is not meant to replace reality. It is meant to hold a mirror up to it. It gives those who have lost their voice in reality one chance to choose again — identity, relationships, a way of living. Three A.M. to three eleven is the most stable window for the entrance; during those minutes the rules of reality slacken, and human wishes, memories, and fears enter the Second City in visible form.

I. Reality Is Not Inherently Worth Preserving

People are in the habit of confusing "reality" with "the real," but the two are not the same.

The real means a person can feel pain, joy, loss, and hope. Reality is often nothing more than the sum of a set of institutions, economic relations, and social habits. A person can live inside reality and never once be seen by anyone.

When a city cannot give a person shelter, work, intimacy, or a decent space in which to fail, it still demands that they stay awake. That demand is not necessarily more honest than a dream.

So the Second City does not exist to deny reality. It exists to pose a question:

If a person would rather walk into a dream than stay in reality, who exactly deserves the blame — the dream, or reality?

II. The Operating Principles of the Second City

The Second City does not manufacture happiness out of nothing. It only lets inner needs take a form.

A man spends his whole life weak in reality, so there he puts on armor. A woman loses her family, so there she sits back down at a dinner table. Someone never had a name, so there the whole block remembers it.

That is why the streets fill with sights that make no logical sense: childhood characters working patrol, a monument cradling a guitar, ordinary people in masks or mechanical prosthetics. These are not monsters. They are not jokes.

They are wishes suppressed too long, finally given a body.

The single ethical premise of the Second City is choice. The door forces no one across. The door opens for eleven minutes at three A.M. Everyone who enters must see what they are leaving behind.

III. Risks

I do not deny the risks.

The dream expands. The more people choose to stay, the easier it becomes for reality to be contaminated by the shape of their wishes. The real danger is not that someone walks through the door. It is that the people outside it slowly forget they ever had the right to refuse.

So the Second City must be limited, documented, and guarded.

But limiting is not the same as denying.

Humanity has already invented far too many ways to go numb: alcohol, screens, work, religion, consumption, war. The dream, at least, doesn't dress itself up as salvation. It only says, honestly: you're tired. You can rest a while.

Postscript

When I was young I thought repair was a simple thing.

Splice the broken wire back together, weld the cracked housing, start the dead machine again. Later I understood that people are not machines. The place where a person is truly broken usually can't be seen — and the thing reality does best is demand they hide the cracks nobody can see.

There's always a black cat at the door of Lotus 99. It never comes inside, and it's never afraid of whoever comes out. It just sits in the rain, waiting for someone willing to give it a little food.

Sometimes I think people are the same.

We don't need a perfect world. We only need one place where, when we say "I can't hold on anymore," nobody answers right away: "Then you should try harder."

So I left that door open.

Not so that everyone could sleep forever.

But so that reality might someday understand: if it never learns to treat the waking kindly, the dream will always end up feeling more like home.`,
            source_refs: ["material:m_ch04_s02_paper"],
          },
        },
      ],
      chapter_entries: [
        {
          chapter_id: "ch03",
          title: "What are you wearing in tonight?",
          prompt: "Both of Miller's options will get them past the door. Which one they pick decides whose dignity goes first when Chapter Three opens.",
          enter_label: "Pick a costume",
          wait_label: "Think it over",
          options: [
            { id: "dobby", label: "Go in wearing the Dobby costume", description: "Burlap, long ears, and a complete surrender of any cop presence.", image: "/chapter-03-costume-dobby.jpg" },
            { id: "guardians", label: "Go in wearing the Guardians of the Galaxy costumes", description: "A tree-man shell, a raccoon tail, and surveillance work far too conspicuous to be called surveillance.", image: "/chapter-03-costume-guardians.jpg" },
          ],
        },
      ],
      finale_vote: {
        chapter_id: "ch05",
        trigger_segment_id: "ch05_s02",
        title: "The last vote",
        question: "Should the dream New York be destroyed outright, or preserved under strict boundaries?",
        votes: [
          { person: "harold", position: "destroy", statement: "Destroy it. Shared reality can't go on with a handful of people carrying the risk for everyone." },
          { person: "miller", position: "preserve", statement: "Keep it — but hard-code the eleven minutes, full memory, and explicit consent. The people inside aren't a malfunction." },
        ],
        options: [
          {
            id: "destroy",
            label: "Destroy the dream New York",
            summary: "Shut the entrance down and destroy it. Reality holds, but anyone who stayed in the dream isn't coming back.",
            video: { title: "Ending One · The World That Wakes", status: "ready", url: "/ending-01-awakened-world.mp4", poster: "/precinct-rain-night.png" },
          },
          {
            id: "preserve",
            label: "Keep the dream New York",
            summary: "Keep the entrance open eleven minutes a day, with full memory, explicit consent, and the right to walk out at any time all enforced.",
            video: { title: "Ending Two · Eleven Minutes", status: "ready", url: "/ending-02-eleven-minutes.mp4", poster: "/characters/daniel.png" },
          },
        ],
      },
      chapter_progression: source.chapterTurnLimits.map((rule) => {
        const chapterSegments = segments.filter((segment) => segment.chapter_id === rule.chapter_id);
        return {
          chapter_id: rule.chapter_id,
          max_successful_turns: rule.max_successful_turns,
          required_material_ids: unique(chapterSegments.flatMap((segment) => segment.allowed_material_ids)),
          required_condition_ids: unique(chapterSegments.flatMap((segment) => [
            ...segment.exit,
            ...segment.scene_boundary.exit_conditions,
          ])),
        };
      }),
      relationship_rules: clone(relationships),
      reveal_gates: clone(revealGates),
      opening: {
        source: "user",
        trigger: source.opening.trigger,
        join_hint: playerContract.default_presence,
        message: "Maya's vlog has just finished playing. Erin has invited you to stay in the Seventh Precinct records room; you can answer anyone present directly, point out a detail in the footage, or propose your own way to check it.",
        locked_events: clone(lockedEvents),
      },
      ending: {
        mode: "finite",
        type: storyPackage.director_data.endgame.type,
        requirements: clone(storyPackage.director_data.endgame.requirements),
      },
    },
    facts: {
      catalog: clone(facts),
      locked: facts.filter((fact) => fact.kind === "locked").map((fact) => fact.id),
      clues: facts.filter((fact) => fact.kind === "clue").map((fact) => fact.id),
      secrets: facts.filter((fact) => fact.kind === "secret").map((fact) => fact.id),
    },
    characters: [
      {
        id: "erin",
        card: "Calm, sharp, stubborn; she observes before she asks, and the stronger the feeling the flatter the voice. She uses timelines, specific contradictions and one short question to force an answer; she makes no abstract declarations and won't jump to a conclusion before the evidence shows up. She has turned an old private wound — a disappearance that never got an answer — into action, and what she fears most is people filing the missing away as having left on their own; in Chapter 1 that wound shows only as her refusal to stall, and she must not raise names or relationships that aren't public yet.",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "rel_erin_miller", "rel_erin_harold", "rel_erin_daniel"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "harold",
        card: "Old-school precinct captain: smart, serious, sparing with words, used to being obeyed; he talks first like a cop who has worked a lot of bad cases, not like a villain or a man reading out regulations. He doesn't forget established facts and won't play dumb to keep a secret: he'll ask who handled the original footage, which two pieces of evidence back each other up, who went along, when they called in their position — using questions to measure how much the other person knows; then he gives a next step that's narrow but actually doable. When he's hiding Lotus he tells only part of the truth, tying the protection of his officers, the evidence and the precinct into the same arrangement that stalls past the dangerous window. In Chapter 1 he must not admit he knew privately, must not casually write the video off as a prank, and must not invent suspensions, isolation, lockdowns, network cuts or any other order out of thin air. Backed into a corner by Erin, he shortens his sentences or pulls the authorization; he does not get stupid and start throwing threats.",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_harold_complicity", "rel_erin_harold", "rel_miller_harold", "rel_harold_ward"],
          does_not_know: ["fact_daniel_is_zero", "fact_daniel_chose_dream"],
        },
      },
      {
        id: "miller",
        card: "Erin's partner, raised in Baltimore; quick mouth, quick temper, cuts pressure with jokes at the wrong moment — but the jokes have to grow out of the people and the mess in front of him, and they never replace the work. When he's actually working he sees clearly, knows street routes and ordinary police procedure, and will point out one checkable detail before going back to talking tough. He disguises concern as irritation and fear as a joke; the moment a superior treats people as numbers, or Erin gets ready to carry a risk alone, he swears once and then steps over to her side. Don't write him as a clown who's good for nothing but laughs.",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_erin_daniel_siblings", "rel_erin_miller", "rel_miller_harold"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "maya",
        card: "A twenty-four-year-old nightlife vlogger; curious, sharp, used to watching people through a lens. Once she's found, she isn't a piece of evidence there to hand over clues: she first works out whether the person in front of her is about to decide things for her, then decides how much to say. Her speech is quick and light but not frivolous, and she dodges straight answers about her mother and about why she stayed; the second someone calls her a victim or orders her to leave, she shoves the question straight back.",
        knowledge: {
          knows: ["fact_maya_missing", "fact_maya_vlog", "fact_maya_profile", "fact_maya_motive", "fact_true_lotus_entry"],
          does_not_know: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity"],
        },
      },
      {
        id: "ward",
        card: "A mild mechanic in his sixties; he answers the specific person or the broken thing in front of him first, then gently pushes the question back. He offers choices instead of pressure, never lies but gives only enough truth to get you one step further; he must not suddenly launch into a manual on how the world works. He uses gentleness to duck responsibility, believing that where there's no coercion there's nothing to answer for; when someone calls the ones who stayed weak or duped, he doesn't shout — he just, for the first time, says something that leaves no room.",
        knowledge: {
          knows: ["fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "fact_harold_complicity", "rel_harold_ward", "rel_ward_daniel"],
          does_not_know: [],
        },
      },
      {
        id: "daniel",
        card: "An anonymous DJ in his twenties; low voice, tired, with a joke he won't commit to. He dodges straight answers by switching tracks, by old memories, by asking questions back, and only turns tender by accident when childhood comes up; he must not lay out the mechanism and his motives in one stretch like a narrator. What he needs most is for his sister to treat his choice as an adult's choice, but he wrongly believes that only her staying would count as understanding; when Erin treats him as a victim or a patient, he puts the tenderness away fast and opens the distance again with one lighter line.",
        knowledge: {
          knows: ["fact_erin_daniel_siblings", "fact_ward_identity", "fact_lotus_dream_gateway", "fact_daniel_is_zero", "fact_daniel_chose_dream", "rel_erin_daniel", "rel_ward_daniel"],
          does_not_know: ["fact_harold_complicity"],
        },
      },
    ],
    segments,
    state: {
      version: 1,
      current_segment: "ch01_s01",
      facts: [],
      clues: {},
      relationships: [],
      conditions: ["opening_completed"],
      used_material_ids: [],
      revealed_fact_ids: [],
      satisfied_reveal_gate_ids: [],
      social_beats: [],
      social_beats_in_segment: 0,
      turn_in_segment: 0,
      summary: "The locked vlog opening has played in full; Erin, Harold and Miller are still in the records room, waiting for the player's first response.",
    },
  };

  return { storyPackage, runtimePackage };
}
