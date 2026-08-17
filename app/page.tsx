"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AudioDirector } from "./audio";
import {
  ANSWER_LETTERS,
  answerAnnouncement,
  gameConfig,
  gameReducer,
  initialGameState,
  scheduleGameTimer,
  validateGameConfig,
  type AnswerIndex,
} from "./game";

const INTRO_DURATION = 6_000;
const LOCK_DURATION = 900;
const RESULT_DURATION = 1_600;
const TRANSITION_DURATION = 450;

type AnswerVisualState = "idle" | "locked" | "correct" | "incorrect";

function StageAtmosphere() {
  return (
    <div className="stage-atmosphere" aria-hidden="true">
      <div className="radial-rays" />
      <div className="led-ribbons" />
      <div className="spotlight spotlight-left" />
      <div className="spotlight spotlight-right" />
      <div className="star-field" />
    </div>
  );
}

function SoundButton({ soundOn, onToggle }: { soundOn: boolean; onToggle: () => void }) {
  return (
    <button
      className="utility-button sound-button"
      type="button"
      onClick={onToggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
    >
      <span className="utility-icon" aria-hidden="true">
        {soundOn ? "◖))" : "◖×"}
      </span>
      <span>{soundOn ? "Sound on" : "Sound off"}</span>
    </button>
  );
}

function Logo({ variant }: { variant: "full" | "crest" }) {
  if (variant === "full") {
    return (
      <div className="full-logo-wrap">
        <img className="full-logo" src={gameConfig.logoSrc} alt="Simon Wants to Be a Millionaire" />
      </div>
    );
  }
  return (
    <div className="crest-logo-wrap">
      <img className="crest-logo" src={gameConfig.logoSrc} alt="" />
    </div>
  );
}

function StartScreen({
  soundOn,
  onToggleSound,
  onStart,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  onStart: () => void;
}) {
  return (
    <main className="screen start-screen">
      <StageAtmosphere />
      <div className="corner-control">
        <SoundButton soundOn={soundOn} onToggle={onToggleSound} />
      </div>
      <section className="start-content" aria-labelledby="start-title">
        <Logo variant="full" />
        <p className="eyebrow">Tonight, Simon takes the hot seat</p>
        <h1 id="start-title">{gameConfig.subtitle}</h1>
        <button className="show-button" type="button" onClick={onStart}>
          <span>Start the show</span>
        </button>
        <p className="start-hint">Music begins after you press start</p>
      </section>
    </main>
  );
}

function IntroScreen({ onSkip }: { onSkip: () => void }) {
  return (
    <main className="screen intro-screen" aria-label="Game introduction">
      <StageAtmosphere />
      <div className="intro-orbit" aria-hidden="true" />
      <div className="intro-logo-stage">
        <Logo variant="full" />
        <p className="intro-callout">Simon, take the hot seat.</p>
      </div>
      <button className="skip-button" type="button" onClick={onSkip}>
        Skip intro
      </button>
    </main>
  );
}

function MoneyLadder({ currentIndex }: { currentIndex: number }) {
  const ladder = gameConfig.questions.map((question, index) => ({ question, index })).reverse();
  return (
    <aside className="money-ladder" aria-label="Money ladder">
      <div className="ladder-heading">
        <span>The ladder</span>
        <strong>{currentIndex + 1} / 15</strong>
      </div>
      <ol>
        {ladder.map(({ question, index }) => {
          const milestone = index === 4 || index === 9 || index === 14;
          const classNames = [
            index === currentIndex ? "is-current" : "",
            index < currentIndex ? "is-complete" : "",
            milestone ? "is-milestone" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={question.id} className={classNames} aria-current={index === currentIndex ? "step" : undefined}>
              <span className="ladder-number">{index + 1}</span>
              <span className="ladder-diamond" aria-hidden="true">◆</span>
              <span className="ladder-amount">{question.amount}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function AnswerButton({
  index,
  text,
  state,
  disabled,
  onSelect,
}: {
  index: AnswerIndex;
  text: string;
  state: AnswerVisualState;
  disabled: boolean;
  onSelect: (index: AnswerIndex) => void;
}) {
  const stateLabel =
    state === "locked" ? "Locked" : state === "correct" ? "Correct" : state === "incorrect" ? "Incorrect" : "";
  return (
    <button
      className={`answer-button answer-${state}`}
      type="button"
      disabled={disabled}
      onClick={() => onSelect(index)}
      aria-label={`${ANSWER_LETTERS[index]}: ${text}${stateLabel ? `. ${stateLabel}` : ""}`}
    >
      <span className="answer-edge" aria-hidden="true" />
      <span className="answer-letter">{ANSWER_LETTERS[index]}:</span>
      <span className="answer-copy">{text}</span>
      {stateLabel && <span className="answer-state-label">{stateLabel}</span>}
    </button>
  );
}

function GameScreen({
  state,
  onSelect,
  onToggleSound,
  onRequestRestart,
}: {
  state: typeof initialGameState;
  onSelect: (index: AnswerIndex) => void;
  onToggleSound: () => void;
  onRequestRestart: () => void;
}) {
  const question = gameConfig.questions[state.questionIndex];
  const isFinal = state.questionIndex === gameConfig.questions.length - 1;
  const showingResult = state.phase === "revealed" || state.phase === "transition";

  const visualStateFor = (index: AnswerIndex): AnswerVisualState => {
    if (state.phase === "locked" && state.selectedIndex === index) return "locked";
    if (!showingResult) return "idle";
    if (state.selectedIndex === index) return state.correct ? "correct" : "incorrect";
    if (!isFinal && state.correct === false && question.correctIndex === index) return "correct";
    return "idle";
  };

  return (
    <main className={`screen game-screen phase-${state.phase}`}>
      <StageAtmosphere />
      <section className="game-main" aria-label="Millionaire game">
        <header className="game-header">
          <div className="mini-brand">
            <Logo variant="crest" />
            <div>
              <span>Simon’s Millionaire</span>
              <strong>{gameConfig.subtitle}</strong>
            </div>
          </div>
          <div className="game-controls">
            <SoundButton soundOn={state.soundOn} onToggle={onToggleSound} />
            <button className="utility-button" type="button" onClick={onRequestRestart}>
              <span className="utility-icon" aria-hidden="true">↺</span>
              <span>Restart</span>
            </button>
          </div>
        </header>

        <div className="compact-progress" aria-label={`Question ${state.questionIndex + 1} of 15, worth ${question.amount}`}>
          <span>Question {state.questionIndex + 1} of 15</span>
          <strong>{question.amount}</strong>
        </div>

        <div className="stage-logo" aria-hidden="true">
          <Logo variant="crest" />
        </div>

        <section className="question-stage" key={question.id} aria-labelledby="question-prompt">
          <div className="amount-chip">{question.amount}</div>
          <div className="question-rail">
            <div className="question-inner">
              <span className="question-number">Question {state.questionIndex + 1}</span>
              <h1 id="question-prompt">{question.prompt}</h1>
            </div>
          </div>
          <div className="answers-grid" aria-label="Answer choices">
            {question.answers.map((answer, index) => (
              <AnswerButton
                key={`${question.id}-${index}`}
                index={index as AnswerIndex}
                text={answer}
                state={visualStateFor(index as AnswerIndex)}
                disabled={state.phase !== "question"}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      </section>
      <MoneyLadder currentIndex={state.questionIndex} />
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {answerAnnouncement(state)}
      </p>
    </main>
  );
}

function CelebrationScreen({
  soundOn,
  onToggleSound,
  onReplay,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  onReplay: () => void;
}) {
  const confetti = Array.from({ length: 72 }, (_, index) => {
    const style = {
      "--x": `${(index * 37) % 100}%`,
      "--delay": `${((index * 13) % 31) / 10}s`,
      "--fall": `${4 + ((index * 7) % 25) / 10}s`,
      "--drift": `${-70 + ((index * 29) % 140)}px`,
      "--hue": `${(index * 47) % 360}`,
    } as CSSProperties;
    return <i className="confetti-piece" style={style} key={index} />;
  });

  return (
    <main className="screen celebration-screen">
      <StageAtmosphere />
      <div className="confetti" aria-hidden="true">{confetti}</div>
      <div className="corner-control">
        <SoundButton soundOn={soundOn} onToggle={onToggleSound} />
      </div>
      <section className="celebration-content" aria-labelledby="celebration-title">
        <div className="victory-logo"><Logo variant="crest" /></div>
        <p className="victory-kicker">Final answer</p>
        <div className="million-reveal">$1,000,000</div>
        <h1 id="celebration-title">Happy 30th, Simon!</h1>
        <p className="victory-copy">You are our birthday millionaire.</p>
        <button className="show-button replay-button" type="button" onClick={onReplay}>
          <span>Play again</span>
        </button>
      </section>
    </main>
  );
}

function RestartDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <section
        className="restart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restart-title"
      >
        <p className="eyebrow">Leave the hot seat?</p>
        <h2 id="restart-title">Restart the entire game?</h2>
        <p>Simon’s progress will return to the $100 question.</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="dialog-button dialog-cancel" type="button" onClick={onCancel}>
            Keep playing
          </button>
          <button className="dialog-button dialog-confirm" type="button" onClick={onConfirm}>
            Restart game
          </button>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [restartOpen, setRestartOpen] = useState(false);
  const audioRef = useRef<AudioDirector | null>(null);
  const audioKeyRef = useRef("");
  const configErrors = useMemo(() => validateGameConfig(gameConfig), []);

  const getAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    audioRef.current ??= new AudioDirector(gameConfig.audio);
    return audioRef.current;
  }, []);

  const toggleSound = useCallback(() => {
    if (!state.soundOn) void getAudio()?.unlock();
    dispatch({ type: "TOGGLE_SOUND" });
  }, [getAudio, state.soundOn]);

  const startGame = useCallback(() => {
    if (state.soundOn) void getAudio()?.unlock();
    dispatch({ type: "START" });
  }, [getAudio, state.soundOn]);

  const selectAnswer = useCallback((index: AnswerIndex) => {
    dispatch({ type: "SELECT_ANSWER", index });
  }, []);

  const restartGame = useCallback(() => {
    audioRef.current?.stopAll();
    audioKeyRef.current = "";
    dispatch({ type: "RESTART" });
    setRestartOpen(false);
  }, []);

  useEffect(() => {
    let cancelTimer: (() => void) | undefined;
    if (state.phase === "intro") {
      cancelTimer = scheduleGameTimer(() => dispatch({ type: "INTRO_DONE" }), INTRO_DURATION);
    } else if (state.phase === "locked" && state.selectedIndex !== null) {
      const question = gameConfig.questions[state.questionIndex];
      cancelTimer = scheduleGameTimer(
        () => dispatch({ type: "REVEAL", isCorrect: state.selectedIndex === question.correctIndex }),
        LOCK_DURATION,
      );
    } else if (state.phase === "revealed") {
      cancelTimer = scheduleGameTimer(() => dispatch({ type: "ADVANCE" }), RESULT_DURATION);
    } else if (state.phase === "transition") {
      cancelTimer = scheduleGameTimer(() => dispatch({ type: "NEXT_QUESTION" }), TRANSITION_DURATION);
    }
    return () => cancelTimer?.();
  }, [state.phase, state.questionIndex, state.selectedIndex]);

  useEffect(() => {
    const director = audioRef.current;
    if (!director) return;
    if (!state.soundOn) {
      director.stopAll();
      audioKeyRef.current = "";
      return;
    }
    const key = `${state.phase}-${state.questionIndex}-${state.correct}`;
    if (audioKeyRef.current === key) return;
    audioKeyRef.current = key;

    if (state.phase === "intro") director.play("intro");
    else if (state.phase === "question") director.play("question", true);
    else if (state.phase === "locked") director.play("lockIn");
    else if (state.phase === "revealed") director.play(state.correct ? "correct" : "wrong");
    else if (state.phase === "celebration") director.play("victory");
    else director.stopAll();
  }, [state.phase, state.questionIndex, state.correct, state.soundOn]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (restartOpen) {
        if (event.key === "Escape") setRestartOpen(false);
        return;
      }
      if (state.phase !== "question") return;
      const key = event.key.toUpperCase();
      const letterIndex = ANSWER_LETTERS.indexOf(key as (typeof ANSWER_LETTERS)[number]);
      const numberIndex = ["1", "2", "3", "4"].indexOf(event.key);
      const index = letterIndex >= 0 ? letterIndex : numberIndex;
      if (index >= 0) {
        event.preventDefault();
        selectAnswer(index as AnswerIndex);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartOpen, selectAnswer, state.phase]);

  useEffect(() => {
    return () => {
      void audioRef.current?.destroy();
    };
  }, []);

  if (configErrors.length) {
    return (
      <main className="screen config-error">
        <StageAtmosphere />
        <section>
          <p className="eyebrow">Game configuration</p>
          <h1>The hot seat is not ready yet.</h1>
          <ul>{configErrors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      </main>
    );
  }

  return (
    <>
      {state.phase === "ready" && (
        <StartScreen soundOn={state.soundOn} onToggleSound={toggleSound} onStart={startGame} />
      )}
      {state.phase === "intro" && <IntroScreen onSkip={() => dispatch({ type: "INTRO_DONE" })} />}
      {["question", "locked", "revealed", "transition"].includes(state.phase) && (
        <GameScreen
          state={state}
          onSelect={selectAnswer}
          onToggleSound={toggleSound}
          onRequestRestart={() => setRestartOpen(true)}
        />
      )}
      {state.phase === "celebration" && (
        <CelebrationScreen soundOn={state.soundOn} onToggleSound={toggleSound} onReplay={restartGame} />
      )}
      {restartOpen && <RestartDialog onCancel={() => setRestartOpen(false)} onConfirm={restartGame} />}
    </>
  );
}
