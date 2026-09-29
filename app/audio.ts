import type { AudioConfig, AudioCue, QuestionAudioCue } from "./game";

export type AudioPlaybackMode = "file" | "synth";

export const SEQUENCE_CROSSFADE_MS = 1_800;

export function shouldStartSequenceCrossfade(
  duration: number,
  currentTime: number,
  crossfadeMs = SEQUENCE_CROSSFADE_MS,
): boolean {
  return Number.isFinite(duration) && duration > 0 && duration - currentTime <= crossfadeMs / 1_000 + 0.01;
}

export function crossfadeVolumes(
  progress: number,
  outgoingVolume: number,
  incomingVolume: number,
): { outgoing: number; incoming: number } {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const angle = clampedProgress * Math.PI * 0.5;
  return {
    outgoing: Math.cos(angle) * outgoingVolume,
    incoming: Math.sin(angle) * incomingVolume,
  };
}

export function audioPlaybackMode(
  source: string | undefined,
  fileFailed = false,
): AudioPlaybackMode {
  return source?.trim() && !fileFailed ? "file" : "synth";
}

type ActiveNode = OscillatorNode | GainNode;

function isQuestionCue(cue: AudioCue): cue is QuestionAudioCue {
  return cue === "questionLow" || cue === "questionMid" || cue === "questionHigh";
}

function cueVolume(cue: AudioCue): number {
  return isQuestionCue(cue) ? 0.34 : 0.62;
}

export class AudioDirector {
  private readonly config: AudioConfig;
  private context: AudioContext | null = null;
  private activeNodes = new Set<ActiveNode>();
  private currentFile: HTMLAudioElement | null = null;
  private incomingFile: HTMLAudioElement | null = null;
  private interruptionFile: HTMLAudioElement | null = null;
  private interruptedFile: HTMLAudioElement | null = null;
  private sequenceTimer: ReturnType<typeof setTimeout> | null = null;
  private interruptionTimer: ReturnType<typeof setTimeout> | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private incomingTargetVolume = 0;
  private playToken = 0;

  constructor(config: AudioConfig) {
    this.config = config;
  }

  async unlock(): Promise<void> {
    if (typeof window === "undefined") return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }

  play(cue: AudioCue, loop = false): void {
    this.stopAll();
    const source = this.config[cue];
    const token = this.playToken;
    if (audioPlaybackMode(source) === "file" && source) {
      const audio = new Audio(source);
      audio.loop = loop;
      audio.preload = "auto";
      audio.volume = cueVolume(cue);
      this.currentFile = audio;
      const fallback = () => {
        if (this.playToken !== token || this.currentFile !== audio) return;
        this.currentFile = null;
        this.playSynth(cue);
      };
      audio.addEventListener("error", fallback, { once: true });
      void audio.play().catch(fallback);
      return;
    }
    this.playSynth(cue);
  }

  playSequence(firstCue: AudioCue, nextCue: AudioCue, loopNext = false): void {
    this.stopAll();
    const source = this.config[firstCue];
    const token = this.playToken;
    let crossfadeStarted = false;
    const advance = () => {
      if (this.playToken !== token || crossfadeStarted) return;
      this.sequenceTimer = null;
      this.play(nextCue, loopNext);
    };

    if (audioPlaybackMode(source) === "file" && source) {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = cueVolume(firstCue);
      this.currentFile = audio;

      const beginCrossfade = () => {
        if (
          crossfadeStarted
          || this.playToken !== token
          || this.currentFile !== audio
          || !shouldStartSequenceCrossfade(audio.duration, audio.currentTime)
        ) {
          return;
        }

        const nextSource = this.config[nextCue];
        if (audioPlaybackMode(nextSource) !== "file" || !nextSource) return;

        crossfadeStarted = true;
        const incoming = new Audio(nextSource);
        const outgoingVolume = cueVolume(firstCue);
        const incomingVolume = cueVolume(nextCue);
        incoming.loop = loopNext;
        incoming.preload = "auto";
        incoming.volume = 0;
        this.incomingFile = incoming;
        this.incomingTargetVolume = incomingVolume;

        const incomingFallback = () => {
          if (this.playToken !== token || this.incomingFile !== incoming) return;
          incoming.pause();
          incoming.currentTime = 0;
          this.incomingFile = null;
          this.incomingTargetVolume = 0;
          crossfadeStarted = false;
          audio.volume = outgoingVolume;
          if (audio.ended) advance();
        };

        incoming.addEventListener("error", incomingFallback, { once: true });
        void incoming.play().then(() => {
          if (this.playToken !== token || this.incomingFile !== incoming) return;
          const startedAt = Date.now();
          this.fadeTimer = setInterval(() => {
            if (this.playToken !== token || this.incomingFile !== incoming) {
              if (this.fadeTimer) clearInterval(this.fadeTimer);
              this.fadeTimer = null;
              return;
            }

            const progress = (Date.now() - startedAt) / SEQUENCE_CROSSFADE_MS;
            const volumes = crossfadeVolumes(progress, outgoingVolume, incomingVolume);
            audio.volume = volumes.outgoing;
            incoming.volume = volumes.incoming;

            if (progress >= 1) {
              if (this.fadeTimer) clearInterval(this.fadeTimer);
              this.fadeTimer = null;
              audio.pause();
              audio.currentTime = 0;
              this.currentFile = incoming;
              this.incomingFile = null;
              this.incomingTargetVolume = 0;
            }
          }, 40);
        }).catch(incomingFallback);
      };

      audio.addEventListener("timeupdate", beginCrossfade);
      audio.addEventListener("ended", advance, { once: true });
      const fallback = () => {
        if (this.playToken !== token || this.currentFile !== audio) return;
        advance();
      };
      audio.addEventListener("error", fallback, { once: true });
      void audio.play().catch(fallback);
      return;
    }

    this.playSynth(firstCue);
    this.sequenceTimer = setTimeout(advance, 1_800);
  }

  playInterruption(cue: AudioCue): void {
    this.finishInterruption(false);
    this.settleSequenceCrossfade();

    const source = this.config[cue];
    const token = this.playToken;
    const background = this.currentFile;
    this.interruptedFile = background;
    background?.pause();

    const resume = () => {
      if (this.playToken !== token) return;
      this.finishInterruption(true);
    };

    if (audioPlaybackMode(source) === "file" && source) {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = cueVolume(cue);
      this.interruptionFile = audio;
      audio.addEventListener("ended", resume, { once: true });
      const fallback = () => {
        if (this.playToken !== token || this.interruptionFile !== audio) return;
        audio.pause();
        this.interruptionFile = null;
        this.playSynth(cue);
        this.interruptionTimer = setTimeout(resume, 1_800);
      };
      audio.addEventListener("error", fallback, { once: true });
      void audio.play().catch(fallback);
      return;
    }

    this.playSynth(cue);
    this.interruptionTimer = setTimeout(resume, 1_800);
  }

  stopAll(): void {
    this.playToken += 1;
    this.finishInterruption(false);
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.currentFile) {
      this.currentFile.pause();
      this.currentFile.currentTime = 0;
      this.currentFile = null;
    }
    if (this.incomingFile) {
      this.incomingFile.pause();
      this.incomingFile.currentTime = 0;
      this.incomingFile = null;
    }
    this.incomingTargetVolume = 0;
    this.activeNodes.forEach((node) => {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch {
        // A scheduled oscillator may already have stopped.
      }
    });
    this.activeNodes.clear();
  }

  private settleSequenceCrossfade(): void {
    const incoming = this.incomingFile;
    if (!incoming) return;
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.currentFile) {
      this.currentFile.pause();
      this.currentFile.currentTime = 0;
    }
    incoming.pause();
    incoming.volume = this.incomingTargetVolume;
    this.currentFile = incoming;
    this.incomingFile = null;
    this.incomingTargetVolume = 0;
  }

  private finishInterruption(resume: boolean): void {
    if (this.interruptionTimer) {
      clearTimeout(this.interruptionTimer);
      this.interruptionTimer = null;
    }
    if (this.interruptionFile) {
      this.interruptionFile.pause();
      this.interruptionFile.currentTime = 0;
      this.interruptionFile = null;
    }

    const background = this.interruptedFile;
    this.interruptedFile = null;
    if (resume && background && this.currentFile === background) {
      void background.play().catch(() => {
        // A later state change will select the next applicable soundtrack.
      });
    }
  }

  async destroy(): Promise<void> {
    this.stopAll();
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.context = null;
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    this.context ??= new AudioContext();
    return this.context;
  }

  private connect(node: ActiveNode): void {
    this.activeNodes.add(node);
    if (node instanceof OscillatorNode) {
      node.addEventListener("ended", () => {
        node.disconnect();
        this.activeNodes.delete(node);
      });
    }
  }

  private tone(
    context: AudioContext,
    frequency: number,
    startOffset: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + startOffset;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.04, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    this.connect(oscillator);
    this.connect(gain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private playSynth(cue: AudioCue): void {
    const context = this.getContext();
    if (!context) return;

    if (isQuestionCue(cue)) {
      const master = context.createGain();
      master.gain.setValueAtTime(0.025, context.currentTime);
      master.connect(context.destination);
      this.connect(master);
      [55, 82.41, 110].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = index * 4;
        oscillator.connect(master);
        this.connect(oscillator);
        oscillator.start();
      });
      const pulse = context.createOscillator();
      const pulseDepth = context.createGain();
      pulse.frequency.value = 0.32;
      pulseDepth.gain.value = 0.012;
      pulse.connect(pulseDepth).connect(master.gain);
      this.connect(pulse);
      this.connect(pulseDepth);
      pulse.start();
      return;
    }

    const sequences: Record<Exclude<AudioCue, QuestionAudioCue>, number[]> = {
      intro: [110, 146.83, 164.81, 220, 293.66, 329.63, 440, 587.33],
      letsPlay: [196, 261.63, 329.63, 392, 523.25],
      lifeline: [392, 523.25, 659.25, 783.99],
      lockIn: [220, 277.18, 329.63, 415.3],
      correct: [261.63, 329.63, 392, 523.25],
      wrong: [196, 164.81, 138.59, 110],
      victory: [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5],
    };
    const notes = sequences[cue];
    const step = cue === "intro" ? 0.46 : cue === "victory" || cue === "letsPlay" ? 0.18 : 0.12;
    notes.forEach((frequency, index) => {
      this.tone(
        context,
        frequency,
        index * step,
        cue === "intro" ? 1.15 : cue === "victory" || cue === "letsPlay" ? 0.82 : 0.42,
        cue === "wrong" ? 0.075 : 0.095,
        cue === "wrong" ? "sawtooth" : "triangle",
      );
    });
    if (cue === "intro" || cue === "victory") {
      [65.41, 98, 130.81].forEach((frequency) =>
        this.tone(context, frequency, 0, cue === "intro" ? 5.8 : 3.2, 0.035, "sine"),
      );
    }
  }
}
