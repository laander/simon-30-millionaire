import type { AudioConfig, AudioCue } from "./game";

export type AudioPlaybackMode = "file" | "synth";

export function audioPlaybackMode(
  source: string | undefined,
  fileFailed = false,
): AudioPlaybackMode {
  return source?.trim() && !fileFailed ? "file" : "synth";
}

type ActiveNode = OscillatorNode | GainNode;

export class AudioDirector {
  private readonly config: AudioConfig;
  private context: AudioContext | null = null;
  private activeNodes = new Set<ActiveNode>();
  private currentFile: HTMLAudioElement | null = null;
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
      audio.volume = cue === "question" ? 0.34 : 0.62;
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

  stopAll(): void {
    this.playToken += 1;
    if (this.currentFile) {
      this.currentFile.pause();
      this.currentFile.currentTime = 0;
      this.currentFile = null;
    }
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

    if (cue === "question") {
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

    const sequences: Record<Exclude<AudioCue, "question">, number[]> = {
      intro: [110, 146.83, 164.81, 220, 293.66, 329.63, 440, 587.33],
      lockIn: [220, 277.18, 329.63, 415.3],
      correct: [261.63, 329.63, 392, 523.25],
      wrong: [196, 164.81, 138.59, 110],
      victory: [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5],
    };
    const notes = sequences[cue];
    const step = cue === "intro" ? 0.46 : cue === "victory" ? 0.18 : 0.12;
    notes.forEach((frequency, index) => {
      this.tone(
        context,
        frequency,
        index * step,
        cue === "intro" ? 1.15 : cue === "victory" ? 0.82 : 0.42,
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
