import assert from "node:assert/strict";
import test from "node:test";
import {
  AudioDirector,
  SEQUENCE_CROSSFADE_MS,
  audioPlaybackMode,
  crossfadeVolumes,
  shouldStartSequenceCrossfade,
} from "../app/audio.ts";
import { questionAudioCueFor } from "../app/game.ts";

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

test("starts the sequence crossfade during the final 1.8 seconds", () => {
  assert.equal(SEQUENCE_CROSSFADE_MS, 1_800);
  assert.equal(shouldStartSequenceCrossfade(10.3, 8.4), false);
  assert.equal(shouldStartSequenceCrossfade(10.3, 8.5), true);
  assert.equal(shouldStartSequenceCrossfade(Number.NaN, 8.5), false);
});

test("uses an equal-power volume curve for smooth sequence transitions", () => {
  assert.deepEqual(crossfadeVolumes(0, 0.62, 0.34), { outgoing: 0.62, incoming: 0 });
  const midpoint = crossfadeVolumes(0.5, 0.62, 0.34);
  assert.ok(midpoint.outgoing > 0.43 && midpoint.outgoing < 0.45);
  assert.ok(midpoint.incoming > 0.23 && midpoint.incoming < 0.25);
  const end = crossfadeVolumes(1, 0.62, 0.34);
  assert.ok(end.outgoing < Number.EPSILON);
  assert.equal(end.incoming, 0.34);
});

test("maps question music to the three ladder ranges", () => {
  const cuesFor = (count) => Array.from({ length: count }, (_, index) => questionAudioCueFor(index, count));
  const low = "questionLow";
  const mid = "questionMid";
  const high = "questionHigh";
  assert.deepEqual(cuesFor(13), [low, low, low, low, mid, mid, mid, mid, high, high, high, high, high]);
  assert.deepEqual(cuesFor(15), [low, low, low, low, low, mid, mid, mid, mid, high, high, high, high, high, high]);
  assert.deepEqual(cuesFor(10), [low, low, low, mid, mid, mid, high, high, high, high]);
});

test("lifeline audio pauses the soundtrack, plays once, and resumes it", () => {
  const originalAudio = globalThis.Audio;

  class FakeAudio {
    static instances = [];
    listeners = new Map();
    currentTime = 0;
    loop = false;
    preload = "";
    volume = 1;
    playCount = 0;
    pauseCount = 0;

    constructor(source) {
      this.source = source;
      FakeAudio.instances.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    play() {
      this.playCount += 1;
      return Promise.resolve();
    }

    pause() {
      this.pauseCount += 1;
    }

    emit(type) {
      this.listeners.get(type)?.();
    }
  }

  globalThis.Audio = FakeAudio;
  try {
    const director = new AudioDirector({
      questionLow: "/audio/background.mp3",
      lifeline: "/audio/lifeline.mp3",
    });
    director.play("questionLow", true);
    const background = FakeAudio.instances[0];

    director.playInterruption("lifeline");
    const lifeline = FakeAudio.instances[1];
    assert.equal(background.pauseCount, 1);
    assert.equal(background.playCount, 1);
    assert.equal(lifeline.playCount, 1);
    assert.equal(lifeline.loop, false);

    lifeline.emit("ended");
    assert.equal(background.playCount, 2);
    director.stopAll();
  } finally {
    globalThis.Audio = originalAudio;
  }
});
