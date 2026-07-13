import { useEffect, useRef } from "react";
import { getAudioContext, isAudioMuted } from "./audio";
import { useGameStore } from "../store/gameStore";
import type { ScreenId, ThreatLevel } from "./types";

// ---------------------------------------------------------------------------
// Pure threat -> sound mapping (unit tested in src/tests/ambient.test.ts)
// ---------------------------------------------------------------------------

export interface DungeonAmbientParams {
  /** Loudness of the core drone bed, in dBFS. */
  droneGainDb: number;
  /** Lowpass cutoff (Hz) the slow LFO sweeps around. */
  filterHz: number;
  /** Loudness of the detuned semitone-down "dissonant" partial, in dBFS.
   *  Number.NEGATIVE_INFINITY means silent (not yet faded in). */
  dissonantGainDb: number;
  /** Whether the slow irregular pulse (threat 5 only) should run. */
  pulseActive: boolean;
  /** Base rate (Hz) of the pulse LFO when active. */
  pulseRateHz: number;
}

/** Ambient bed base level while in the village. Warm, barely-there. */
export const VILLAGE_DRONE_GAIN_DB = -34;
export const VILLAGE_NOISE_GAIN_DB = -30;

/** How much the ambient bed ducks under combat SFX. */
export const COMBAT_DUCK_DB = -4;

/** Smooth transition times, in seconds. */
export const BED_CROSSFADE_SECONDS = 2;
export const DUCK_RAMP_SECONDS = 1;

const ROOT_FREQUENCY = 58; // ~Bb1, low drone root
const DETUNE_RATIO = 1.006; // slight beating for thickness
const DISSONANT_SEMITONE_RATIO = 2 ** (-1 / 12); // a semitone below root

export function dbToGain(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.pow(10, db / 20);
}

function clampThreatLevel(level: number): ThreatLevel {
  const rounded = Math.round(level);
  return Math.max(0, Math.min(5, Number.isFinite(rounded) ? rounded : 0)) as ThreatLevel;
}

/**
 * Maps the current run's threat level (0-5) to dungeon ambient parameters.
 * Higher threat: slightly louder drone, a brighter filter, a semitone-down
 * dissonant partial fading in from threat 3, and a slow irregular pulse at
 * threat 5. Pure and deterministic so the mapping itself is unit testable
 * separately from the WebAudio graph.
 */
export function computeDungeonAmbientParams(threatLevel: number): DungeonAmbientParams {
  const level = clampThreatLevel(threatLevel);
  const droneGainDb = -30 + level * 2; // -30 .. -20 dB
  const filterHz = 300 + level * 45; // 300 .. 525 Hz
  const dissonantGainDb = level >= 3 ? -30 + (level - 2) * 8 : Number.NEGATIVE_INFINITY; // -22 / -14 / -6
  const pulseActive = level >= 5;
  const pulseRateHz = pulseActive ? 0.18 : 0;

  return { droneGainDb, filterHz, dissonantGainDb, pulseActive, pulseRateHz };
}

export function dungeonRootFrequencies(): {
  root: number;
  detuned: number;
  dissonant: number;
} {
  return {
    root: ROOT_FREQUENCY,
    detuned: ROOT_FREQUENCY * DETUNE_RATIO,
    dissonant: ROOT_FREQUENCY * DISSONANT_SEMITONE_RATIO
  };
}

// ---------------------------------------------------------------------------
// WebAudio engine
// ---------------------------------------------------------------------------

type AmbientBed = "none" | "dungeon" | "village";

interface DungeonBedNodes {
  bedGain: GainNode;
  filter: BiquadFilterNode;
  filterLfo: OscillatorNode;
  filterLfoDepth: GainNode;
  oscRoot: OscillatorNode;
  oscDetuned: OscillatorNode;
  oscDissonant: OscillatorNode;
  dissonantGain: GainNode;
  pulseLfoA: OscillatorNode;
  pulseLfoB: OscillatorNode;
  pulseDepth: GainNode;
  noiseSource: AudioBufferSourceNode;
  noiseFilter: BiquadFilterNode;
  noiseGain: GainNode;
}

interface VillageBedNodes {
  bedGain: GainNode;
  windSource: AudioBufferSourceNode;
  windFilter: BiquadFilterNode;
  windGain: GainNode;
  bellTimer: ReturnType<typeof setTimeout> | undefined;
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function rampTo(param: AudioParam, value: number, ctx: AudioContext, seconds: number): void {
  try {
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(value, ctx.currentTime + seconds);
  } catch {
    // Ignore automation errors from an already-closed context.
  }
}

/**
 * Owns the ambient WebAudio graph: a dungeon drone bed and a village wind
 * bed, cross-faded smoothly on screen change, ducked during combat, and torn
 * down cleanly whenever a bed is no longer needed. Never throws — audio
 * should never interrupt gameplay.
 */
export class AmbientEngine {
  private ctx: AudioContext | undefined;
  private masterGain: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;

  private dungeonBed: DungeonBedNodes | undefined;
  private villageBed: VillageBedNodes | undefined;
  private dungeonTeardownTimer: ReturnType<typeof setTimeout> | undefined;
  private villageTeardownTimer: ReturnType<typeof setTimeout> | undefined;

  private currentBed: AmbientBed = "none";
  private screen: ScreenId | "none" = "none";
  private threatLevel: ThreatLevel = 0;
  private ducking = false;
  private muted = isAudioMuted();

  /** Call from a first click/keydown handler to satisfy autoplay policy. */
  resume(): void {
    if (this.ctx) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);
    this.applyBedForScreen();
    this.applyMasterLevel();
  }

  setScreen(screen: ScreenId): void {
    this.screen = screen;
    this.ducking = screen === "combat";
    this.applyBedForScreen();
    this.applyMasterLevel();
  }

  setThreatLevel(level: ThreatLevel): void {
    this.threatLevel = level;
    this.applyThreatParams();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterLevel();
  }

  dispose(): void {
    this.cancelDungeonTeardown();
    this.cancelVillageTeardown();
    this.teardownDungeonBed();
    this.teardownVillageBed();
    this.masterGain?.disconnect();
    this.masterGain = undefined;
    this.ctx = undefined;
    this.currentBed = "none";
  }

  private desiredBed(): AmbientBed {
    if (this.screen === "dungeon" || this.screen === "combat") return "dungeon";
    if (this.screen === "village") return "village";
    return "none";
  }

  private applyBedForScreen(): void {
    if (!this.ctx || !this.masterGain) return;
    const desired = this.desiredBed();
    if (desired === this.currentBed) return;

    const ctx = this.ctx;
    const previousBed = this.currentBed;
    this.currentBed = desired;

    if (previousBed === "dungeon" && this.dungeonBed) {
      rampTo(this.dungeonBed.bedGain.gain, 0, ctx, BED_CROSSFADE_SECONDS);
      this.scheduleDungeonTeardown();
    }
    if (previousBed === "village" && this.villageBed) {
      rampTo(this.villageBed.bedGain.gain, 0, ctx, BED_CROSSFADE_SECONDS);
      this.scheduleVillageTeardown();
    }

    try {
      if (desired === "dungeon") {
        // Cancel a pending fade-out teardown if we're returning to this bed
        // within the crossfade window (e.g. a quick village hub detour).
        this.cancelDungeonTeardown();
        if (!this.dungeonBed) this.dungeonBed = this.buildDungeonBed(ctx, this.masterGain);
      }
      if (desired === "village") {
        this.cancelVillageTeardown();
        if (!this.villageBed) this.villageBed = this.buildVillageBed(ctx, this.masterGain);
      }
    } catch {
      // Never let a graph-build failure break gameplay.
    }

    this.applyThreatParams();
    this.applyVillageLevel();
  }

  private scheduleDungeonTeardown(): void {
    if (this.dungeonTeardownTimer) clearTimeout(this.dungeonTeardownTimer);
    this.dungeonTeardownTimer = setTimeout(() => {
      this.dungeonTeardownTimer = undefined;
      this.teardownDungeonBed();
    }, (BED_CROSSFADE_SECONDS + 0.2) * 1000);
  }

  private cancelDungeonTeardown(): void {
    if (!this.dungeonTeardownTimer) return;
    clearTimeout(this.dungeonTeardownTimer);
    this.dungeonTeardownTimer = undefined;
  }

  private scheduleVillageTeardown(): void {
    if (this.villageTeardownTimer) clearTimeout(this.villageTeardownTimer);
    this.villageTeardownTimer = setTimeout(() => {
      this.villageTeardownTimer = undefined;
      this.teardownVillageBed();
    }, (BED_CROSSFADE_SECONDS + 0.2) * 1000);
  }

  private cancelVillageTeardown(): void {
    if (!this.villageTeardownTimer) return;
    clearTimeout(this.villageTeardownTimer);
    this.villageTeardownTimer = undefined;
  }

  /** Re-ramps the village bed to its active level; a no-op unless the
   *  village bed is current (covers both fresh builds and revivals of a
   *  bed that was mid fade-out). */
  private applyVillageLevel(): void {
    if (!this.ctx || !this.villageBed || this.currentBed !== "village") return;
    rampTo(this.villageBed.bedGain.gain, dbToGain(VILLAGE_DRONE_GAIN_DB), this.ctx, BED_CROSSFADE_SECONDS);
  }

  private applyThreatParams(): void {
    if (!this.ctx || !this.dungeonBed || this.currentBed !== "dungeon") return;
    const ctx = this.ctx;
    const bed = this.dungeonBed;
    const params = computeDungeonAmbientParams(this.threatLevel);

    rampTo(bed.bedGain.gain, dbToGain(params.droneGainDb), ctx, BED_CROSSFADE_SECONDS);
    rampTo(bed.filter.frequency, params.filterHz, ctx, BED_CROSSFADE_SECONDS);
    rampTo(bed.dissonantGain.gain, dbToGain(params.dissonantGainDb), ctx, BED_CROSSFADE_SECONDS);
    rampTo(
      bed.pulseDepth.gain,
      params.pulseActive ? dbToGain(params.droneGainDb) * 0.25 : 0,
      ctx,
      BED_CROSSFADE_SECONDS
    );
  }

  private applyMasterLevel(): void {
    if (!this.ctx || !this.masterGain) return;
    const target = this.muted ? 0 : this.ducking ? dbToGain(COMBAT_DUCK_DB) : 1;
    rampTo(this.masterGain.gain, target, this.ctx, DUCK_RAMP_SECONDS);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    this.noiseBuffer ??= createNoiseBuffer(ctx);
    return this.noiseBuffer;
  }

  private buildDungeonBed(ctx: AudioContext, destination: AudioNode): DungeonBedNodes {
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bedGain.connect(destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 300;
    filter.Q.value = 0.6;
    filter.connect(bedGain);

    const filterLfo = ctx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.value = 0.04;
    const filterLfoDepth = ctx.createGain();
    filterLfoDepth.gain.value = 60;
    filterLfo.connect(filterLfoDepth);
    filterLfoDepth.connect(filter.frequency);
    filterLfo.start();

    const freqs = dungeonRootFrequencies();

    const oscRoot = ctx.createOscillator();
    oscRoot.type = "sine";
    oscRoot.frequency.value = freqs.root;
    const oscRootGain = ctx.createGain();
    oscRootGain.gain.value = 0.55;
    oscRoot.connect(oscRootGain);
    oscRootGain.connect(filter);
    oscRoot.start();

    const oscDetuned = ctx.createOscillator();
    oscDetuned.type = "sine";
    oscDetuned.frequency.value = freqs.detuned;
    const oscDetunedGain = ctx.createGain();
    oscDetunedGain.gain.value = 0.3;
    oscDetuned.connect(oscDetunedGain);
    oscDetunedGain.connect(filter);
    oscDetuned.start();

    const dissonantGain = ctx.createGain();
    dissonantGain.gain.value = 0;
    dissonantGain.connect(filter);
    const oscDissonant = ctx.createOscillator();
    oscDissonant.type = "sine";
    oscDissonant.frequency.value = freqs.dissonant;
    oscDissonant.connect(dissonantGain);
    oscDissonant.start();

    // Two slightly-offset slow LFOs summed together read as an irregular
    // pulse rather than a clean metronomic one.
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0;
    pulseDepth.connect(bedGain.gain);
    const pulseLfoA = ctx.createOscillator();
    pulseLfoA.type = "sine";
    pulseLfoA.frequency.value = 0.13;
    pulseLfoA.connect(pulseDepth);
    pulseLfoA.start();
    const pulseLfoB = ctx.createOscillator();
    pulseLfoB.type = "sine";
    pulseLfoB.frequency.value = 0.19;
    pulseLfoB.connect(pulseDepth);
    pulseLfoB.start();

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.getNoiseBuffer(ctx);
    noiseSource.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 480;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04; // very quiet, "distant air" floor
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bedGain);
    noiseSource.start();

    return {
      bedGain,
      filter,
      filterLfo,
      filterLfoDepth,
      oscRoot,
      oscDetuned,
      oscDissonant,
      dissonantGain,
      pulseLfoA,
      pulseLfoB,
      pulseDepth,
      noiseSource,
      noiseFilter,
      noiseGain
    };
  }

  private teardownDungeonBed(): void {
    const bed = this.dungeonBed;
    if (!bed) return;
    this.dungeonBed = undefined;
    for (const node of [bed.filterLfo, bed.oscRoot, bed.oscDetuned, bed.oscDissonant, bed.pulseLfoA, bed.pulseLfoB]) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    try {
      bed.noiseSource.stop();
    } catch {
      // already stopped
    }
    for (const node of [
      bed.bedGain,
      bed.filter,
      bed.filterLfo,
      bed.filterLfoDepth,
      bed.oscRoot,
      bed.oscDetuned,
      bed.oscDissonant,
      bed.dissonantGain,
      bed.pulseLfoA,
      bed.pulseLfoB,
      bed.pulseDepth,
      bed.noiseSource,
      bed.noiseFilter,
      bed.noiseGain
    ]) {
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    }
  }

  private buildVillageBed(ctx: AudioContext, destination: AudioNode): VillageBedNodes {
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bedGain.connect(destination);

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.getNoiseBuffer(ctx);
    windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = dbToGain(VILLAGE_NOISE_GAIN_DB);
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(bedGain);
    windSource.start();

    const bed: VillageBedNodes = { bedGain, windSource, windFilter, windGain, bellTimer: undefined };
    this.scheduleVillageBell(bed);
    return bed;
  }

  private scheduleVillageBell(bed: VillageBedNodes): void {
    const delayMs = (20 + Math.random() * 40) * 1000;
    bed.bellTimer = setTimeout(() => {
      if (this.villageBed !== bed || !this.ctx) return;
      this.playVillageBell(bed);
      this.scheduleVillageBell(bed);
    }, delayMs);
  }

  private playVillageBell(bed: VillageBedNodes): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const start = ctx.currentTime;
      const decay = 3.5;
      const baseFreq = 480 + Math.random() * 220;

      for (const [ratio, level] of [
        [1, 0.05],
        [2.4, 0.02]
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = baseFreq * ratio;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(level, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
        osc.connect(gain);
        gain.connect(bed.bedGain);
        osc.start(start);
        osc.stop(start + decay + 0.1);
      }
    } catch {
      // Skip this bell; the ambient bed keeps running.
    }
  }

  private teardownVillageBed(): void {
    const bed = this.villageBed;
    if (!bed) return;
    this.villageBed = undefined;
    if (bed.bellTimer) clearTimeout(bed.bellTimer);
    try {
      bed.windSource.stop();
    } catch {
      // already stopped
    }
    for (const node of [bed.bedGain, bed.windSource, bed.windFilter, bed.windGain]) {
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    }
  }
}

// ---------------------------------------------------------------------------
// React wiring
// ---------------------------------------------------------------------------

function isInCombat(screen: ScreenId, hasActiveCombat: boolean): boolean {
  return screen === "combat" || hasActiveCombat;
}

/**
 * Mounts the ambient engine for the lifetime of the app. Reads screen and
 * threat state from the store, resumes the shared AudioContext on the first
 * user gesture (autoplay policy), and tears everything down on unmount.
 */
export function useAmbientAudio(): void {
  const engineRef = useRef<AmbientEngine>();
  if (!engineRef.current) engineRef.current = new AmbientEngine();

  const screen = useGameStore(s => s.screen);
  const threatLevel = useGameStore(s => s.state.activeRun?.threat.level ?? 0);
  const hasActiveCombat = useGameStore(s => Boolean(s.state.activeCombat && !s.state.activeCombat.over));
  const muted = useGameStore(s => s.state.settings.audioMuted);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const resume = () => engine.resume();
    window.addEventListener("click", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });

    return () => {
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setScreen(isInCombat(screen, hasActiveCombat) ? "combat" : screen);
  }, [screen, hasActiveCombat]);

  useEffect(() => {
    engineRef.current?.setThreatLevel(threatLevel as ThreatLevel);
  }, [threatLevel]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);
}
