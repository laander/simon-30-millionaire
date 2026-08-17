export type AnswerIndex = 0 | 1 | 2 | 3;

export type AudioCue =
  | "intro"
  | "question"
  | "lockIn"
  | "correct"
  | "wrong"
  | "victory";

export type AudioConfig = Partial<Record<AudioCue, string>>;

export interface Question {
  id: string;
  amount: string;
  prompt: string;
  answers: readonly [string, string, string, string];
  correctIndex: AnswerIndex;
}

export interface GameConfig {
  title: string;
  contestant: string;
  subtitle: string;
  logoSrc: string;
  questions: readonly Question[];
  audio: AudioConfig;
}

export type GamePhase =
  | "ready"
  | "intro"
  | "question"
  | "locked"
  | "revealed"
  | "transition"
  | "celebration";

export interface GameState {
  phase: GamePhase;
  questionIndex: number;
  selectedIndex: AnswerIndex | null;
  correct: boolean | null;
  soundOn: boolean;
}

export type GameAction =
  | { type: "START" }
  | { type: "INTRO_DONE" }
  | { type: "SELECT_ANSWER"; index: AnswerIndex }
  | { type: "REVEAL"; isCorrect: boolean }
  | { type: "ADVANCE" }
  | { type: "NEXT_QUESTION" }
  | { type: "TOGGLE_SOUND" }
  | { type: "RESTART" };

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

const questions: readonly Question[] = [
  {
    id: "q-100",
    amount: "$100",
    prompt: "Which color do you mix with yellow to make green?",
    answers: ["Red", "Blue", "Purple", "Orange"],
    correctIndex: 1,
  },
  {
    id: "q-200",
    amount: "$200",
    prompt: "How many days are there in a leap year?",
    answers: ["364", "365", "366", "367"],
    correctIndex: 2,
  },
  {
    id: "q-300",
    amount: "$300",
    prompt: "Which planet is commonly known as the Red Planet?",
    answers: ["Venus", "Mars", "Jupiter", "Mercury"],
    correctIndex: 1,
  },
  {
    id: "q-500",
    amount: "$500",
    prompt: "What is the capital city of Japan?",
    answers: ["Kyoto", "Seoul", "Osaka", "Tokyo"],
    correctIndex: 3,
  },
  {
    id: "q-1000",
    amount: "$1,000",
    prompt: "A standard modern piano usually has how many keys?",
    answers: ["66", "72", "88", "96"],
    correctIndex: 2,
  },
  {
    id: "q-2000",
    amount: "$2,000",
    prompt: "What is the smallest prime number?",
    answers: ["0", "1", "2", "3"],
    correctIndex: 2,
  },
  {
    id: "q-4000",
    amount: "$4,000",
    prompt: "Who painted the Mona Lisa?",
    answers: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Caravaggio"],
    correctIndex: 2,
  },
  {
    id: "q-8000",
    amount: "$8,000",
    prompt: "What is the chemical symbol for gold?",
    answers: ["Ag", "Au", "Gd", "Go"],
    correctIndex: 1,
  },
  {
    id: "q-16000",
    amount: "$16,000",
    prompt: "Which novel begins with the words “Call me Ishmael”?",
    answers: ["Moby-Dick", "The Odyssey", "Treasure Island", "The Old Man and the Sea"],
    correctIndex: 0,
  },
  {
    id: "q-32000",
    amount: "$32,000",
    prompt: "Which is the largest ocean on Earth?",
    answers: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctIndex: 3,
  },
  {
    id: "q-64000",
    amount: "$64,000",
    prompt: "In which year did the Berlin Wall fall?",
    answers: ["1987", "1988", "1989", "1991"],
    correctIndex: 2,
  },
  {
    id: "q-125000",
    amount: "$125,000",
    prompt: "Which language has the greatest number of native speakers worldwide?",
    answers: ["English", "Hindi", "Spanish", "Mandarin Chinese"],
    correctIndex: 3,
  },
  {
    id: "q-250000",
    amount: "$250,000",
    prompt: "Titan, the only moon with a dense atmosphere, orbits which planet?",
    answers: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    correctIndex: 1,
  },
  {
    id: "q-500000",
    amount: "$500,000",
    prompt: "The waltz “The Blue Danube” was composed by whom?",
    answers: ["Johann Strauss II", "Franz Schubert", "Gustav Mahler", "Anton Bruckner"],
    correctIndex: 0,
  },
  {
    id: "q-1000000",
    amount: "$1,000,000",
    prompt: "Which letter does not appear in the name of any U.S. state?",
    answers: ["J", "Q", "X", "Z"],
    correctIndex: 1,
  },
];

export const gameConfig: GameConfig = {
  title: "Simon's Millionaire",
  contestant: "Simon",
  subtitle: "30th Birthday Edition",
  logoSrc: "/simon-millionaire-logo.jpeg",
  questions,
  // Add optional licensed files here, e.g. intro: "/audio/intro.mp3".
  // Every missing or failed file automatically uses the built-in sound engine.
  audio: {},
};

export const initialGameState: GameState = {
  phase: "ready",
  questionIndex: 0,
  selectedIndex: null,
  correct: null,
  soundOn: true,
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
        ? { ...state, phase: "question", selectedIndex: null, correct: null }
        : state;
    case "SELECT_ANSWER":
      return state.phase === "question"
        ? { ...state, phase: "locked", selectedIndex: action.index, correct: null }
        : state;
    case "REVEAL":
      return state.phase === "locked"
        ? { ...state, phase: "revealed", correct: action.isCorrect }
        : state;
    case "ADVANCE": {
      if (state.phase !== "revealed") return state;
      const isFinal = state.questionIndex === gameConfig.questions.length - 1;
      if (isFinal && state.correct) return { ...state, phase: "celebration" };
      if (isFinal) {
        return { ...state, phase: "question", selectedIndex: null, correct: null };
      }
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

export function validateGameConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  if (!config.title.trim()) errors.push("The game title is missing.");
  if (!config.contestant.trim()) errors.push("The contestant name is missing.");
  if (config.questions.length !== 15) {
    errors.push(`Expected 15 questions, found ${config.questions.length}.`);
  }

  const ids = new Set<string>();
  config.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!question.id.trim()) errors.push(`${label} needs an id.`);
    if (ids.has(question.id)) errors.push(`${label} has a duplicate id.`);
    ids.add(question.id);
    if (!question.amount.trim()) errors.push(`${label} needs a money value.`);
    if (!question.prompt.trim()) errors.push(`${label} needs prompt text.`);
    if (question.answers.length !== 4 || question.answers.some((answer) => !answer.trim())) {
      errors.push(`${label} must have four non-empty answers.`);
    }
    if (![0, 1, 2, 3].includes(question.correctIndex)) {
      errors.push(`${label} has an invalid correct answer index.`);
    }
  });

  if (config.questions.at(-1)?.amount !== "$1,000,000") {
    errors.push("The final question must be worth $1,000,000.");
  }
  return errors;
}

export function answerAnnouncement(state: GameState): string {
  const question = gameConfig.questions[state.questionIndex];
  if (state.phase === "locked" && state.selectedIndex !== null) {
    return `${ANSWER_LETTERS[state.selectedIndex]} is locked in.`;
  }
  if (state.phase === "revealed" && state.correct) {
    return "Correct answer.";
  }
  if (state.phase === "revealed" && state.correct === false) {
    const isFinal = state.questionIndex === gameConfig.questions.length - 1;
    return isFinal
      ? "Incorrect. The million-dollar question will reset for another attempt."
      : `Incorrect. The correct answer is ${ANSWER_LETTERS[question.correctIndex]}: ${question.answers[question.correctIndex]}.`;
  }
  if (state.phase === "celebration") return "Simon has won one million dollars!";
  return "";
}
