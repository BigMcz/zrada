// Hodnocení ťuknutí v Rytmu (DOC/SPEC.md, Rozšíření 6). Čisté funkce, časy v ms (čas serveru).

/** Ťuknutí dál než tolik od doby se s ní nepáruje; vynechaná doba = tato chyba. */
export const TOLERANCE_MS = 250;
/** Kalibrace z cvičného kola nejvýš ± tolik. */
export const MAX_CALIBRATION_MS = 150;

export interface RoundScore {
  /** Přesnost 0–100 (jedno desetinné místo). */
  accuracy: number;
  /** Nejhorší chyba v kole (ms); vynechaná doba nebo ťuknutí navíc = 250. */
  worst: number;
}

interface Pairing {
  /** Znaménková odchylka ťuknutí od doby pro každou spárovanou dobu (ťuk − doba). */
  offsets: number[];
  missed: number;
  extra: number;
}

/** Každá doba si vezme nejbližší ještě nepoužité ťuknutí do ±250 ms (od nejbližších párů). */
export function pairTaps(taps: number[], beats: number[]): Pairing {
  const pairs: { b: number; t: number; d: number }[] = [];
  beats.forEach((beat, b) =>
    taps.forEach((tap, t) => {
      const d = Math.abs(tap - beat);
      if (d <= TOLERANCE_MS) pairs.push({ b, t, d });
    }),
  );
  pairs.sort((x, y) => x.d - y.d);
  const usedBeat = new Set<number>();
  const usedTap = new Set<number>();
  const offsets: number[] = [];
  for (const p of pairs) {
    if (usedBeat.has(p.b) || usedTap.has(p.t)) continue;
    usedBeat.add(p.b);
    usedTap.add(p.t);
    offsets.push(taps[p.t] - beats[p.b]);
  }
  return { offsets, missed: beats.length - usedBeat.size, extra: taps.length - usedTap.size };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Typické zpoždění hráče z cvičného kola: medián odchylek, nejvýš ±150 ms, bez ťuknutí 0. */
export function calibration(taps: number[], beats: number[]): number {
  const { offsets } = pairTaps(taps, beats);
  if (offsets.length === 0) return 0;
  return Math.round(Math.max(-MAX_CALIBRATION_MS, Math.min(MAX_CALIBRATION_MS, median(offsets))));
}

/** Přesnost kola po odečtení kalibrace. Ťuknutí navíc přidávají do průměru chybu 250 ms. */
export function scoreRound(taps: number[], beats: number[], calib = 0): RoundScore {
  const { offsets, missed, extra } = pairTaps(
    taps.map((t) => t - calib),
    beats,
  );
  const errors = [...offsets.map(Math.abs), ...Array(missed + extra).fill(TOLERANCE_MS)];
  const avg = errors.length === 0 ? TOLERANCE_MS : errors.reduce((a, b) => a + b, 0) / errors.length;
  return {
    accuracy: Math.round(Math.max(0, 100 - avg / 2.5) * 10) / 10,
    worst: errors.length === 0 ? TOLERANCE_MS : Math.max(...errors),
  };
}
