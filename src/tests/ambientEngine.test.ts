import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AmbientEngine, VILLAGE_DRONE_GAIN_DB, dbToGain } from "../game/ambient";

// Minimal stub graph so the WebAudio node-lifecycle logic in AmbientEngine
// (bed builds, crossfades, scheduled teardowns) can run headlessly in jsdom,
// which has no real AudioContext. Automation methods snap straight to the
// target value instead of simulating time-based ramps — that's fine here
// since these tests only assert on final state, not ramp shape (which is
// covered informally by the pure computeDungeonAmbientParams mapping tests).
function makeParam(initial = 0) {
  return {
    value: initial,
    setValueAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
    cancelScheduledValues() {
      // no-op for the stub
    }
  };
}

function makeNode(extra: Record<string, unknown> = {}) {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...extra
  };
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = "running";
  destination = makeNode();
  resume = vi.fn(async () => {
    this.state = "running";
  });

  createGain() {
    return makeNode({ gain: makeParam(0) });
  }

  createOscillator() {
    return makeNode({ type: "sine", frequency: makeParam(0), start: vi.fn(), stop: vi.fn() });
  }

  createBiquadFilter() {
    return makeNode({ type: "lowpass", frequency: makeParam(0), Q: makeParam(0) });
  }

  createBufferSource() {
    return makeNode({ buffer: null, loop: false, start: vi.fn(), stop: vi.fn() });
  }

  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
}

interface EngineInternals {
  villageBed?: { bedGain: { gain: { value: number } } };
  dungeonBed?: { bedGain: { gain: { value: number } } };
}

describe("AmbientEngine bed revival", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext =
      MockAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the village bed alive and re-ramped when returning within the crossfade window", () => {
    const engine = new AmbientEngine();
    engine.resume();
    engine.setScreen("village");

    expect((engine as unknown as EngineInternals).villageBed).toBeDefined();

    // Leave village (teardown scheduled ~2.2s out) then come back before it fires.
    engine.setScreen("merchant");
    vi.advanceTimersByTime(800);
    engine.setScreen("village");

    // Advance well past when the stale teardown would have fired.
    vi.advanceTimersByTime(3000);

    const villageBed = (engine as unknown as EngineInternals).villageBed;
    expect(villageBed).toBeDefined();
    expect(villageBed?.bedGain.gain.value).toBeCloseTo(dbToGain(VILLAGE_DRONE_GAIN_DB), 5);

    engine.dispose();
  });

  it("keeps the dungeon bed alive when a menu detour is shorter than the crossfade window", () => {
    const engine = new AmbientEngine();
    engine.resume();
    engine.setScreen("delve");

    expect((engine as unknown as EngineInternals).dungeonBed).toBeDefined();

    engine.setScreen("character");
    vi.advanceTimersByTime(500);
    engine.setScreen("delve");
    vi.advanceTimersByTime(3000);

    expect((engine as unknown as EngineInternals).dungeonBed).toBeDefined();

    engine.dispose();
  });

  it("actually tears the bed down once the crossfade window fully elapses without revival", () => {
    const engine = new AmbientEngine();
    engine.resume();
    engine.setScreen("village");
    expect((engine as unknown as EngineInternals).villageBed).toBeDefined();

    engine.setScreen("merchant");
    vi.advanceTimersByTime(3000);

    expect((engine as unknown as EngineInternals).villageBed).toBeUndefined();

    engine.dispose();
  });
});
