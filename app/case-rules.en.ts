/**
 * Investigation settings (赵艺琛 09-17; structure borrowed from tavern cards, text written here): English data.
 * Same shape as case-rules.zh.ts — see that file for what each block is for. Player-visible text (testimony ledger card)
 * and P4b input only use the alias "the white-haired mechanic" before the reveal gate opens.
 */
import type { CaseRules } from "./engine/story-pack";

export const caseRules: CaseRules = {
  setting_rules: [
    { id: "rule.case_pace", content: "Each turn surfaces one new clue, or lets one witness speak; the rest wait for the next turn.", keys: ["clue", "witness", "camera", "file", "statement"], constant: true },
    { id: "rule.stage_gate", content: "The case moves in four steps: scene survey, evidence gathering, suspect interrogation, deduction; until a step has landed, the people of the next step stay quiet.", keys: ["scene", "evidence", "interrogation", "deduction"], constant: true },
    { id: "rule.testimony_states", content: "Every statement has three states only: unknown (?), confirmed (√), refuted (×); a flip is caused by evidence, never by emotion or eloquence.", keys: ["statement", "testimony", "ledger", "refuted"] },
    { id: "rule.two_sources", content: "One piece of evidence only shakes a witness or changes their wording; a witness truly changes their story only when two sources that corroborate each other are in hand.", keys: ["evidence", "change the story", "camera", "message", "footage"] },
    { id: "rule.awareness_meter", content: "Whoever is hiding something keeps an awareness meter: hard evidence in hand +20, forcing a door, searching or confronting +2 to 4, and it falls by 1 every turn.", keys: ["force", "search", "confront", "awareness", "evidence"] },
    { id: "rule.awareness_destroy", content: "At awareness 40 the one hiding things disposes of one original piece of evidence first; only copies, photos of it or someone's word remain.", keys: ["original", "footage", "camera", "destroy", "overwrite"] },
  ],
  investigation_stages: [
    { id: "scene_survey", label: "Scene survey", anchor_ids: ["ch01_s01", "ch01_s02", "ch01_s03", "ch01_s04"] },
    { id: "evidence_gathering", label: "Evidence gathering", anchor_ids: ["ch02_s01", "ch02_s02", "ch02_s03"], requires: "scene_survey" },
    { id: "suspect_interrogation", label: "Suspect interrogation", anchor_ids: ["ch03_s01", "ch03_s02", "ch03_s03", "ch04_s01", "ch04_s02"], requires: "evidence_gathering" },
    { id: "deduction", label: "Deduction", anchor_ids: ["ch05_s01", "ch05_s02"], requires: "suspect_interrogation" },
  ],
  anchor_annotations: {
    ch01_s01: { keys: ["vlog", "original footage", "mailbox", "records room", "roommate"], investigation_stage: "scene_survey" },
    ch01_s02: { keys: ["transit records", "ferry", "camera", "Red Hook", "Warehouse 99"], requires: ["ch01_s01"], investigation_stage: "scene_survey" },
    ch01_s03: { keys: ["repair shop", "iron door", "brick wall", "house number", "back alley"], requires: ["ch01_s02"], investigation_stage: "scene_survey" },
    ch01_s04: { keys: ["camera", "white-haired old man", "black mech", "repair shed", "shopkeeper"], requires: ["ch01_s03"], investigation_stage: "scene_survey" },
    ch02_s01: { keys: ["repair shed", "roll-up door", "mech", "white-haired mechanic", "side door"], requires: ["ch01_s04"], investigation_stage: "evidence_gathering" },
    ch02_s02: { keys: ["vacant front hall", "bar", "dance floor", "dust", "backstage"], requires: ["ch02_s01"], investigation_stage: "evidence_gathering" },
    ch02_s03: { keys: ["partition", "screw", "old speaker", "guitar", "mask", "cosplay"], requires: ["ch02_s02"], investigation_stage: "evidence_gathering" },
    ch03_s01: { keys: ["cosplay", "Dobby", "Guardians of the Galaxy", "doorman", "dance floor"], requires: ["ch02_s03"], investigation_stage: "suspect_interrogation" },
    ch03_s02: { keys: ["backstage", "Maya", "lens", "white-haired mechanic", "fake entrance"], requires: ["ch03_s01"], investigation_stage: "suspect_interrogation" },
    ch03_s03: { keys: ["Zero", "mask", "DJ booth", "three a.m.", "rules"], requires: ["ch03_s02"], investigation_stage: "suspect_interrogation" },
    ch04_s01: { keys: ["childhood house", "summer", "Daniel", "guitar", "stay"], requires: ["ch03_s03"], investigation_stage: "suspect_interrogation" },
    ch04_s02: { keys: ["core control room", "Harold", "envelope", "old equipment", "crime rate"], requires: ["ch04_s01"], investigation_stage: "suspect_interrogation" },
    ch05_s01: { keys: ["paper", "console", "blackout", "black cat", "vote"], requires: ["ch04_s02"], investigation_stage: "deduction" },
    ch05_s02: { keys: ["last vote", "destroy", "preserve", "entrance"], requires: ["ch05_s01"], investigation_stage: "deduction" },
  },
  testimonies: [
    { id: "t_harold_first_time", witness: "Harold", claim: "Tonight is the first I've heard of that address.", refuted_by: "fact_harold_complicity" },
    { id: "t_mechanic_never_saw_maya", witness: "the white-haired mechanic", claim: "This is a repair shed. Maya was never here.", refuted_by: "fact_true_lotus_entry" },
    { id: "t_mechanic_nothing_behind", witness: "the white-haired mechanic", claim: "There is no other way in behind the roll-up door.", refuted_by: "fact_false_lotus_entry" },
    { id: "t_roommate_ferry", witness: "Maya's roommate", claim: "I heard a ferry horn on her last call.", confirmed_by: "fact_maya_route" },
    { id: "t_father_normal", witness: "Maya's father", claim: "She checked in like always before she went missing and never said where she was going.", confirmed_by: "fact_maya_profile" },
    { id: "t_erin_captive", witness: "Erin", claim: "Daniel is being held. He would never just vanish on his own.", refuted_by: "fact_daniel_chose_dream" },
  ],
  evidence_turns: [
    { evidence_fact_id: "fact_maya_vlog", witness: "Harold", from_claim: "A video from nowhere isn't worth moving people tonight.", to_claim: "Save the original, no overwriting; it is evidence to be preserved." },
    { evidence_fact_id: "fact_maya_profile", witness: "Miller", from_claim: "She's just a blogger chasing a thrill.", to_claim: "She checks in with her father and roommate every day; she's not someone who drops off the map.", testimony_id: "t_father_normal" },
    { evidence_fact_id: "fact_maya_motive", witness: "Harold", from_claim: "Source unknown, we stop for tonight.", to_claim: "Approved: keep checking her real-world route." },
    { evidence_fact_id: "fact_maya_route", witness: "Maya's roommate", from_claim: "She only said she was going to the docks to film the night.", to_claim: "There was a ferry horn on the call; she went into the back street behind Warehouse 99 and never came out.", testimony_id: "t_roommate_ferry" },
    { evidence_fact_id: "fact_lotus_surface_schedule", witness: "Harold", from_claim: "That address is an auto repair shop.", to_claim: "After 02:49 it is a different kind of business; worth one accompanied check." },
    { evidence_fact_id: "fact_lotus_no_entry", witness: "Erin", from_claim: "By the vlog's angle, the iron door is right here in this wall.", to_claim: "The entrance isn't in the wall; the shop camera on the back alley is all that's left." },
    { evidence_fact_id: "fact_unknown_mechanic_trace", witness: "Miller", from_claim: "Nobody's on this corner at night.", to_claim: "A white-haired old man keeps carrying tools to the repair shed, and the shed stays open till three." },
    { evidence_fact_id: "fact_false_lotus_entry", witness: "the white-haired mechanic", from_claim: "There is no other way in behind the roll-up door.", to_claim: "Admits the empty hall is where he pointed them, and won't say why.", requires_two_sources: true, second_source_fact_id: "fact_unknown_mechanic_trace", testimony_id: "t_mechanic_nothing_behind" },
    { evidence_fact_id: "fact_zero_childhood_song", witness: "Miller", from_claim: "What Erin heard is just an old recording.", to_claim: "That song can't be a coincidence; we stop for tonight and come back in costume." },
    { evidence_fact_id: "fact_true_lotus_entry", witness: "the white-haired mechanic", from_claim: "Maya was never here.", to_claim: "Gives his name and admits Maya is inside.", requires_two_sources: true, second_source_fact_id: "fact_false_lotus_entry", testimony_id: "t_mechanic_never_saw_maya" },
    { evidence_fact_id: "fact_ward_paper", witness: "Harold", from_claim: "Looking the other way kept the precinct safe.", to_claim: "The paper says the people outside the door lose the right to refuse; he votes to destroy.", requires_two_sources: true, second_source_fact_id: "fact_harold_complicity" },
  ],
  settlement_conditions: {
    ch01: { success: "The white-haired mechanic appears on camera and the group decides to find him at the repair shed.", failure: "Harold keeps all three in the precinct past three a.m., or the original footage is overwritten or lost.", timeout: "By turn 20 of this chapter the white-haired old man still hasn't been seen on camera.", timeout_turns: 20 },
    ch02: { success: "Miller calls off tonight's action and the disguise plan is adopted.", failure: "Erin chases into the DJ corridor alone and disappears, or the group leaves the empty shell for the precinct with nothing.", timeout: "By turn 20 of this chapter the childhood song still hasn't come out of the old speaker.", timeout_turns: 20 },
    ch03: { success: "Zero takes off the mask in front of Erin.", failure: "The disguises are seen through and the group is thrown out of the club, or Maya refuses to speak to anyone again.", timeout: "By turn 20 of this chapter Maya still hasn't been found backstage.", timeout_turns: 20 },
    ch04: { success: "Harold admits to years of looking the other way, and the sealed envelope is taken out.", failure: "Erin agrees to stay in the dream, or the group scatters mid-argument and nobody mentions the envelope again.", timeout: "By turn 15 of this chapter the envelope behind the old equipment still hasn't been taken out.", timeout_turns: 15 },
    ch05: { success: "Harold and Miller each cast a vote, one to one, and the last vote lands in the player's hands.", failure: "Someone leaves the entrance before the vote, or Erin refuses to let anyone vote.", timeout: "By turn 10 of this chapter there is still no one-to-one deadlock.", timeout_turns: 10 },
  },
  knowledge_boundaries: [
    { id: "kb.all.spoken_only", who: "Every character", does_not_know: "Anything the player has not said out loud — thoughts, plans, background, identity; a conversation held in another place is not heard, and not somehow known, by anyone who wasn't there.", keys: ["out loud", "hear", "not present", "elsewhere"], constant: true },
  ],
  awareness: {
    threshold: 40,
    evidence_gain: 20,
    search_gain: 4,
    action_gain: 3,
    decay: 1,
    destroyed_evidence: { fact_id: "fact_unknown_mechanic_trace", label: "the shop camera's original back-alley footage", consequence: "The shop camera's original back-alley footage has been overwritten; only the phone copies the group made remain, and anything further has to rest on those copies and people's word." },
  },
};
