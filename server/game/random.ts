import { randomInt } from 'node:crypto';

/** Zdroj náhody. Ve hře kryptograficky náhodný, v testech předvídatelný podle semínka. */
export interface Rng {
  /** Celé číslo 0 ≤ n < maxExclusive. */
  int(maxExclusive: number): number;
}

export const cryptoRng: Rng = {
  int: (maxExclusive) => randomInt(maxExclusive),
};

/** Předvídatelný los pro testy (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    int(maxExclusive) {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(r * maxExclusive);
    },
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() z prázdného seznamu');
  return items[rng.int(items.length)];
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
