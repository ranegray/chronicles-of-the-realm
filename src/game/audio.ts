export type SfxId =
  | "button"
  | "hit"
  | "miss"
  | "crit"
  | "loot"
  | "threat"
  | "descend"
  | "extract"
  | "death"
  | "flee"
  | "heal"
  | "equip";

interface ToneStep {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

let audioContext: AudioContext | undefined;
let muted = false;

const MASTER_GAIN = 0.08;

const SFX_PATTERNS: Record<SfxId, ToneStep[]> = {
  button: [{ frequency: 520, duration: 0.035, type: "triangle", gain: 0.45 }],
  hit: [
    { frequency: 140, duration: 0.055, type: "square", gain: 0.65 },
    { frequency: 92, duration: 0.04, type: "sawtooth", gain: 0.35 }
  ],
  miss: [{ frequency: 210, duration: 0.07, type: "triangle", gain: 0.32 }],
  crit: [
    { frequency: 420, duration: 0.045, type: "triangle", gain: 0.55 },
    { frequency: 760, duration: 0.08, type: "triangle", gain: 0.5 }
  ],
  loot: [
    { frequency: 620, duration: 0.055, type: "sine", gain: 0.38 },
    { frequency: 930, duration: 0.075, type: "sine", gain: 0.34 }
  ],
  threat: [
    { frequency: 90, duration: 0.09, type: "sawtooth", gain: 0.42 },
    { frequency: 72, duration: 0.12, type: "sawtooth", gain: 0.32 }
  ],
  descend: [
    { frequency: 180, duration: 0.08, type: "sine", gain: 0.38 },
    { frequency: 115, duration: 0.12, type: "sine", gain: 0.34 },
    { frequency: 70, duration: 0.16, type: "sine", gain: 0.3 }
  ],
  extract: [
    { frequency: 330, duration: 0.06, type: "triangle", gain: 0.36 },
    { frequency: 520, duration: 0.08, type: "triangle", gain: 0.34 },
    { frequency: 740, duration: 0.11, type: "sine", gain: 0.32 }
  ],
  death: [
    { frequency: 160, duration: 0.12, type: "sawtooth", gain: 0.42 },
    { frequency: 88, duration: 0.18, type: "sawtooth", gain: 0.34 },
    { frequency: 44, duration: 0.22, type: "sine", gain: 0.3 }
  ],
  flee: [
    { frequency: 330, duration: 0.045, type: "triangle", gain: 0.32 },
    { frequency: 260, duration: 0.045, type: "triangle", gain: 0.28 }
  ],
  heal: [
    { frequency: 390, duration: 0.05, type: "sine", gain: 0.32 },
    { frequency: 590, duration: 0.08, type: "sine", gain: 0.3 }
  ],
  equip: [{ frequency: 300, duration: 0.055, type: "triangle", gain: 0.36 }]
};

export function setAudioMuted(value: boolean): void {
  muted = value;
}

export function isAudioMuted(): boolean {
  return muted;
}

export function playSfx(id: SfxId): void {
  if (muted || typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    audioContext ??= new AudioContextCtor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    playPattern(audioContext, SFX_PATTERNS[id]);
  } catch {
    // Audio should never interrupt gameplay if the browser refuses playback.
  }
}

function playPattern(ctx: AudioContext, pattern: ToneStep[]): void {
  let start = ctx.currentTime;
  for (const step of pattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step.type ?? "sine";
    osc.frequency.setValueAtTime(step.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(MASTER_GAIN * (step.gain ?? 1), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + step.duration + 0.02);
    start += step.duration * 0.82;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
