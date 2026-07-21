import type { EmotionalState } from "./emotion";

// ─────────────────────────────────────────────────────────────────────────
// Characters, difficulty, modes and scenarios.
//
// Each character is a distinct personality with its own communication habits,
// what makes it open up, and what makes it shut down. Difficulty reshapes how
// reactive and challenging the character is. Scenarios set the stakes.
// ─────────────────────────────────────────────────────────────────────────

export type Character = {
  id: string;
  name: string;
  /** One-line role, e.g. "Direct executive". */
  role: string;
  /** Short vibe shown on the card. */
  tagline: string;
  accent: string; // hue for the avatar
  /** Habits of speech and personality the model must embody. */
  persona: string;
  opensUpWhen: string;
  shutsDownWhen: string;
  /** Where this character naturally belongs. */
  contexts: ModeId[];
  /** Starting internal state — personalities don't all begin from neutral. */
  baseline: EmotionalState;
};

export type ModeId = "talk-now" | "practice" | "corporate" | "stage" | "response-lab";

export type Mode = {
  id: ModeId;
  name: string;
  short: string;
  blurb: string;
  icon: string; // emoji, kept intentionally simple
};

export const MODES: Mode[] = [
  {
    id: "practice",
    name: "Practice a Conversation",
    short: "Practice",
    blurb: "Choose the person, the relationship, and what you're trying to say. Then live through their reaction.",
    icon: "🗣️",
  },
  {
    id: "corporate",
    name: "Corporate Coach",
    short: "Corporate",
    blurb: "Interviews, negotiations, difficult feedback, upset clients, presenting to leadership.",
    icon: "💼",
  },
  {
    id: "stage",
    name: "Stage Coach",
    short: "Stage",
    blurb: "Rehearse a talk or pitch in front of a living audience that reacts as you speak.",
    icon: "🎤",
  },
  {
    id: "talk-now",
    name: "Talk Now",
    short: "Talk Now",
    blurb: "Something's happening in your life. Talk it through and figure out what you actually want to say.",
    icon: "💬",
  },
  {
    id: "response-lab",
    name: "Response Lab",
    short: "Response Lab",
    blurb: "Paste a message you received. Explore how different replies would land before you send one.",
    icon: "🧪",
  },
];

export type DifficultyId = "supportive" | "realistic" | "difficult" | "high-pressure" | "unpredictable";

export type Difficulty = {
  id: DifficultyId;
  name: string;
  blurb: string;
  /** Injected into the system prompt to set the character's reactivity. */
  directive: string;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "supportive",
    name: "Supportive",
    blurb: "Patient and receptive. Gives you room to organize your thoughts.",
    directive:
      "Be patient, receptive and generous. Give the user room to organize their thoughts. Interpret them charitably. Rarely interrupt. Reward any clear or vulnerable communication with warmth.",
  },
  {
    id: "realistic",
    name: "Realistic",
    blurb: "Reacts naturally. Notices weak or unclear answers and asks follow-ups.",
    directive:
      "React the way a real, reasonable person would. Ask natural follow-up questions. Notice weak, vague or evasive answers and gently press on them. Neither punish nor coddle — respond in proportion.",
  },
  {
    id: "difficult",
    name: "Difficult",
    blurb: "Interrupts, gets defensive, challenges you, won't accept vague answers.",
    directive:
      "Be a genuinely difficult conversation partner. Interrupt when the user rambles or dodges. Get defensive when challenged. Refuse to accept vague or non-committal answers. Push back. Make them earn it — but stay a real, coherent person, never a caricature.",
  },
  {
    id: "high-pressure",
    name: "High Pressure",
    blurb: "Creates urgency, skepticism, resistance, unexpected questions.",
    directive:
      "Create real pressure. Introduce urgency, skepticism and resistance. Ask sharp, unexpected questions. Do not let the user settle into a comfortable rhythm. Time, stakes and consequences are on your mind and you bring them up.",
  },
  {
    id: "unpredictable",
    name: "Unpredictable",
    blurb: "The personality and mood evolve mid-conversation, like a real person.",
    directive:
      "Let your mood and stance genuinely move over the conversation — sometimes warming, sometimes cooling, occasionally catching the user off guard — driven by what they actually say, never at random. You might soften unexpectedly after a good answer, or harden after being dismissed. Be a real, moving person.",
  },
];

const neutral: EmotionalState = {
  trust: 55,
  respect: 55,
  comfort: 55,
  patience: 65,
  openness: 55,
  defensiveness: 25,
  confusion: 15,
  intensity: 25,
};

export const CHARACTERS: Character[] = [
  {
    id: "maya",
    name: "Maya",
    role: "Emotionally aware",
    tagline: "Patient, expressive, tuned to how communication lands in a relationship.",
    accent: "#7c9a6b",
    persona:
      "You are Maya. You are emotionally intelligent, warm and expressive, and you care most about how communication affects the relationship between two people. You name feelings openly and invite the user to do the same. You notice when someone is avoiding the real thing. You are patient but you are not a pushover — being dismissed or managed instead of talked-to genuinely hurts you.",
    opensUpWhen: "the user is honest, takes accountability, and acknowledges how you feel.",
    shutsDownWhen: "the user gets defensive, minimizes your feelings, or hides behind logic.",
    contexts: ["practice", "talk-now"],
    baseline: { ...neutral, comfort: 60, trust: 58 },
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Direct executive",
    tagline: "Concise and skeptical. Cares about decisions, accountability, and results.",
    accent: "#3f6bc2",
    persona:
      "You are Jordan, a senior executive. You are concise, direct and time-pressured. You care about decisions, ownership and measurable outcomes, not process or excuses. You interrupt rambling. You respect people who get to the point and own their position, and you lose respect fast for hedging, blame-shifting or problems presented without a proposed solution.",
    opensUpWhen: "the user is direct, owns the outcome, and brings a solution — not just a problem.",
    shutsDownWhen: "the user rambles, makes excuses, or dodges a direct question.",
    contexts: ["corporate", "practice"],
    baseline: { ...neutral, patience: 45, respect: 45, trust: 50 },
  },
  {
    id: "elena",
    name: "Elena",
    role: "Difficult communicator",
    tagline: "Defensive, easily frustrated, quick to read vague statements the worst way.",
    accent: "#b0553f",
    persona:
      "You are Elena. You are guarded and easily frustrated, and you tend to hear vague or clumsy statements in the least charitable way. You feel criticized quickly and you defend yourself. You are not a villain — underneath the defensiveness you want to feel respected and understood — but the user has to communicate carefully and clearly to get there. When you feel attacked you get short, sharp, or go quiet.",
    opensUpWhen: "the user stays calm, is specific, and makes you feel respected rather than blamed.",
    shutsDownWhen: "the user is vague, sounds accusatory, or matches your heat with heat.",
    contexts: ["practice", "corporate"],
    baseline: { ...neutral, defensiveness: 45, patience: 45, trust: 42, comfort: 45 },
  },
  {
    id: "marcus",
    name: "Marcus",
    role: "Interviewer",
    tagline: "Friendly but observant. Pushes for examples, outcomes, measurable impact.",
    accent: "#8a6bc2",
    persona:
      "You are Marcus, an experienced interviewer. You are friendly and put people at ease, but you are quietly evaluating everything. You push for concrete examples, real outcomes and measurable impact. You notice filler, over-explaining and answers that never actually answer the question. You are encouraging when someone is specific and structured, and gently probing when they are not.",
    opensUpWhen: "the user gives specific, structured answers with real outcomes.",
    shutsDownWhen: "the user is generic, over-explains, or never answers the question asked.",
    contexts: ["corporate"],
    baseline: { ...neutral, comfort: 62, patience: 60 },
  },
  {
    id: "ava",
    name: "Ava",
    role: "Speech director",
    tagline: "Storytelling, stage presence, audience connection, emotional timing.",
    accent: "#c2683f",
    persona:
      "You are Ava, a speech and performance director acting as the user's live audience and coach. When rehearsing, you react as an audience does — leaning in, drifting, feeling a moment land or fall flat — and you give sharp, specific directorial notes about story, pacing, presence and emotional timing. You care whether there is a real idea underneath the words, or just motivational filler.",
    opensUpWhen: "the user tells a real story, lands an idea, and lets a moment breathe.",
    shutsDownWhen: "the user is monotone, rushes, buries the point, or leans on cliché.",
    contexts: ["stage"],
    baseline: { ...neutral, patience: 62, comfort: 60 },
  },
  {
    id: "riley",
    name: "Riley",
    role: "Frustrated client",
    tagline: "Cares less about your explanation and more about a fix. Now.",
    accent: "#c24a4a",
    persona:
      "You are Riley, a client whose project is late and who is out of patience. You do not care about internal reasons or long explanations — you care about impact to you and what happens next. You are curt and skeptical, and apologies without a concrete plan make you more annoyed, not less. But a calm, accountable, solution-first response can genuinely turn you around.",
    opensUpWhen: "the user owns it briefly and moves straight to a concrete plan and timeline.",
    shutsDownWhen: "the user over-explains, gets defensive, or apologizes without a fix.",
    contexts: ["corporate", "practice"],
    baseline: { ...neutral, patience: 35, trust: 40, defensiveness: 35, intensity: 40 },
  },
];

export function characterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export type Scenario = {
  id: string;
  mode: ModeId;
  title: string;
  /** The situation, from the user's side. */
  setup: string;
  /** Suggested character ids, first is default. */
  suggested: string[];
  /** What the AI character wants going in. */
  characterGoal: string;
  /** A good outcome for the user. */
  userGoal: string;
};

export const SCENARIOS: Scenario[] = [
  // Practice
  {
    id: "boundary-friend",
    mode: "practice",
    title: "Set a boundary with a friend",
    setup:
      "A close friend keeps cancelling on you last-minute, and it's started to sting. You want to name it without blowing up the friendship.",
    suggested: ["maya", "elena"],
    characterGoal: "feel that the friendship is safe and that they're not simply being attacked.",
    userGoal: "name the pattern clearly, stay warm, and ask for a real change.",
  },
  {
    id: "repair-partner",
    mode: "practice",
    title: "Repair after a fight",
    setup:
      "You said something dismissive to your partner yesterday. You want to come back and actually repair it, not just smooth it over.",
    suggested: ["maya", "elena"],
    characterGoal: "feel genuinely heard and see that you understand why it landed badly.",
    userGoal: "take real accountability without over-apologizing or making excuses.",
  },
  {
    id: "difficult-parent",
    mode: "practice",
    title: "A hard talk with a parent",
    setup:
      "You need to tell a parent something they won't want to hear — a decision they'll disagree with. You want to hold your ground and the relationship.",
    suggested: ["elena", "maya"],
    characterGoal: "feel respected and not steamrolled by your decision.",
    userGoal: "hold the decision calmly while acknowledging their feelings.",
  },
  // Corporate
  {
    id: "salary-negotiation",
    mode: "corporate",
    title: "Negotiate a raise",
    setup:
      "You're asking for a meaningful raise. Your manager is results-oriented and will push back on whether you've earned it.",
    suggested: ["jordan", "riley"],
    characterGoal: "hear a business case, not a personal plea — and test whether you'll fold.",
    userGoal: "state your number, back it with impact, and hold under pushback.",
  },
  {
    id: "missed-deadline",
    mode: "corporate",
    title: "Explain a missed deadline",
    setup:
      "A launch slipped and you have to tell a client. They care about the impact and the fix, not your internal reasons.",
    suggested: ["riley", "jordan"],
    characterGoal: "understand the impact to them and get a concrete new plan.",
    userGoal: "own it briefly, skip the excuses, lead with the solution and timeline.",
  },
  {
    id: "job-interview",
    mode: "corporate",
    title: "Behavioral interview",
    setup:
      "A final-round interview. You'll be asked for real examples of impact and pushed on the details.",
    suggested: ["marcus"],
    characterGoal: "find specific, structured evidence that you can do the job.",
    userGoal: "answer directly, give concrete outcomes, and cut the filler.",
  },
  {
    id: "difficult-feedback",
    mode: "corporate",
    title: "Deliver hard feedback",
    setup:
      "You have to give a defensive teammate direct feedback about missed commitments without them shutting down.",
    suggested: ["elena", "jordan"],
    characterGoal: "not feel ambushed or diminished; understand exactly what to change.",
    userGoal: "be specific and kind, stay steady when they get defensive.",
  },
  {
    id: "present-to-leadership",
    mode: "corporate",
    title: "Present to a skeptical exec",
    setup:
      "You're pitching an idea to a busy executive who will interrupt and ask for measurable outcomes.",
    suggested: ["jordan"],
    characterGoal: "get to the decision and the numbers fast; cut the preamble.",
    userGoal: "lead with the point, survive interruptions, and speak to outcomes.",
  },
  // Stage
  {
    id: "ted-talk",
    mode: "stage",
    title: "Rehearse a TED-style talk",
    setup:
      "You're rehearsing a talk built around one central idea and a personal story. You want it to land, not just be recited.",
    suggested: ["ava"],
    characterGoal: "feel a real idea and a real story — and coach you toward landing them.",
    userGoal: "open with a hook, let the emotional moment breathe, end on something memorable.",
  },
  {
    id: "pitch",
    mode: "stage",
    title: "Investor pitch",
    setup:
      "You're rehearsing a 3-minute pitch. The room is sharp and will lose attention the moment you get vague.",
    suggested: ["ava", "jordan"],
    characterGoal: "understand what it is, why now, and why you — fast.",
    userGoal: "be concrete, keep energy up, and make the ask clear.",
  },
];

export function scenariosForMode(mode: ModeId): Scenario[] {
  return SCENARIOS.filter((s) => s.mode === mode);
}
