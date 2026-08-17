import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("includes desktop, tablet, narrow phone, and short-screen layouts", () => {
  assert.match(css, /@media \(max-width: 1050px\)/);
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
  assert.match(page, /aria-live="assertive"/);
  assert.match(page, /state === "correct" \? "Correct"/);
  assert.match(page, /state === "incorrect" \? "Incorrect"/);
});

test("reduced motion and large touch controls are present", () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.answer-button[\s\S]*min-height: 3\.75rem/);
  assert.match(css, /\.game-controls \.utility-button[\s\S]*min-height: 2\.8rem/);
});
