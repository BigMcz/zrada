// Generátor kódu a nápověd pro Trezor (DOC/SPEC.md, Rozšíření 5). Čisté funkce, bez stavu hry.
import { pick, shuffle, type Rng } from '../../game/random.js';

export type VaultHint =
  | { kind: 'parity'; pos: number; even: boolean }
  | { kind: 'range'; pos: number; op: 'gt' | 'lt'; value: number }
  | { kind: 'exclude'; pos: number; values: number[] }
  | { kind: 'relation'; pos: number; other: number; diff: number }
  | { kind: 'sum'; pos: number; other: number; value: number }
  | { kind: 'exact'; pos: number; value: number };

export type HintKind = VaultHint['kind'];

/** Platí nápověda pro daný kód? */
export function holds(h: VaultHint, code: number[]): boolean {
  const d = code[h.pos];
  switch (h.kind) {
    case 'parity':
      return (d % 2 === 0) === h.even;
    case 'range':
      return h.op === 'gt' ? d > h.value : d < h.value;
    case 'exclude':
      return !h.values.includes(d);
    case 'relation':
      return d - code[h.other] === h.diff;
    case 'sum':
      return d + code[h.other] === h.value;
    case 'exact':
      return d === h.value;
  }
}

/** Číslice, kterých se nápověda týká. */
export function positionsOf(h: VaultHint): number[] {
  return h.kind === 'relation' || h.kind === 'sum' ? [h.pos, h.other] : [h.pos];
}

/** Text nápovědy, jak ho hráč vidí na telefonu. Číslice se počítají od 1. */
export function hintText(h: VaultHint): string {
  const p = `${h.pos + 1}. číslice`;
  switch (h.kind) {
    case 'parity':
      return `${p} je ${h.even ? 'sudá' : 'lichá'}.`;
    case 'range':
      return `${p} je ${h.op === 'gt' ? 'větší' : 'menší'} než ${h.value}.`;
    case 'exclude': {
      const v = [...h.values].sort((a, b) => a - b);
      return `${p} není ${v.slice(0, -1).join(', ')} ani ${v[v.length - 1]}.`;
    }
    case 'relation':
      if (h.diff === 0) return `${p} je stejná jako ${h.other + 1}. číslice.`;
      return `${p} je o ${Math.abs(h.diff)} ${h.diff > 0 ? 'větší' : 'menší'} než ${h.other + 1}. číslice.`;
    case 'sum':
      return `Součet ${h.pos + 1}. a ${h.other + 1}. číslice je ${h.value}.`;
    case 'exact':
      return `${p} je ${h.value}.`;
  }
}

const otherPos = (rng: Rng, digits: number, pos: number) => {
  const o = rng.int(digits - 1);
  return o >= pos ? o + 1 : o;
};

/** Pravdivá nápověda daného typu k číslici `pos`. */
export function trueHint(kind: HintKind, pos: number, code: number[], rng: Rng): VaultHint {
  const d = code[pos];
  switch (kind) {
    case 'parity':
      return { kind, pos, even: d % 2 === 0 };
    case 'range': {
      // „větší než“ jde jen pro d > 0, „menší než“ jen pro d < 9.
      const op = d === 0 ? 'lt' : d === 9 ? 'gt' : rng.int(2) === 0 ? 'gt' : 'lt';
      if (op === 'gt') return { kind, pos, op, value: d - 1 - rng.int(Math.min(3, d)) };
      return { kind, pos, op, value: d + 1 + rng.int(Math.min(3, 9 - d)) };
    }
    case 'exclude':
      return { kind, pos, values: shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== d)).slice(0, 3) };
    case 'relation': {
      const other = otherPos(rng, code.length, pos);
      return { kind, pos, other, diff: d - code[other] };
    }
    case 'sum': {
      const other = otherPos(rng, code.length, pos);
      const [a, b] = pos < other ? [pos, other] : [other, pos];
      return { kind, pos: a, other: b, value: code[a] + code[b] };
    }
    case 'exact':
      return { kind, pos, value: d };
  }
}

/**
 * Falešná nápověda Zrádce: stejný typ a stejné číslice jako pravá, jiná hodnota, pro kód neplatí.
 * Hodnoty drží v uvěřitelném rozsahu, aby falešná nešla poznat na první pohled.
 */
export function fakeHint(real: VaultHint, code: number[], rng: Rng): VaultHint {
  const d = code[real.pos];
  switch (real.kind) {
    case 'parity':
      return { ...real, even: !real.even };
    case 'range': {
      // gt v s v ≥ d (v ≤ 8), nebo lt v s v ≤ d (v ≥ 1).
      const gt = d <= 8 ? Array.from({ length: Math.min(3, 9 - d) }, (_, i) => d + i) : [];
      const lt = d >= 1 ? Array.from({ length: Math.min(3, d) }, (_, i) => d - i) : [];
      const ops: ('gt' | 'lt')[] = [];
      if (gt.length && (real.op === 'gt' || !lt.length)) ops.push('gt');
      if (lt.length && (real.op === 'lt' || !gt.length)) ops.push('lt');
      const op = pick(rng, ops);
      return { ...real, op, value: pick(rng, op === 'gt' ? gt : lt) };
    }
    case 'exclude': {
      const others = shuffle(rng, real.values).slice(0, 2);
      return { ...real, values: shuffle(rng, [...others, d]) };
    }
    case 'relation': {
      const options = [-3, -2, -1, 1, 2, 3].map((k) => real.diff + k).filter((v) => v >= -9 && v <= 9);
      return { ...real, diff: pick(rng, options) };
    }
    case 'sum': {
      const options = [-3, -2, -1, 1, 2, 3].map((k) => real.value + k).filter((v) => v >= 0 && v <= 18);
      return { ...real, value: pick(rng, options) };
    }
    case 'exact':
      return { ...real, value: pick(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== d)) };
  }
}

export function allCodes(digits: number): number[][] {
  const out: number[][] = [];
  for (let n = 0; n < 10 ** digits; n++) {
    out.push(String(n).padStart(digits, '0').split('').map(Number));
  }
  return out;
}

/** Kódy, pro které platí všechny nápovědy. */
export function solutions(hints: VaultHint[], digits: number): number[][] {
  return allCodes(digits).filter((c) => hints.every((h) => holds(h, c)));
}

export interface VaultDeal {
  code: number[];
  /** Pravdivé nápovědy každého hráče. */
  hints: Record<string, VaultHint[]>;
  /** Index falešné nápovědy každého Zrádce a její znění. */
  fakes: Record<string, { index: number; hint: VaultHint }>;
}

export const MAX_HINTS_PER_PLAYER = 3;
const KINDS: HintKind[] = ['parity', 'range', 'exclude', 'relation', 'sum', 'exact'];

/** Pokus o rozdání; null, když se do 3 nápověd na hráče nevejde jednoznačné řešení. */
function tryDeal(players: string[], traitors: string[], digits: number, rng: Rng, separateFakes: boolean): VaultDeal | null {
  const code = Array.from({ length: digits }, () => rng.int(10));
  const order = shuffle(rng, players);
  const hints: Record<string, VaultHint[]> = Object.fromEntries(players.map((id) => [id, []]));
  const coverage: Set<string>[] = Array.from({ length: digits }, () => new Set());
  const texts = new Set<string>();
  let remaining = allCodes(digits);
  let exactUsed = false;
  const kindCount: Partial<Record<HintKind, number>> = {};

  const done = () =>
    remaining.length === 1 &&
    coverage.every((c) => c.size >= 2) &&
    players.every((id) => hints[id].length > 0);

  for (let k = 0; !done(); k++) {
    if (k >= players.length * MAX_HINTS_PER_PLAYER) return null;
    const holder = order[k % order.length];

    // Z několika náhodných kandidátů vybere ten, který nejvíc zúží řešení a doplní pokrytí číslic.
    let best: { hint: VaultHint; score: number; left: number[][] } | null = null;
    for (let tries = 0; tries < 14; tries++) {
      const kind = pick(rng, KINDS);
      if (kind === 'exact' && (exactUsed || rng.int(3) !== 0)) continue;
      const hint = trueHint(kind, rng.int(digits), code, rng);
      const text = hintText(hint);
      if (texts.has(text)) continue;
      const left = remaining.filter((c) => holds(hint, c));
      const cover = positionsOf(hint).filter((p) => coverage[p].size < 2 && !coverage[p].has(holder)).length;
      // Zúžení se počítá jen do 4× (aby nevyhrávaly pořád součty a vztahy), opakovaný typ se penalizuje.
      const narrow = Math.min(Math.log(remaining.length / left.length), Math.log(4));
      const score = narrow + cover * 1.5 - 0.5 * (kindCount[kind] ?? 0) + rng.int(100) / 100;
      if (!best || score > best.score) best = { hint, score, left };
    }
    if (!best) continue;
    hints[holder].push(best.hint);
    texts.add(hintText(best.hint));
    for (const p of positionsOf(best.hint)) coverage[p].add(holder);
    remaining = best.left;
    if (best.hint.kind === 'exact') exactUsed = true;
    kindCount[best.hint.kind] = (kindCount[best.hint.kind] ?? 0) + 1;
  }

  // Falešné nápovědy: každý Zrádce jednu, dva Zrádci pokud možno u různých číslic.
  const fakes: VaultDeal['fakes'] = {};
  const usedPos = new Set<number>();
  for (const id of shuffle(rng, traitors)) {
    const own = hints[id] ?? [];
    if (own.length === 0) continue;
    const fresh = own.map((h, i) => i).filter((i) => !positionsOf(own[i]).some((p) => usedPos.has(p)));
    if (fresh.length === 0 && separateFakes) return null;
    const index = pick(rng, fresh.length > 0 ? fresh : own.map((_, i) => i));
    const fake = fakeHint(own[index], code, rng);
    if (holds(fake, code)) return null; // pojistka, nemá nastat
    fakes[id] = { index, hint: fake };
    for (const p of positionsOf(own[index])) usedPos.add(p);
  }
  return { code, hints, fakes };
}

/**
 * Vygeneruje kód a rozdá nápovědy všem hráčům: z pravdivých jde kód složit jednoznačně,
 * každá číslice má nápovědy aspoň od dvou různých hráčů, každý hráč má 1–3 nápovědy.
 */
export function dealVault(players: string[], traitors: string[], digits: number, rng: Rng): VaultDeal {
  for (let attempt = 0; attempt < 200; attempt++) {
    // Prvních 100 pokusů trvá na falešných nápovědách u různých číslic, pak už ne.
    const deal = tryDeal(players, traitors, digits, rng, attempt < 100);
    if (deal) return deal;
  }
  throw new Error('Trezor: nepodařilo se rozdat nápovědy');
}
