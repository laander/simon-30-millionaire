import assert from "node:assert/strict";
import test from "node:test";
import {
  correctIndexOf,
  gameAudioModeFor,
  gameConfig,
  gameReducer,
  initialGameState,
  scheduleGameTimer,
  validateGameConfig,
} from "../app/game.ts";

function enterQuestion() {
  return gameReducer(gameReducer(initialGameState, { type: "START" }), { type: "INTRO_DONE" });
}

function wrongIndexesOf(question) {
  return [0, 1, 2, 3].filter((index) => index !== correctIndexOf(question));
}

test("selects first, lets the player change their mind, and reveals only on confirmation", () => {
  const [first, second] = wrongIndexesOf(gameConfig.questions[0]);
  const question = enterQuestion();
  const selected = gameReducer(question, { type: "SELECT_ANSWER", index: first });
  assert.equal(selected.phase, "selected");
  assert.equal(selected.selectedIndex, first);

  const changed = gameReducer(selected, { type: "SELECT_ANSWER", index: second });
  assert.equal(changed.phase, "selected");
  assert.equal(changed.selectedIndex, second);

  const revealed = gameReducer(changed, { type: "SELECT_ANSWER", index: second });
  assert.equal(revealed.phase, "revealed");
  assert.equal(revealed.selectedIndex, second);
  assert.equal(revealed.correct, false);
  assert.deepEqual(revealed.incorrectIndexes, [second]);

  const retry = gameReducer(revealed, { type: "SELECT_ANSWER", index: first });
  assert.equal(retry.phase, "selected");
  assert.equal(retry.selectedIndex, first);
  assert.deepEqual(retry.incorrectIndexes, [second]);
});

test("lock-in audio starts on selection without an extra lock phase", () => {
  const [wrongIndex] = wrongIndexesOf(gameConfig.questions[0]);
  const selected = gameReducer(enterQuestion(), { type: "SELECT_ANSWER", index: wrongIndex });
  const revealed = gameReducer(selected, { type: "SELECT_ANSWER", index: wrongIndex });

  assert.equal(gameAudioModeFor(selected), "lockIn");
  assert.equal(revealed.phase, "revealed");
  assert.equal(gameAudioModeFor(revealed), "wrong");
});

test("correct answers reveal and advance to the next question", () => {
  let state = enterQuestion();
  const correctIndex = correctIndexOf(gameConfig.questions[0]);
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  assert.equal(state.phase, "revealed");
  assert.equal(state.correct, true);
  assert.deepEqual(gameReducer(state, { type: "NEXT_QUESTION" }), state);
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "transition");
  state = gameReducer(state, { type: "NEXT_QUESTION" });
  assert.equal(state.phase, "question");
  assert.equal(state.questionIndex, 1);
  assert.equal(state.selectedIndex, null);
});

test("up to three incorrect answers stay red and cannot advance", () => {
  let state = enterQuestion();
  const wrongIndexes = wrongIndexesOf(gameConfig.questions[0]);

  for (const wrongIndex of wrongIndexes) {
    state = gameReducer(state, { type: "SELECT_ANSWER", index: wrongIndex });
    state = gameReducer(state, { type: "SELECT_ANSWER", index: wrongIndex });
    assert.equal(state.phase, "revealed");
    assert.equal(state.correct, false);
    assert.equal(state.incorrectIndexes.includes(wrongIndex), true);
  }

  assert.deepEqual(state.incorrectIndexes, wrongIndexes);
  assert.deepEqual(gameReducer(state, { type: "ADVANCE" }), state);
  assert.deepEqual(gameReducer(state, { type: "SELECT_ANSWER", index: wrongIndexes[0] }), state);

  const correctIndex = correctIndexOf(gameConfig.questions[0]);
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  assert.equal(state.correct, true);
});

test("an incorrect final answer must be retried before celebrating", () => {
  let state = { ...enterQuestion(), questionIndex: gameConfig.questions.length - 1 };
  const [wrongIndex] = wrongIndexesOf(gameConfig.questions.at(-1));
  state = gameReducer(state, { type: "SELECT_ANSWER", index: wrongIndex });
  state = gameReducer(state, { type: "SELECT_ANSWER", index: wrongIndex });
  assert.equal(state.correct, false);
  assert.deepEqual(gameReducer(state, { type: "ADVANCE" }), state);

  const correctIndex = correctIndexOf(gameConfig.questions.at(-1));
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "celebration");
  assert.equal(state.questionIndex, gameConfig.questions.length - 1);
});

test("a correct final answer enters the celebration", () => {
  let state = { ...enterQuestion(), questionIndex: gameConfig.questions.length - 1 };
  const correctIndex = correctIndexOf(gameConfig.questions.at(-1));
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "SELECT_ANSWER", index: correctIndex });
  state = gameReducer(state, { type: "ADVANCE" });
  assert.equal(state.phase, "celebration");
});

test("ask the audience is consumed in place and can only be used once", () => {
  let state = enterQuestion();
  state = gameReducer(state, { type: "USE_AUDIENCE" });
  assert.equal(state.phase, "question");
  assert.equal(state.audienceUsed, true);

  const secondUse = gameReducer(state, { type: "USE_AUDIENCE" });
  assert.deepEqual(secondUse, state);
});

test("phone a friend is consumed in place and preserves an earlier selection", () => {
  let state = enterQuestion();
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 1 });
  state = gameReducer(state, { type: "USE_PHONE" });
  assert.equal(state.phase, "selected");
  assert.equal(state.selectedIndex, 1);
  assert.equal(state.phoneUsed, true);
  assert.deepEqual(gameReducer(state, { type: "USE_PHONE" }), state);
});

test("50:50 removes two wrong answers and blocks selecting them", () => {
  let state = gameReducer(enterQuestion(), { type: "USE_FIFTY_FIFTY" });
  assert.equal(state.phase, "question");
  assert.equal(state.fiftyFiftyUsed, true);
  assert.equal(state.eliminatedIndexes.length, 2);
  assert.equal(state.eliminatedIndexes.includes(correctIndexOf(gameConfig.questions[0])), false);

  const eliminatedIndex = state.eliminatedIndexes[0];
  assert.deepEqual(gameReducer(state, { type: "SELECT_ANSWER", index: eliminatedIndex }), state);
  assert.deepEqual(gameReducer(state, { type: "USE_FIFTY_FIFTY" }), state);
});

test("50:50 preserves a selected answer as well as the correct answer", () => {
  const correctIndex = correctIndexOf(gameConfig.questions[0]);
  const selectedIndex = correctIndex === 3 ? 0 : 3;
  let state = gameReducer(enterQuestion(), { type: "SELECT_ANSWER", index: selectedIndex });
  state = gameReducer(state, { type: "USE_FIFTY_FIFTY" });

  assert.equal(state.phase, "selected");
  assert.equal(state.selectedIndex, selectedIndex);
  assert.equal(state.eliminatedIndexes.includes(correctIndex), false);
  assert.equal(state.eliminatedIndexes.includes(selectedIndex), false);
  assert.equal(state.eliminatedIndexes.length, 2);
});

test("the host can jump forward and backward from the ladder", () => {
  let state = enterQuestion();
  state = gameReducer(state, { type: "SELECT_ANSWER", index: 0 });
  state = {
    ...state,
    audienceUsed: true,
    fiftyFiftyUsed: true,
    phoneUsed: true,
    eliminatedIndexes: [1, 2],
    incorrectIndexes: [0],
    soundOn: false,
  };

  const forwardIndex = gameConfig.questions.length - 1;
  state = gameReducer(state, { type: "JUMP_TO_QUESTION", index: forwardIndex });
  assert.equal(state.phase, "question");
  assert.equal(state.questionIndex, forwardIndex);
  assert.equal(state.selectedIndex, null);
  assert.equal(state.correct, null);
  assert.equal(state.audienceUsed, true);
  assert.equal(state.fiftyFiftyUsed, true);
  assert.equal(state.phoneUsed, true);
  assert.deepEqual(state.eliminatedIndexes, []);
  assert.deepEqual(state.incorrectIndexes, []);
  assert.equal(state.soundOn, false);

  state = gameReducer(state, { type: "JUMP_TO_QUESTION", index: 0 });
  assert.equal(state.questionIndex, 0);
});

test("the host cannot jump outside the configured ladder", () => {
  const state = enterQuestion();
  assert.deepEqual(gameReducer(state, { type: "JUMP_TO_QUESTION", index: -1 }), state);
  assert.deepEqual(gameReducer(state, { type: "JUMP_TO_QUESTION", index: gameConfig.questions.length }), state);
  assert.deepEqual(gameReducer(state, { type: "JUMP_TO_QUESTION", index: 2.5 }), state);
});

test("restart preserves the sound preference and clears progress", () => {
  const state = {
    ...initialGameState,
    phase: "celebration",
    questionIndex: gameConfig.questions.length - 1,
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

test("configuration validation catches malformed games", () => {
  const malformed = {
    ...gameConfig,
    questions: [
      { ...gameConfig.questions[0], amount: "", answers: ["", "B", "C", "D"], correct: "E" },
    ],
  };
  const errors = validateGameConfig(malformed);
  assert.ok(errors.some((error) => error.includes("Question 1 is missing an amount")));
  assert.ok(errors.some((error) => error.includes("Question 1 needs exactly four answers")));
  assert.ok(errors.some((error) => error.includes("Question 1 needs a correct answer")));

  const tooLong = validateGameConfig({ ...gameConfig, questions: Array(16).fill(gameConfig.questions[0]) });
  assert.ok(tooLong.some((error) => error.includes("Expected 1 to 15 questions")));
  assert.ok(validateGameConfig({ ...gameConfig, questions: [] }).some((error) => error.includes("found 0")));
});
