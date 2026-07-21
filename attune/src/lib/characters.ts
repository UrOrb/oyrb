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
  accent: string; // hue used as a fallback / accent ring
  /** Portrait avatar path (in /public). */
  avatar: string;
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
    avatar: "/characters/maya.jpg",
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
    avatar: "/characters/jordan.jpg",
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
    avatar: "/characters/elena.jpg",
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
    avatar: "/characters/marcus.jpg",
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
    avatar: "/characters/ava.jpg",
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
    avatar: "/characters/riley.jpg",
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

export type CategoryId =
  | "corporate"
  | "career"
  | "conflict"
  | "relationships"
  | "difficult-people"
  | "stage"
  | "everyday";

export const CATEGORIES: { id: CategoryId; name: string; blurb: string; icon: string }[] = [
  { id: "corporate", name: "Corporate", blurb: "Negotiations, feedback, clients, leadership.", icon: "💼" },
  { id: "career", name: "Interviews & Career", blurb: "Interviews, promotions, offers, reviews.", icon: "🎯" },
  { id: "conflict", name: "Conflict & Repair", blurb: "Tension, apologies, hard truths.", icon: "🔥" },
  { id: "relationships", name: "Relationships", blurb: "Partners, family, close friends.", icon: "💗" },
  { id: "difficult-people", name: "Difficult People", blurb: "Defensive, angry, dismissive, stonewalling.", icon: "🧱" },
  { id: "everyday", name: "Everyday Nerve", blurb: "Small asks that still make you sweat.", icon: "☕" },
  { id: "stage", name: "On Stage", blurb: "Talks, pitches, presentations.", icon: "🎤" },
];

export type Scenario = {
  id: string;
  mode: ModeId;
  category: CategoryId;
  title: string;
  /** A short tone tag shown on the card, e.g. "tense", "warm", "high-stakes". */
  tone: string;
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
  // ── Corporate ──────────────────────────────────────────────────────────
  {
    id: "salary-negotiation",
    mode: "corporate",
    category: "corporate",
    tone: "high-stakes",
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
    category: "corporate",
    tone: "under fire",
    title: "Explain a missed deadline",
    setup:
      "A launch slipped and you have to tell a client. They care about the impact and the fix, not your internal reasons.",
    suggested: ["riley", "jordan"],
    characterGoal: "understand the impact to them and get a concrete new plan.",
    userGoal: "own it briefly, skip the excuses, lead with the solution and timeline.",
  },
  {
    id: "difficult-feedback",
    mode: "corporate",
    category: "corporate",
    tone: "delicate",
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
    category: "corporate",
    tone: "fast & sharp",
    title: "Present to a skeptical exec",
    setup:
      "You're pitching an idea to a busy executive who will interrupt and ask for measurable outcomes.",
    suggested: ["jordan"],
    characterGoal: "get to the decision and the numbers fast; cut the preamble.",
    userGoal: "lead with the point, survive interruptions, and speak to outcomes.",
  },
  {
    id: "upset-client",
    mode: "corporate",
    category: "corporate",
    tone: "angry",
    title: "Calm a furious client",
    setup:
      "A client is livid about a mistake on your side and opens the call hot. They want accountability and a fix, now.",
    suggested: ["riley"],
    characterGoal: "feel taken seriously and get a real remedy — not deflection or defensiveness.",
    userGoal: "stay calm under heat, own it cleanly, and move to a concrete fix.",
  },
  {
    id: "manage-up-overload",
    mode: "corporate",
    category: "corporate",
    tone: "tense",
    title: "Tell your boss you're overloaded",
    setup:
      "You're drowning and need to push back on workload — without sounding like you can't handle the job.",
    suggested: ["jordan", "maya"],
    characterGoal: "keep priorities moving; make sure this isn't an excuse.",
    userGoal: "be clear about capacity, propose trade-offs, keep your credibility.",
  },

  // ── Interviews & Career ────────────────────────────────────────────────
  {
    id: "job-interview",
    mode: "corporate",
    category: "career",
    tone: "evaluative",
    title: "Behavioral interview",
    setup:
      "A final-round interview. You'll be asked for real examples of impact and pushed on the details.",
    suggested: ["marcus"],
    characterGoal: "find specific, structured evidence that you can do the job.",
    userGoal: "answer directly, give concrete outcomes, and cut the filler.",
  },
  {
    id: "tell-me-about-yourself",
    mode: "corporate",
    category: "career",
    tone: "warm but watching",
    title: "“Tell me about yourself”",
    setup:
      "The interview opens with the classic wide-open prompt. It's easy to ramble your whole life story here.",
    suggested: ["marcus"],
    characterGoal: "hear a tight, relevant story that points at the role.",
    userGoal: "give a crisp 60-second arc that lands on why you're right for this.",
  },
  {
    id: "ask-for-promotion",
    mode: "corporate",
    category: "career",
    tone: "high-stakes",
    title: "Ask for a promotion",
    setup:
      "You believe you're already operating at the next level and want to make the case to your manager.",
    suggested: ["jordan"],
    characterGoal: "see evidence of next-level impact, not just ambition.",
    userGoal: "show you're already doing the job and ask clearly for the title.",
  },
  {
    id: "resign-gracefully",
    mode: "corporate",
    category: "career",
    tone: "awkward",
    title: "Resign gracefully",
    setup:
      "You're quitting. Your manager may take it personally or try to talk you out of it. You want to leave clean.",
    suggested: ["jordan", "maya"],
    characterGoal: "understand why, and not feel blindsided or betrayed.",
    userGoal: "be firm and grateful, hold your decision, don't over-explain.",
  },

  // ── Conflict & Repair ──────────────────────────────────────────────────
  {
    id: "repair-partner",
    mode: "practice",
    category: "conflict",
    tone: "raw",
    title: "Repair after a fight",
    setup:
      "You said something dismissive to your partner yesterday. You want to come back and actually repair it, not just smooth it over.",
    suggested: ["maya", "elena"],
    characterGoal: "feel genuinely heard and see that you understand why it landed badly.",
    userGoal: "take real accountability without over-apologizing or making excuses.",
  },
  {
    id: "apology-that-lands",
    mode: "practice",
    category: "conflict",
    tone: "vulnerable",
    title: "Apologize for real",
    setup:
      "You let someone down and a hollow “sorry” won't cut it. They're still hurt and a little skeptical of your apology.",
    suggested: ["elena", "maya"],
    characterGoal: "believe you actually get the impact — not just that you got caught.",
    userGoal: "name the specific harm, own it, and change something — no excuses.",
  },
  {
    id: "confront-broken-promise",
    mode: "practice",
    category: "conflict",
    tone: "tense",
    title: "Confront a broken promise",
    setup:
      "Someone close keeps saying they'll change and doesn't. You want to name the pattern without it becoming a blowup.",
    suggested: ["elena", "maya"],
    characterGoal: "not feel attacked or cornered; save face.",
    userGoal: "stay calm and specific, hold the line, don't get pulled into a fight.",
  },
  {
    id: "roommate-money",
    mode: "practice",
    category: "conflict",
    tone: "awkward",
    title: "The money conversation",
    setup:
      "A roommate or friend owes you money and keeps dodging it. You want it back without torching the relationship.",
    suggested: ["elena", "maya"],
    characterGoal: "not feel judged or shamed about it.",
    userGoal: "be direct and warm, name a concrete next step, don't apologize for asking.",
  },

  // ── Relationships ──────────────────────────────────────────────────────
  {
    id: "boundary-friend",
    mode: "practice",
    category: "relationships",
    tone: "warm",
    title: "Set a boundary with a friend",
    setup:
      "A close friend keeps cancelling on you last-minute, and it's started to sting. You want to name it without blowing up the friendship.",
    suggested: ["maya", "elena"],
    characterGoal: "feel that the friendship is safe and that they're not simply being attacked.",
    userGoal: "name the pattern clearly, stay warm, and ask for a real change.",
  },
  {
    id: "difficult-parent",
    mode: "practice",
    category: "relationships",
    tone: "loaded",
    title: "A hard talk with a parent",
    setup:
      "You need to tell a parent something they won't want to hear — a decision they'll disagree with. You want to hold your ground and the relationship.",
    suggested: ["elena", "maya"],
    characterGoal: "feel respected and not steamrolled by your decision.",
    userGoal: "hold the decision calmly while acknowledging their feelings.",
  },
  {
    id: "express-a-need",
    mode: "practice",
    category: "relationships",
    tone: "tender",
    title: "Ask for what you need",
    setup:
      "You've been feeling unseen by your partner and tend to bury it. You want to say what you need without it sounding like an accusation.",
    suggested: ["maya"],
    characterGoal: "understand you without feeling blamed for failing you.",
    userGoal: "speak from your own feelings, be specific, stay open rather than accusing.",
  },

  // ── Difficult People ───────────────────────────────────────────────────
  {
    id: "defensive-coworker",
    mode: "practice",
    category: "difficult-people",
    tone: "prickly",
    title: "The defensive coworker",
    setup:
      "You need to resolve something with a coworker who takes every comment as an attack and gets sharp fast.",
    suggested: ["elena"],
    characterGoal: "defend themselves; not be made wrong.",
    userGoal: "stay non-reactive, keep it about the issue, don't match their heat.",
  },
  {
    id: "dismissive-boss",
    mode: "practice",
    category: "difficult-people",
    tone: "cold",
    title: "The dismissive boss",
    setup:
      "Your manager talks over you and waves off your ideas. You want to be taken seriously without picking a fight.",
    suggested: ["jordan"],
    characterGoal: "keep control of the conversation and stay unbothered.",
    userGoal: "hold your ground, get your point in, command a little respect.",
  },
  {
    id: "stonewaller",
    mode: "practice",
    category: "difficult-people",
    tone: "shut down",
    title: "Someone who shuts down",
    setup:
      "The person you need to talk to goes quiet and withdraws the moment things get hard. You want to keep them in the room.",
    suggested: ["elena", "maya"],
    characterGoal: "retreat to safety; avoid the discomfort.",
    userGoal: "lower the temperature, make it safe, draw them back without pushing.",
  },

  // ── Everyday Nerve ─────────────────────────────────────────────────────
  {
    id: "send-food-back",
    mode: "practice",
    category: "everyday",
    tone: "low-key",
    title: "Send the order back",
    setup:
      "Your food or order is wrong and you hate making a fuss. You want to fix it politely without shrinking.",
    suggested: ["maya", "riley"],
    characterGoal: "get through the interaction smoothly.",
    userGoal: "ask plainly for what you paid for, friendly but unapologetic.",
  },
  {
    id: "say-no-invite",
    mode: "practice",
    category: "everyday",
    tone: "mild",
    title: "Say no without a story",
    setup:
      "You want to decline an invitation or request without inventing an elaborate excuse or over-apologizing.",
    suggested: ["maya"],
    characterGoal: "not feel rejected or brushed off.",
    userGoal: "give a clean, warm no — no essay, no guilt.",
  },

  // ── On Stage ───────────────────────────────────────────────────────────
  {
    id: "ted-talk",
    mode: "stage",
    category: "stage",
    tone: "expressive",
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
    category: "stage",
    tone: "high-energy",
    title: "Investor pitch",
    setup:
      "You're rehearsing a 3-minute pitch. The room is sharp and will lose attention the moment you get vague.",
    suggested: ["ava", "jordan"],
    characterGoal: "understand what it is, why now, and why you — fast.",
    userGoal: "be concrete, keep energy up, and make the ask clear.",
  },
  {
    id: "wedding-toast",
    mode: "stage",
    category: "stage",
    tone: "heartfelt",
    title: "Give a toast",
    setup:
      "You're rehearsing a wedding toast or eulogy — a short, personal speech where emotion and timing are everything.",
    suggested: ["ava"],
    characterGoal: "feel a genuine moment, well-paced, that doesn't ramble.",
    userGoal: "tell one real story, land the emotion, keep it tight.",
  },
];

export function scenariosForMode(mode: ModeId): Scenario[] {
  return SCENARIOS.filter((s) => s.mode === mode);
}

export function scenariosForCategory(cat: CategoryId): Scenario[] {
  return SCENARIOS.filter((s) => s.category === cat);
}

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
