"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AudioDirector } from "./audio";
import {
  ANSWER_LETTERS,
  answerAnnouncement,
  gameAudioModeFor,
  gameConfig,
  gameReducer,
  initialGameState,
  questionAudioCueFor,
  scheduleGameTimer,
  validateGameConfig,
  type AnswerIndex,
} from "./game";

const TRANSITION_DURATION = 450;

const { text } = gameConfig;

type AnswerVisualState = "idle" | "selected" | "correct" | "incorrect";

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

function SoundButton({
  soundOn,
  onToggle,
  compact = false,
}: {
  soundOn: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      className={`utility-button sound-button${compact ? " compact-utility-button" : ""}`}
      type="button"
      onClick={onToggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? text.turnSoundOff : text.turnSoundOn}
    >
      <span className="utility-icon" aria-hidden="true">
        {soundOn ? "◖))" : "◖×"}
      </span>
      <span className="utility-label">{soundOn ? text.soundOn : text.soundOff}</span>
    </button>
  );
}

function LifelineButton({
  label,
  icon,
  used,
  disabled,
  onUse,
  className = "",
}: {
  label: string;
  icon: string;
  used: boolean;
  disabled: boolean;
  onUse: () => void;
  className?: string;
}) {
  const tooltip = used ? text.lifelineUsed(label) : label;
  return (
    <button
      className={`utility-button lifeline-button${used ? " lifeline-used" : ""} ${className}`.trim()}
      type="button"
      onClick={onUse}
      disabled={used || disabled}
      title={tooltip}
      aria-label={used ? text.lifelineUsedLabel(label) : text.useLifeline(label)}
    >
      <span className="utility-icon lifeline-icon" aria-hidden="true">{icon}</span>
      {used && <span className="lifeline-used-mark" aria-hidden="true">×</span>}
      <span className="lifeline-tooltip" role="tooltip">{tooltip}</span>
    </button>
  );
}

function LifelineControls({
  state,
  onUseAudience,
  onUseFiftyFifty,
  onUsePhone,
  className = "",
}: {
  state: typeof initialGameState;
  onUseAudience: () => void;
  onUseFiftyFifty: () => void;
  onUsePhone: () => void;
  className?: string;
}) {
  const disabled = state.phase !== "question" && state.phase !== "selected";
  return (
    <div className={className} aria-label={text.lifelines}>
      <LifelineButton
        label={text.fiftyFifty}
        icon="50:50"
        used={state.fiftyFiftyUsed}
        disabled={disabled}
        onUse={onUseFiftyFifty}
      />
      <LifelineButton
        label={text.askAudience}
        icon="●●●"
        used={state.audienceUsed}
        disabled={disabled}
        onUse={onUseAudience}
      />
      <LifelineButton
        label={text.phoneFriend}
        icon="☎"
        used={state.phoneUsed}
        disabled={disabled}
        onUse={onUsePhone}
      />
    </div>
  );
}

function Logo({ variant }: { variant: "full" | "crest" }) {
  if (variant === "full") {
    return (
      <div className="full-logo-wrap">
        <img className="full-logo" src={gameConfig.logo} alt={gameConfig.title} />
      </div>
    );
  }
  return (
    <div className="crest-logo-wrap">
      <img className="crest-logo" src={gameConfig.logo} alt="" />
    </div>
  );
}

function StartScreen({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <main className="screen start-screen ready-screen">
      <button className="show-button ready-start-button" type="button" onClick={onStart}>
        <span>{text.startShow}</span>
      </button>
    </main>
  );
}

function IntroScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="screen intro-screen" aria-label={text.introLabel}>
      <StageAtmosphere />
      <div className="intro-orbit" aria-hidden="true" />
      <div className="intro-logo-stage">
        <Logo variant="full" />
        <h1 className="intro-callout">{gameConfig.subtitle}</h1>
        <button className="show-button intro-start-button" type="button" onClick={onContinue}>
          <span>{text.introContinue}</span>
        </button>
      </div>
    </main>
  );
}

function MoneyLadder({
  currentIndex,
  state,
  onUseAudience,
  onUseFiftyFifty,
  onUsePhone,
  onJumpToQuestion,
}: {
  currentIndex: number;
  state: typeof initialGameState;
  onUseAudience: () => void;
  onUseFiftyFifty: () => void;
  onUsePhone: () => void;
  onJumpToQuestion: (index: number) => void;
}) {
  const ladder = gameConfig.questions.map((question, index) => ({ question, index })).reverse();
  return (
    <aside className="money-ladder" aria-label={text.ladderLabel}>
      <LifelineControls
        state={state}
        onUseAudience={onUseAudience}
        onUseFiftyFifty={onUseFiftyFifty}
        onUsePhone={onUsePhone}
        className="sidebar-lifelines"
      />
      <div className="ladder-heading">
        <span>{text.ladder}</span>
        <strong>{currentIndex + 1} / {gameConfig.questions.length}</strong>
      </div>
      <ol>
        {ladder.map(({ question, index }) => {
          const classNames = [
            index === currentIndex ? "is-current" : "",
            index < currentIndex ? "is-complete" : "",
            question.milestone ? "is-milestone" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={index} className={classNames} aria-current={index === currentIndex ? "step" : undefined}>
              <button
                className="ladder-step-button"
                type="button"
                onClick={() => onJumpToQuestion(index)}
                aria-label={text.jumpToQuestion(index + 1, question.amount)}
              >
                <span className="ladder-number">{index + 1}</span>
                <span className="ladder-diamond" aria-hidden="true">◆</span>
                <span className="ladder-amount">{question.amount}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function AnswerButton({
  index,
  answer,
  state,
  eliminated,
  disabled,
  onSelect,
}: {
  index: AnswerIndex;
  answer: string;
  state: AnswerVisualState;
  eliminated: boolean;
  disabled: boolean;
  onSelect: (index: AnswerIndex) => void;
}) {
  const stateLabel =
    state === "selected"
      ? text.answerSelected
      : state === "correct"
        ? text.answerCorrect
        : state === "incorrect"
          ? text.answerIncorrect
          : "";
  return (
    <button
      className={`answer-button ${eliminated ? "answer-eliminated" : `answer-${state}`}`}
      type="button"
      disabled={disabled || eliminated}
      onClick={() => onSelect(index)}
      aria-pressed={state === "selected"}
      aria-label={
        eliminated
          ? text.answerEliminated(ANSWER_LETTERS[index])
          : `${ANSWER_LETTERS[index]}: ${answer}${stateLabel ? `. ${stateLabel}` : ""}`
      }
    >
      {!eliminated && (
        <>
          <span className="answer-prefix">
            <span className="answer-letter">{ANSWER_LETTERS[index]}:</span>
          </span>
          <span className="answer-copy">{answer}</span>
          {stateLabel && <span className="answer-state-label">{stateLabel}</span>}
        </>
      )}
    </button>
  );
}

function GameScreen({
  state,
  onSelect,
  onUseAudience,
  onUseFiftyFifty,
  onUsePhone,
  onJumpToQuestion,
  onContinue,
  onToggleSound,
  onRequestRestart,
}: {
  state: typeof initialGameState;
  onSelect: (index: AnswerIndex) => void;
  onUseAudience: () => void;
  onUseFiftyFifty: () => void;
  onUsePhone: () => void;
  onJumpToQuestion: (index: number) => void;
  onContinue: () => void;
  onToggleSound: () => void;
  onRequestRestart: () => void;
}) {
  const question = gameConfig.questions[state.questionIndex];
  const showingResult = state.phase === "revealed" || state.phase === "transition";
  const retryingAfterWrongAnswer = state.phase === "revealed" && state.correct === false;
  const canSelectAnswer = state.phase === "question" || state.phase === "selected" || retryingAfterWrongAnswer;

  const visualStateFor = (index: AnswerIndex): AnswerVisualState => {
    if (state.incorrectIndexes.includes(index)) return "incorrect";
    if (state.phase === "selected" && state.selectedIndex === index) return "selected";
    if (!showingResult) return "idle";
    if (state.selectedIndex === index) return state.correct ? "correct" : "incorrect";
    return "idle";
  };

  return (
    <main className={`screen game-screen phase-${state.phase}`}>
      <StageAtmosphere />
      <section className="game-main" aria-label={text.gameLabel}>
        <header className="game-header">
          <div className="game-controls">
            <SoundButton soundOn={state.soundOn} onToggle={onToggleSound} compact />
            <button
              className="utility-button compact-utility-button"
              type="button"
              onClick={onRequestRestart}
              aria-label={text.restartLabel}
            >
              <span className="utility-icon" aria-hidden="true">↺</span>
              <span className="utility-label">{text.restart}</span>
            </button>
          </div>
        </header>

        <LifelineControls
          state={state}
          onUseAudience={onUseAudience}
          onUseFiftyFifty={onUseFiftyFifty}
          onUsePhone={onUsePhone}
          className="mobile-lifelines"
        />

        <div
          className="compact-progress"
          aria-label={text.questionProgressLabel(state.questionIndex + 1, gameConfig.questions.length, question.amount)}
        >
          <span>{text.questionProgress(state.questionIndex + 1, gameConfig.questions.length)}</span>
          <strong>{question.amount}</strong>
        </div>

        <div className="stage-logo" aria-hidden="true">
          <Logo variant="crest" />
        </div>

        <section className="question-stage" key={state.questionIndex} aria-labelledby="question-prompt">
          {state.phase === "revealed" && state.correct === true && (
            <div className="result-actions">
              <button className="show-button continue-button" type="button" onClick={onContinue}>
                <span>{text.continue}</span>
              </button>
            </div>
          )}
          <div className="question-rail">
            <div className="question-inner">
              <h1 id="question-prompt">{question.prompt}</h1>
            </div>
          </div>
          <div className="answers-grid" aria-label={text.answersLabel}>
            {question.answers.map((answer, index) => {
              const answerIndex = index as AnswerIndex;
              return (
                <AnswerButton
                  key={index}
                  index={answerIndex}
                  answer={answer}
                  state={visualStateFor(answerIndex)}
                  eliminated={state.eliminatedIndexes.includes(answerIndex)}
                  disabled={!canSelectAnswer || state.incorrectIndexes.includes(answerIndex)}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </section>
      </section>
      <MoneyLadder
        currentIndex={state.questionIndex}
        state={state}
        onUseAudience={onUseAudience}
        onUseFiftyFifty={onUseFiftyFifty}
        onUsePhone={onUsePhone}
        onJumpToQuestion={onJumpToQuestion}
      />
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
        <p className="victory-kicker">{gameConfig.celebration.kicker}</p>
        <div className="million-reveal">{gameConfig.questions.at(-1)?.amount}</div>
        <h1 id="celebration-title">{gameConfig.celebration.headline}</h1>
        <p className="victory-copy">{gameConfig.celebration.message}</p>
        <button className="show-button replay-button" type="button" onClick={onReplay}>
          <span>{text.playAgain}</span>
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
        <p className="eyebrow">{text.restartDialogEyebrow}</p>
        <h2 id="restart-title">{text.restartDialogTitle}</h2>
        <p>{text.restartDialogBody}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="dialog-button dialog-cancel" type="button" onClick={onCancel}>
            {text.restartDialogCancel}
          </button>
          <button className="dialog-button dialog-confirm" type="button" onClick={onConfirm}>
            {text.restartDialogConfirm}
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

  const jumpToQuestion = useCallback((index: number) => {
    dispatch({ type: "JUMP_TO_QUESTION", index });
  }, []);

  const triggerLifeline = useCallback((type: "USE_AUDIENCE" | "USE_FIFTY_FIFTY" | "USE_PHONE") => {
    if (state.soundOn) getAudio()?.playInterruption("lifeline");
    dispatch({ type });
  }, [getAudio, state.soundOn]);

  const restartGame = useCallback(() => {
    audioRef.current?.stopAll();
    audioKeyRef.current = "";
    dispatch({ type: "RESTART" });
    setRestartOpen(false);
  }, []);

  useEffect(() => {
    let cancelTimer: (() => void) | undefined;
    if (state.phase === "transition") {
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
    const audioMode = gameAudioModeFor({ phase: state.phase, correct: state.correct });
    const selectedKey = audioMode === "lockIn" ? state.selectedIndex : "";
    const key = `${audioMode}-${state.questionIndex}-${selectedKey}-${state.correct}`;
    if (audioKeyRef.current === key) return;
    audioKeyRef.current = key;

    if (audioMode === "intro") director.play("intro");
    else if (audioMode === "question") {
      const questionCue = questionAudioCueFor(state.questionIndex, gameConfig.questions.length);
      if (state.questionIndex === 0) director.playSequence("letsPlay", questionCue, true);
      else director.play(questionCue, true);
    }
    else if (audioMode === "lockIn") director.play("lockIn");
    else if (audioMode === "correct" || audioMode === "wrong") director.play(audioMode);
    else if (audioMode === "victory") director.play("victory");
    else director.stopAll();
  }, [state.phase, state.questionIndex, state.selectedIndex, state.correct, state.soundOn]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (restartOpen) {
        if (event.key === "Escape") setRestartOpen(false);
        return;
      }
      const key = event.key.toUpperCase();
      const letterIndex = ANSWER_LETTERS.indexOf(key as (typeof ANSWER_LETTERS)[number]);
      const numberIndex = ["1", "2", "3", "4"].indexOf(event.key);
      const index = letterIndex >= 0 ? letterIndex : numberIndex;
      if (index >= 0) {
        event.preventDefault();
        if (
          state.phase === "question"
          || state.phase === "selected"
          || (state.phase === "revealed" && state.correct === false)
        ) {
          selectAnswer(index as AnswerIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restartOpen, selectAnswer, state.correct, state.phase]);

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
          <p className="eyebrow">Game setup</p>
          <h1>Fix these problems in app/content.ts</h1>
          <ul>{configErrors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      </main>
    );
  }

  return (
    <>
      {state.phase === "ready" && (
        <StartScreen onStart={startGame} />
      )}
      {state.phase === "intro" && <IntroScreen onContinue={() => dispatch({ type: "INTRO_DONE" })} />}
      {["question", "selected", "revealed", "transition"].includes(state.phase) && (
        <GameScreen
          state={state}
          onSelect={selectAnswer}
          onUseAudience={() => triggerLifeline("USE_AUDIENCE")}
          onUseFiftyFifty={() => triggerLifeline("USE_FIFTY_FIFTY")}
          onUsePhone={() => triggerLifeline("USE_PHONE")}
          onJumpToQuestion={jumpToQuestion}
          onContinue={() => dispatch({ type: "ADVANCE" })}
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
