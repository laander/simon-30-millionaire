import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { content } from "../app/content.ts";
import { validateGameConfig } from "../app/game.ts";

function publicFile(path) {
  return new URL(`../public${path}`, import.meta.url);
}

test("the content in app/content.ts is valid", () => {
  assert.deepEqual(validateGameConfig(content), []);
});

test("the logo image exists in public/", async () => {
  await assert.doesNotReject(access(publicFile(content.logo)), `Missing logo file: public${content.logo}`);
});

test("every configured audio file exists in public/", async () => {
  for (const [cue, source] of Object.entries(content.audio)) {
    await assert.doesNotReject(access(publicFile(source)), `Missing ${cue} audio file: public${source}`);
  }
});
