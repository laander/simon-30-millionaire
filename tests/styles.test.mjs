import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("includes desktop, tablet, narrow phone, and short-screen layouts", () => {
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /@media \(max-height: 650px\) and \(max-width: 700px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: 1fr/);
});

test("keeps the supplied logo centered when cropped into the crest", () => {
  assert.match(css, /\.crest-logo-wrap[\s\S]*aspect-ratio: 1/);
  assert.match(css, /\.crest-logo[\s\S]*height: 100%[\s\S]*margin-left: 50%[\s\S]*translateX\(-50%\)/);
});

test("answer feedback is not communicated by color alone", () => {
  assert.match(page, /answer-state-label/);
  assert.doesNotMatch(page, /answer-locked/);
  assert.match(page, /aria-live="assertive"/);
  assert.match(page, /\? text\.answerSelected/);
  assert.match(page, /\? text\.answerCorrect/);
  assert.match(page, /\? text\.answerIncorrect/);
});

test("places every answer status on the right side of the answer", () => {
  assert.match(page, /answer-copy[\s\S]*stateLabel && <span className="answer-state-label"/);
  assert.match(css, /\.answer-state-label[\s\S]*justify-self: end/);
});

test("shows all three one-use lifelines in the sidebar and on narrow screens", () => {
  assert.match(page, /label=\{text\.fiftyFifty\}/);
  assert.match(page, /label=\{text\.askAudience\}/);
  assert.match(page, /label=\{text\.phoneFriend\}/);
  assert.match(page, /className="sidebar-lifelines"/);
  assert.match(page, /className="mobile-lifelines"/);
  assert.match(page, /className="lifeline-tooltip" role="tooltip"/);
  assert.match(page, /used && <span className="lifeline-used-mark"/);
  assert.match(page, /title=\{tooltip\}/);
  assert.match(css, /\.mobile-lifelines[\s\S]*display: none/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*\.mobile-lifelines[\s\S]*display: flex/);
  assert.match(css, /\.lifeline-button:hover \.lifeline-tooltip[\s\S]*opacity: 1/);
  assert.match(css, /\.sidebar-lifelines \.lifeline-icon[\s\S]*font-size: 1\.1rem/);
  assert.match(css, /\.lifeline-used-mark[\s\S]*color: #ff263f/);
  assert.match(css, /\.answer-eliminated[\s\S]*opacity: 0\.3/);
  assert.doesNotMatch(page, /function AudienceScreen|AUDIENCE_CHOOSE|AUDIENCE_RETURN/);
  assert.match(css, /\.compact-utility-button[\s\S]*opacity: 0\.78/);
});

test("enlarges the sidebar and lifelines without a redundant game title", () => {
  assert.doesNotMatch(page, /className="mini-brand"/);
  assert.match(css, /\.game-header[\s\S]*justify-content: flex-end/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 21rem/);
  assert.match(css, /\.sidebar-lifelines \.lifeline-button[\s\S]*min-height: 4rem/);
  assert.match(css, /\.money-ladder li[\s\S]*min-height: clamp\(2\.25rem, 4\.5vh, 2\.7rem\)/);
});

test("renders every money-ladder step as a full keyboard-accessible button", () => {
  assert.match(page, /className="ladder-step-button"/);
  assert.match(page, /aria-label=\{text\.jumpToQuestion\(/);
  assert.match(css, /\.ladder-step-button[\s\S]*width: 100%[\s\S]*cursor: pointer/);
  assert.match(css, /\.ladder-step-button:focus-visible/);
});

test("reduced motion and large touch controls are present", () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.answer-button[\s\S]*min-height: clamp\(5rem, 10vh, 6rem\)/);
  assert.match(css, /\.game-controls \.utility-button[\s\S]*min-height: 2\.8rem/);
});

test("question and answer text use the enlarged legible scale", () => {
  assert.match(css, /\.question-inner h1[\s\S]*font-size: clamp\(1\.65rem, 2\.8vw, 2\.75rem\)/);
  assert.match(css, /\.answer-copy[\s\S]*font-size: clamp\(1\.3rem, 2vw, 1\.65rem\)/);
});

test("uses a substantially larger stage logo without showing it on short screens", () => {
  assert.match(css, /\.stage-logo[\s\S]*width: clamp\(16rem, min\(34vw, 42vh\), 30rem\)/);
  assert.match(css, /@media \(max-height: 760px\)[\s\S]*\.game-screen \.stage-logo[\s\S]*display: none/);
});

test("keeps zoomed and smaller layouts scrollable with vertically stacked answers", () => {
  assert.match(css, /html,[\s\S]*body[\s\S]*overflow: hidden[\s\S]*overscroll-behavior: none/);
  assert.match(css, /\.game-screen[\s\S]*height: 100dvh[\s\S]*overflow: hidden/);
  assert.match(css, /\.game-main[\s\S]*height: 100%[\s\S]*min-height: 0[\s\S]*overflow-y: auto[\s\S]*overscroll-behavior-y: contain/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*\.answers-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-height: 760px\) and \(min-width: 1181px\)/);
});

test("uses a black one-button ready screen and a manually continued intro", () => {
  assert.match(css, /\.ready-screen[\s\S]*background: #000/);
  assert.match(page, /ready-start-button[\s\S]*text\.startShow/);
  assert.match(page, /intro-callout[\s\S]*gameConfig\.subtitle/);
  assert.match(page, /intro-start-button[\s\S]*text\.introContinue/);
  assert.match(page, /audioMode === "intro"\) director\.play\("intro"\)/);
  assert.doesNotMatch(page, /director\.play\("intro", true\)/);
  assert.doesNotMatch(page, /INTRO_DURATION|onSkip|Spring introen over/);
});

test("keeps wrong answers red for retries and only continues after a correct answer", () => {
  assert.match(page, /state\.incorrectIndexes\.includes\(index\)\) return "incorrect"/);
  assert.match(page, /state\.phase === "revealed" && state\.correct === true[\s\S]*continue-button[\s\S]*text\.continue/);
  assert.match(page, /retryingAfterWrongAnswer[\s\S]*canSelectAnswer/);
  assert.match(page, /onContinue=\{\(\) => dispatch\(\{ type: "ADVANCE" \}\)\}/);
  assert.doesNotMatch(page, /RESULT_DURATION|state\.phase === "revealed"\) \{\s*cancelTimer/);
  assert.match(css, /\.result-actions[\s\S]*position: absolute[\s\S]*bottom: calc\(100% \+ 0\.75rem\)/);
  assert.match(css, /\.continue-button[\s\S]*min-height: 3\.35rem/);
});
