export interface Rng {
  seed: string;
  nextFloat: () => number;
  nextInt: (min: number, max: number) => number;
  pickOne: <T>(arr: readonly T[]) => T;
  pickWeighted: <T>(entries: ReadonlyArray<{ value: T; weight: number }>) => T;
  shuffle: <T>(arr: readonly T[]) => T[];
  forkChild: (label: string) => Rng;
}

function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = mulberry32(xfnv1a(seed));
  const rng: Rng = {
    seed,
    nextFloat: () => next(),
    nextInt: (min: number, max: number) => {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      return Math.floor(next() * (hi - lo + 1)) + lo;
    },
    pickOne: <T>(arr: readonly T[]): T => {
      if (arr.length === 0) throw new Error("pickOne on empty array");
      return arr[Math.floor(next() * arr.length)]!;
    },
    pickWeighted: <T>(entries: ReadonlyArray<{ value: T; weight: number }>): T => {
      const total = entries.reduce((s, e) => s + Math.max(0, e.weight), 0);
      if (total <= 0) throw new Error("pickWeighted with zero total weight");
      let r = next() * total;
      for (const e of entries) {
        r -= Math.max(0, e.weight);
        if (r <= 0) return e.value;
      }
      return entries[entries.length - 1]!.value;
    },
    shuffle: <T>(arr: readonly T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    },
    forkChild: (label: string) => createRng(`${seed}:${label}`)
  };
  return rng;
}

export function makeId(rng: Rng, prefix = "id"): string {
  return `${prefix}_${rng.nextInt(0, 0xffffff).toString(16).padStart(6, "0")}`;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 12);
}
