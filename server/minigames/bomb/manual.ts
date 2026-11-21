// Manuál, generátor bomby a řešitel pro Zneškodni bombu (DOC/SPEC.md, Rozšíření 7). Čisté funkce.
import { pick, shuffle, type Rng } from '../../game/random.js';
import manualData from './manual.cs.json' with { type: 'json' };

export const COLORS = ['red', 'blue', 'yellow', 'white', 'black', 'green'] as const;
export type WireColor = (typeof COLORS)[number];

/** Přídavné jméno barvy u drátu (mužský rod, 1. a 4. pád): „první zelený drát“. */
export const COLOR_ADJ: Record<WireColor, string> = {
  red: 'červený',
  blue: 'modrý',
  yellow: 'žlutý',
  white: 'bílý',
  black: 'černý',
  green: 'zelený',
};
/** Množné číslo: „dva zelené dráty“. */
const COLOR_PLURAL: Record<WireColor, string> = {
  red: 'červené',
  blue: 'modré',
  yellow: 'žluté',
  white: 'bílé',
  black: 'černé',
  green: 'zelené',
};

export type WireCondition =
  | { type: 'firstIs' | 'lastIs' | 'none'; color: WireColor }
  | { type: 'countIs' | 'countMore'; color: WireColor; n: number };

export type WireTarget = { pos: number | 'last' } | { first: WireColor } | { last: WireColor };

export interface WireRule {
  if?: WireCondition;
  cut: WireTarget;
}

export interface Manual {
  wires: Record<string, WireRule[]>;
  symbols: string[][];
}

export const MANUAL = manualData as unknown as Manual;

export const WIRE_COUNTS = [3, 4, 5, 6];

// ---------------------------------------------------------------------------
// Texty pravidel
// ---------------------------------------------------------------------------

const ORDINAL = ['první', 'druhý', 'třetí', 'čtvrtý', 'pátý', 'šestý'];
const NUMBER_WORD = ['žádný', 'jeden', 'dva', 'tři', 'čtyři', 'pět', 'šest'];

/** „dva zelené dráty“ / „jeden zelený drát“ / „pět zelených drátů“. */
function countPhrase(n: number, color: WireColor): string {
  if (n === 1) return `jeden ${COLOR_ADJ[color]} drát`;
  if (n >= 2 && n <= 4) return `${NUMBER_WORD[n]} ${COLOR_PLURAL[color]} dráty`;
  return `${NUMBER_WORD[n]} ${COLOR_ADJ[color].replace(/ý$/, 'ých')} drátů`;
}

function conditionText(c: WireCondition): string {
  switch (c.type) {
    case 'firstIs':
      return `je první drát ${COLOR_ADJ[c.color]}`;
    case 'lastIs':
      return `je poslední drát ${COLOR_ADJ[c.color]}`;
    case 'none':
      return `není žádný ${COLOR_ADJ[c.color]} drát`;
    case 'countIs':
      return `${c.n === 1 ? 'je' : 'jsou'} právě ${countPhrase(c.n, c.color)}`;
    case 'countMore':
      return `${c.n === 1 ? 'je' : 'jsou'} víc než ${c.n === 1 ? 'jeden' : NUMBER_WORD[c.n]} ${c.n === 1 ? `${COLOR_ADJ[c.color]} drát` : `${COLOR_PLURAL[c.color]} dráty`}`;
  }
}

export function targetText(t: WireTarget): string {
  if ('pos' in t) return t.pos === 'last' ? 'poslední drát' : `${ORDINAL[t.pos - 1]} drát`;
  if ('first' in t) return `první ${COLOR_ADJ[t.first]} drát`;
  return `poslední ${COLOR_ADJ[t.last]} drát`;
}

export function ruleText(r: WireRule): string {
  return r.if ? `Pokud ${conditionText(r.if)}, přestřihni ${targetText(r.cut)}.` : `Jinak přestřihni ${targetText(r.cut)}.`;
}

// ---------------------------------------------------------------------------
// Řešitel
// ---------------------------------------------------------------------------

function holds(c: WireCondition, wires: WireColor[]): boolean {
  const count = wires.filter((w) => w === c.color).length;
  switch (c.type) {
    case 'firstIs':
      return wires[0] === c.color;
    case 'lastIs':
      return wires[wires.length - 1] === c.color;
    case 'none':
      return count === 0;
    case 'countIs':
      return count === c.n;
    case 'countMore':
      return count > c.n;
  }
}

/** Index drátu (od 0), na který míří cíl; -1, když takový drát není. */
export function resolveTarget(t: WireTarget, wires: WireColor[]): number {
  if ('pos' in t) return t.pos === 'last' ? wires.length - 1 : t.pos - 1 < wires.length ? t.pos - 1 : -1;
  if ('first' in t) return wires.indexOf(t.first);
  return wires.lastIndexOf(t.last);
}

/** Index pravidla, které o drátech rozhoduje (první, které sedí). */
export function decidingRule(rules: WireRule[], wires: WireColor[]): number {
  return rules.findIndex((r) => !r.if || holds(r.if, wires));
}

/** Který drát (od 0) podle daných pravidel přestřihnout; -1, když pravidla nedávají platný drát. */
export function solveWires(rules: WireRule[], wires: WireColor[]): number {
  const i = decidingRule(rules, wires);
  return i < 0 ? -1 : resolveTarget(rules[i].cut, wires);
}

/** Sloupce, které obsahují všechny symboly bomby. */
export function matchingColumns(columns: string[][], symbols: string[]): number[] {
  return columns.flatMap((col, i) => (symbols.every((s) => col.includes(s)) ? [i] : []));
}

/** Pořadí mačkání: podle sloupce shora dolů. */
export function symbolOrder(column: string[], symbols: string[]): string[] {
  return column.filter((s) => symbols.includes(s));
}

// ---------------------------------------------------------------------------
// Stránky manuálu
// ---------------------------------------------------------------------------

export type PageId = 'W34' | 'W56' | 'S13' | 'S46';
export const PAGE_IDS: PageId[] = ['W34', 'W56', 'S13', 'S46'];
export const PAGE_TITLES: Record<PageId, string> = {
  W34: 'Dráty 3–4',
  W56: 'Dráty 5–6',
  S13: 'Symboly – sloupce 1–3',
  S46: 'Symboly – sloupce 4–6',
};
/** Části stránky: u drátů počty drátů, u symbolů indexy sloupců. */
export const PAGE_PARTS: Record<PageId, number[]> = { W34: [3, 4], W56: [5, 6], S13: [0, 1, 2], S46: [3, 4, 5] };
export const isWirePage = (p: PageId) => p === 'W34' || p === 'W56';

export const pageForWires = (count: number): PageId => (count <= 4 ? 'W34' : 'W56');
export const pageForColumn = (col: number): PageId => (col <= 2 ? 'S13' : 'S46');

/** Falešná úprava stránky: jiné pravidlo drátů, nebo jiné pořadí sloupce symbolů. */
export type PageFake =
  | { kind: 'wires'; count: number; rule: number; replacement: WireRule }
  | { kind: 'symbols'; column: number; replacement: string[] };

export interface PageSection {
  heading: string;
  items: string[];
}

export interface PageView {
  id: PageId;
  title: string;
  kind: 'wires' | 'symbols';
  sections: PageSection[];
}

/** Stránka tak, jak ji hráč vidí (s případnou falešnou úpravou). */
export function renderPage(id: PageId, fake?: PageFake): PageView {
  if (isWirePage(id)) {
    return {
      id,
      title: PAGE_TITLES[id],
      kind: 'wires',
      sections: PAGE_PARTS[id].map((count) => ({
        heading: `${count} ${count <= 4 ? 'dráty' : 'drátů'}`,
        items: MANUAL.wires[count].map((r, i) =>
          ruleText(fake?.kind === 'wires' && fake.count === count && fake.rule === i ? fake.replacement : r),
        ),
      })),
    };
  }
  return {
    id,
    title: PAGE_TITLES[id],
    kind: 'symbols',
    sections: PAGE_PARTS[id].map((col) => ({
      heading: `Sloupec ${col + 1}`,
      items: fake?.kind === 'symbols' && fake.column === col ? [...fake.replacement] : [...MANUAL.symbols[col]],
    })),
  };
}

// ---------------------------------------------------------------------------
// Generátor
// ---------------------------------------------------------------------------

export interface Bomb {
  wires: WireColor[];
  /** Symboly v pořadí, jak je bomba ukazuje. */
  symbols: string[];
  /** Sloupec manuálu, ze kterého symboly jsou. */
  column: number;
}

export interface BombSolution {
  wire: number;
  order: string[];
}

export function solveBomb(bomb: Bomb): BombSolution {
  return {
    wire: solveWires(MANUAL.wires[bomb.wires.length], bomb.wires),
    order: symbolOrder(MANUAL.symbols[bomb.column], bomb.symbols),
  };
}

/** Náhodná bomba, kterou manuál jednoznačně řeší. */
export function generateBomb(rng: Rng): Bomb {
  for (let attempt = 0; attempt < 500; attempt++) {
    const count = pick(rng, WIRE_COUNTS);
    const wires = Array.from({ length: count }, () => pick(rng, COLORS));
    if (solveWires(MANUAL.wires[count], wires) < 0) continue;
    const column = rng.int(MANUAL.symbols.length);
    const symbols = shuffle(rng, MANUAL.symbols[column]).slice(0, 4);
    if (matchingColumns(MANUAL.symbols, symbols).length !== 1) continue;
    return { wires, symbols: shuffle(rng, symbols), column };
  }
  throw new Error('Bomba: nepodařilo se vygenerovat řešitelnou bombu');
}

/**
 * Falešná úprava stránky pro tuto bombu: mění to pravidlo (sloupec), které o bombě rozhoduje,
 * tak, aby vedlo k jinému řešení. Pro stránku, která se bomby netýká, změní náhodné pravidlo.
 */
export function makeFake(page: PageId, bomb: Bomb, rng: Rng): PageFake {
  if (isWirePage(page)) {
    const relevant = PAGE_PARTS[page].includes(bomb.wires.length);
    const count = relevant ? bomb.wires.length : pick(rng, PAGE_PARTS[page]);
    const rules = MANUAL.wires[count];
    const rule = relevant ? decidingRule(rules, bomb.wires) : rng.int(rules.length);
    const correct = relevant ? solveWires(rules, bomb.wires) : -1;
    const positions = Array.from({ length: count }, (_, i) => i + 1).filter((p) => p - 1 !== correct && !('pos' in rules[rule].cut && rules[rule].cut.pos === p));
    return { kind: 'wires', count, rule, replacement: { ...rules[rule], cut: { pos: pick(rng, positions) } } };
  }
  const relevant = PAGE_PARTS[page].includes(bomb.column);
  const column = relevant ? bomb.column : pick(rng, PAGE_PARTS[page]);
  const col = [...MANUAL.symbols[column]];
  // Prohodí dva ze symbolů bomby (u nerelevantní stránky dva libovolné).
  const indices = relevant ? col.flatMap((s, i) => (bomb.symbols.includes(s) ? [i] : [])) : col.map((_, i) => i);
  const [a, b] = shuffle(rng, indices).slice(0, 2);
  [col[a], col[b]] = [col[b], col[a]];
  return { kind: 'symbols', column, replacement: col };
}

/** Text pravé verze pro tajnou kartu Zrádce. */
export function trueText(fake: PageFake): { where: string; text: string } {
  if (fake.kind === 'wires') {
    return {
      where: `falešné pravidlo č. ${fake.rule + 1} v části ${fake.count} ${fake.count <= 4 ? 'dráty' : 'drátů'}`,
      text: ruleText(MANUAL.wires[fake.count][fake.rule]),
    };
  }
  return { where: `falešný sloupec ${fake.column + 1}`, text: MANUAL.symbols[fake.column].join(' ') };
}

/** Rozdání stránek navigátorům dokola: každý 1–2 stránky, každá stránka aspoň jednou. */
export function dealPages(navigators: string[], rng: Rng): Record<string, PageId[]> {
  const order = shuffle(rng, navigators);
  const pages = shuffle(rng, PAGE_IDS);
  const out: Record<string, PageId[]> = Object.fromEntries(navigators.map((id) => [id, []]));
  const slots = Math.max(order.length, PAGE_IDS.length);
  for (let i = 0; i < slots; i++) out[order[i % order.length]].push(pages[i % pages.length]);
  return out;
}
