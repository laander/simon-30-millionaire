import assert from "node:assert/strict";
import test from "node:test";
import {
  gameConfig,
  gameReducer,
  initialGameState,
  scheduleGameTimer,
  validateGameConfig,
} from "../app/game.ts";

function enterQuestion() {
  return gameReducer(gameReducer(initialGameState, { type: "START" }), { type: "INTRO_DONE" });
}

test("locks one answer and ignores a double selection", () => {
  const question = enterQuestion();
  const locked = gameReducer(question, { type: "SELECT_ANSWER", index: 1 });
  const doubleClick = gameReducer(locked, { type: "SELECT_ANSWER", index: 2 });
  assert.equal(locked.phase, "locked");
  assert.equal(locked.selectedIndex, 1);
  assert.deepEqual(doubleClick, locked);
});

test("correct answers reveal and advance to the next question", () => {
  let state = enterQuestion();
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 1 });
  state = gameReducer(state, { type: "REVEAL", isCorrect: true });
  assert.equal(state.phase, "revealed");
  assert.equal(state.correct, true);
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "transition");
  state = gameReducer(state, { type: "NEXT_QUESTION" });
  assert.equal(state.phase, "question");
  assert.equal(state.questionIndex, 1);
  assert.equal(state.selectedIndex, null);
});

test("incorrect non-final answers still advance", () => {
  let state = enterQuestion();
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 0 });
  state = gameReducer(state, { type: "REVEAL", isCorrect: false });
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "transition");
});

test("an incorrect final answer resets the same question", () => {
  let state = { ...enterQuestion(), questionIndex: gameConfig.questions.length - 1 };
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 0 });
  state = gameReducer(state, { type: "REVEAL", isCorrect: false });
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "question");
  assert.equal(state.questionIndex, 14);
  assert.equal(state.selectedIndex, null);
  assert.equal(state.correct, null);
});

test("a correct final answer enters the celebration", () => {
  let state = { ...enterQuestion(), questionIndex: gameConfig.questions.length - 1 };
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 1 });
  state = gameReducer(state, { type: "REVEAL", isCorrect: true });
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "celebration");
});

test("restart preserves the sound preference and clears progress", () => {
  const state = {
    ...initialGameState,
    phase: "celebration",
    questionIndex: 14,
    selectedIndex: 1,
    correct: true,
    soundOn: false,
  };
  assert.deepEqual(gameReducer(state, { type: "RESTART" }), {
    ...initialGameState,
    soundOn: false,
  });
});

test("scheduled transitions can be cancelled during restart or unmount", () => {
  let queuedCallback;
  let cleared = false;
  let fired = false;
  const scheduler = {
    set(callback) {
      queuedCallback = callback;
      return 42;
    },
    clear(timer) {
      assert.equal(timer, 42);
      cleared = true;
    },
  };
  const cancel = scheduleGameTimer(() => { fired = true; }, 900, scheduler);
  cancel();
  cancel();
  queuedCallback();
  assert.equal(cleared, true);
  assert.equal(fired, false);
});

test("the shipped configuration is valid", () => {
  assert.deepEqual(validateGameConfig(gameConfig), []);
});

test("configuration validation catches malformed games", () => {
  const malformed = {
    ...gameConfig,
    questions: [
      { ...gameConfig.questions[0], id: "", amount: "", answers: ["", "B", "C", "D"] },
    ],
  };
  const errors = validateGameConfig(malformed);
  assert.ok(errors.some((error) => error.includes("Expected 15 questions")));
  assert.ok(errors.some((error) => error.includes("needs an id")));
  assert.ok(errors.some((error) => error.includes("four non-empty answers")));
  assert.ok(errors.some((error) => error.includes("final question")));
});
