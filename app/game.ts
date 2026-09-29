import { content } from "./content.ts";

export type AnswerIndex = 0 | 1 | 2 | 3;

export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

export type QuestionAudioCue = "questionLow" | "questionMid" | "questionHigh";

export type AudioCue =
  | "intro"
  | "letsPlay"
  | "lifeline"
  | QuestionAudioCue
  | "lockIn"
  | "correct"
  | "wrong"
  | "victory";

export type AudioConfig = Partial<Record<AudioCue, string>>;

export interface Question {
  amount: string;
  prompt: string;
  answers: readonly [string, string, string, string];
  correct: AnswerLetter;
  milestone?: boolean;
}

export interface GameText {
  startShow: string;
  introLabel: string;
  introContinue: string;
  gameLabel: string;
  soundOn: string;
  soundOff: string;
  turnSoundOn: string;
  turnSoundOff: string;
  restart: string;
  restartLabel: string;
  lifelines: string;
  fiftyFifty: string;
  askAudience: string;
  phoneFriend: string;
  useLifeline: (name: string) => string;
  lifelineUsed: (name: string) => string;
  lifelineUsedLabel: (name: string) => string;
  ladder: string;
  ladderLabel: string;
  jumpToQuestion: (number: number, amount: string) => string;
  questionProgress: (number: number, total: number) => string;
  questionProgressLabel: (number: number, total: number, amount: string) => string;
  answersLabel: string;
  answerSelected: string;
  answerCorrect: string;
  answerIncorrect: string;
  answerEliminated: (letter: AnswerLetter) => string;
  continue: string;
  playAgain: string;
  restartDialogEyebrow: string;
  restartDialogTitle: string;
  restartDialogBody: string;
  restartDialogCancel: string;
  restartDialogConfirm: string;
  announceSelected: (letter: AnswerLetter) => string;
  announceCorrect: string;
  announceIncorrect: string;
  announceWinner: string;
}

export interface GameConfig {
  language: string;
  title: string;
  subtitle: string;
  description: string;
  logo: string;
  questions: readonly Question[];
  celebration: {
    kicker: string;
    headline: string;
    message: string;
  };
  audio: AudioConfig;
  text: GameText;
}

export type GamePhase =
  | "ready"
  | "intro"
  | "question"
  | "selected"
  | "revealed"
  | "transition"
  | "celebration";

export interface GameState {
  phase: GamePhase;
  questionIndex: number;
  selectedIndex: AnswerIndex | null;
  correct: boolean | null;
  soundOn: boolean;
  audienceUsed: boolean;
  fiftyFiftyUsed: boolean;
  phoneUsed: boolean;
  eliminatedIndexes: AnswerIndex[];
  incorrectIndexes: AnswerIndex[];
}

export type GameAction =
  | { type: "START" }
  | { type: "INTRO_DONE" }
  | { type: "SELECT_ANSWER"; index: AnswerIndex }
  | { type: "USE_AUDIENCE" }
  | { type: "USE_FIFTY_FIFTY" }
  | { type: "USE_PHONE" }
  | { type: "JUMP_TO_QUESTION"; index: number }
  | { type: "ADVANCE" }
  | { type: "NEXT_QUESTION" }
  | { type: "TOGGLE_SOUND" }
  | { type: "RESTART" };

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

export type GameAudioMode = "silent" | "intro" | "question" | "lockIn" | "correct" | "wrong" | "victory";

export function gameAudioModeFor(state: Pick<GameState, "phase" | "correct">): GameAudioMode {
  if (state.phase === "intro") return "intro";
  if (state.phase === "question") return "question";
  if (state.phase === "selected") return "lockIn";
  if (state.phase === "revealed") return state.correct ? "correct" : "wrong";
  if (state.phase === "celebration") return "victory";
  return "silent";
}

// Splits the ladder into roughly 30% low, 30% mid, and 40% high-stakes music.
export function questionAudioCueFor(questionIndex: number, questionCount: number): QuestionAudioCue {
  if (questionIndex < Math.round(questionCount * 0.3)) return "questionLow";
  if (questionIndex < Math.round(questionCount * 0.6)) return "questionMid";
  return "questionHigh";
}

export function correctIndexOf(question: Question): AnswerIndex {
  return ANSWER_LETTERS.indexOf(question.correct) as AnswerIndex;
}

export const gameConfig: GameConfig = content;

export const initialGameState: GameState = {
  phase: "ready",
  questionIndex: 0,
  selectedIndex: null,
  correct: null,
  soundOn: true,
  audienceUsed: false,
  fiftyFiftyUsed: false,
  phoneUsed: false,
  eliminatedIndexes: [],
  incorrectIndexes: [],
};

export interface GameTimerScheduler {
  set(callback: () => void, delay: number): unknown;
  clear(timer: unknown): void;
}

const browserTimerScheduler: GameTimerScheduler = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
};

export function scheduleGameTimer(
  callback: () => void,
  delay: number,
  scheduler: GameTimerScheduler = browserTimerScheduler,
): () => void {
  let active = true;
  const timer = scheduler.set(() => {
    if (!active) return;
    active = false;
    callback();
  }, delay);
  return () => {
    if (!active) return;
    active = false;
    scheduler.clear(timer);
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START":
      return state.phase === "ready" ? { ...state, phase: "intro" } : state;
    case "INTRO_DONE":
      return state.phase === "intro"
        ? { ...state, phase: "question", selectedIndex: null, correct: null, incorrectIndexes: [] }
        : state;
    case "SELECT_ANSWER":
      if (state.eliminatedIndexes.includes(action.index) || state.incorrectIndexes.includes(action.index)) {
        return state;
      }
      if (state.phase === "question" || (state.phase === "revealed" && state.correct === false)) {
        return { ...state, phase: "selected", selectedIndex: action.index, correct: null };
      }
      if (state.phase === "selected") {
        if (state.selectedIndex !== action.index) return { ...state, selectedIndex: action.index };
        const question = gameConfig.questions[state.questionIndex];
        const isCorrect = action.index === correctIndexOf(question);
        return {
          ...state,
          phase: "revealed",
          correct: isCorrect,
          incorrectIndexes: isCorrect
            ? state.incorrectIndexes
            : [...state.incorrectIndexes, action.index],
        };
      }
      return state;
    case "USE_AUDIENCE":
      return !state.audienceUsed && (state.phase === "question" || state.phase === "selected")
        ? { ...state, audienceUsed: true }
        : state;
    case "USE_FIFTY_FIFTY": {
      if (state.fiftyFiftyUsed || (state.phase !== "question" && state.phase !== "selected")) return state;
      const question = gameConfig.questions[state.questionIndex];
      const answerIndexes: AnswerIndex[] = [0, 1, 2, 3];
      const eliminatedIndexes = answerIndexes
        .filter((index) =>
          index !== correctIndexOf(question)
          && index !== state.selectedIndex
          && !state.incorrectIndexes.includes(index)
        )
        .slice(0, 2);
      return { ...state, fiftyFiftyUsed: true, eliminatedIndexes };
    }
    case "USE_PHONE":
      return !state.phoneUsed && (state.phase === "question" || state.phase === "selected")
        ? { ...state, phoneUsed: true }
        : state;
    case "JUMP_TO_QUESTION":
      return Number.isInteger(action.index) && action.index >= 0 && action.index < gameConfig.questions.length
        ? {
            ...state,
            phase: "question",
            questionIndex: action.index,
            selectedIndex: null,
            correct: null,
            eliminatedIndexes: [],
            incorrectIndexes: [],
          }
        : state;
    case "ADVANCE": {
      if (state.phase !== "revealed" || state.correct !== true) return state;
      const isFinal = state.questionIndex === gameConfig.questions.length - 1;
      if (isFinal) return { ...state, phase: "celebration" };
      return { ...state, phase: "transition" };
    }
    case "NEXT_QUESTION":
      return state.phase === "transition"
        ? {
            ...state,
            phase: "question",
            questionIndex: state.questionIndex + 1,
            selectedIndex: null,
            correct: null,
            eliminatedIndexes: [],
            incorrectIndexes: [],
          }
        : state;
    case "TOGGLE_SOUND":
      return { ...state, soundOn: !state.soundOn };
    case "RESTART":
      return { ...initialGameState, soundOn: state.soundOn };
    default:
      return state;
  }
}

export const MAX_QUESTIONS = 15;

export function validateGameConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  if (!config.title.trim()) errors.push("The game title is missing.");
  if (!config.logo.trim()) errors.push("The logo path is missing.");
  if (config.questions.length < 1 || config.questions.length > MAX_QUESTIONS) {
    errors.push(`Expected 1 to ${MAX_QUESTIONS} questions, but found ${config.questions.length}.`);
  }

  config.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!question.amount.trim()) errors.push(`${label} is missing an amount.`);
    if (!question.prompt.trim()) errors.push(`${label} is missing its question text.`);
    if (question.answers.length !== 4 || question.answers.some((answer) => !answer.trim())) {
      errors.push(`${label} needs exactly four answers.`);
    }
    if (!ANSWER_LETTERS.includes(question.correct)) {
      errors.push(`${label} needs a correct answer of "A", "B", "C", or "D".`);
    }
  });

  return errors;
}

export function answerAnnouncement(state: GameState): string {
  const { text } = gameConfig;
  if (state.phase === "selected" && state.selectedIndex !== null) {
    return text.announceSelected(ANSWER_LETTERS[state.selectedIndex]);
  }
  if (state.phase === "revealed" && state.correct) return text.announceCorrect;
  if (state.phase === "revealed" && state.correct === false) return text.announceIncorrect;
  if (state.phase === "celebration") return text.announceWinner;
  return "";
}
