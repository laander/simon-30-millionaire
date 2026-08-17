import assert from "node:assert/strict";
import test from "node:test";
import { audioPlaybackMode } from "../app/audio.ts";

test("uses configured audio files when they are healthy", () => {
  assert.equal(audioPlaybackMode("/audio/intro.mp3"), "file");
});

test("falls back when no file is configured", () => {
  assert.equal(audioPlaybackMode(undefined), "synth");
  assert.equal(audioPlaybackMode(""), "synth");
  assert.equal(audioPlaybackMode("   "), "synth");
});

test("falls back when file playback fails", () => {
  assert.equal(audioPlaybackMode("/audio/missing.mp3", true), "synth");
});
