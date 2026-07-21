import type { EmotionalState, Emotion, Intensity, Behavior } from "./emotion";
import type { DifficultyId, ModeId } from "./characters";

// Shared request/response contracts between the client and the API routes.

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Everything the client knows about the scene, sent on each converse call. */
export type SceneConfig = {
  mode: ModeId;
  characterId: string;
  /** If the user built a custom character instead of picking one. */
  customCharacter?: CustomCharacter | null;
  difficulty: DifficultyId;
  scenarioSetup: string;
  characterGoal: string;
  userGoal: string;
  /** Audience type for Stage mode, e.g. "skeptical industry audience". */
  audience?: string;
};

export type CustomCharacter = {
  name: string;
  relationship: string; // relationship to the user
  communicationStyle: string;
  cares: string;
  makesDefensive: string;
  directness: string;
  expressiveness: string;
  wants: string;
};

export type ConverseRequest = {
  scene: SceneConfig;
  history: ChatTurn[];
  state: EmotionalState;
  /** The user's latest utterance. Empty string means "open the scene". */
  userText: string;
  /** Optional paralinguistic cues the client observed (pace, hesitation…). */
  delivery?: DeliverySignal | null;
};

/** Lightweight signals the client derives from how the user spoke. */
export type DeliverySignal = {
  words: number;
  /** words per minute over the utterance, if timing was available. */
  wpm?: number;
  /** rough count of filler words (um, like, you know). */
  fillers?: number;
  /** true if the user cut in while the character was still speaking. */
  interrupted?: boolean;
};

/** The structured turn the model returns. */
export type CharacterTurn = {
  /** What the character says out loud. */
  reply: string;
  emotion: Emotion;
  intensity: Intensity;
  state: EmotionalState;
  /** One short sentence: why the state moved this turn. */
  shift: string;
  behaviors: Behavior[];
  /** Optional in-the-moment nudge for the user (coaching). */
  coach?: string | null;
  /** The model's read on whether the user has reached their stated goal. */
  goalProgress?: number; // 0–100
};

export type DebriefRequest = {
  scene: SceneConfig;
  history: ChatTurn[];
  finalState: EmotionalState;
  stateHistory: { turn: number; state: EmotionalState }[];
};

// ── Response Lab ────────────────────────────────────────────────────────────
// Paste a message you received; explore how different replies would land.

export type ResponseLabRequest = {
  message: string; // the message they received
  from: string; // who it's from / relationship
  context: string; // what's going on / what they want
  tone?: string; // desired tone of their reply, optional
};

export type ReplyOption = {
  approach: string; // short label, e.g. "Direct & warm"
  text: string; // the actual reply they could send
  howItLands: string; // likely emotional + relational effect
  risk: string; // the main downside / when it backfires
  recommended?: boolean;
};

export type ResponseLabResult = {
  read: string; // what the incoming message is really saying (subtext)
  senderFeeling: string; // one-line read of the sender's emotional state
  options: ReplyOption[];
};

// ── In-conversation suggestions ─────────────────────────────────────────────

export type SuggestRequest = {
  scene: SceneConfig;
  history: ChatTurn[];
  state: EmotionalState;
};

export type Suggestion = { text: string; why: string; approach: string };
export type SuggestResult = { suggestions: Suggestion[] };

/** sessionStorage key for handing a built scene from the Lab into the Room. */
export const PENDING_SCENE_KEY = "attune:pendingScene";

export type Debrief = {
  headline: string;
  emotionalArc: string;
  didWell: string[];
  watchOuts: string[];
  turningPoint: { quote: string; why: string } | null;
  strongerVersion: { context: string; rewrite: string } | null;
  exercise: string;
  /** Corporate-flavored read when relevant. */
  execRead?: string | null;
  scores: { clarity: number; directness: number; empathy: number; composure: number };
};
