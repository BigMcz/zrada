// Zneškodni bombu (DOC/SPEC.md, Rozšíření 7; podrobně DOC/minihry-analyza.md, kap. 2).
import type { Clue } from '../../../shared/types.js';
import { pick, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';
import {
  dealPages,
  generateBomb,
  MANUAL,
  makeFake,
  PAGE_TITLES,
  pageForColumn,
  pageForWires,
  renderPage,
  solveBomb,
  solveWires,
  symbolOrder,
  trueText,
  type Bomb,
  type BombSolution,
  type PageFake,
  type PageId,
  type PageView,
  type WireColor,
} from './manual.js';

export const BOMB_ID = 'BOMB';
export const READY_MS = 20_000;
export const FUSE_MS = 180_000;
export const MAX_ERRORS = 3;
/** Každá chyba zkrátí zbývající čas na 90 %. */
export const ERROR_SPEEDUP = 0.9;
export const REASSIGN_AFTER_MS = 20_000;
export const POT_DEFUSED = 400;
export const POT_PER_ERROR = 100;

export type BombStage = 'READY' | 'ARMED' | 'DONE';
export type BombEnd = 'DEFUSED' | 'EXPLODED' | 'TIME' | 'MODERATOR';
/** Tip ducha: počet chyb 0–2, nebo 3 = vybuchne. */
export type BombTip = 0 | 1 | 2 | 3;

export interface BombError {
  module: 'WIRES' | 'SYMBOLS';
  /** Dráty: index přestřiženého drátu; symboly: zmáčknutý symbol. */
  did: number | string;
  expected: number | string;
  /** Symboly: kolik symbolů bylo před chybou už správně zmáčknuto. */
  step?: number;
}

export interface BombState {
  players: string[];
  traitors: string[];
  ghosts: string[];
  pyroId: string;
  bomb: Bomb;
  solution: BombSolution;
  pages: Record<string, PageId[]>;
  /** Falešná úprava stránky u Zrádců-navigátorů. */
  fakes: Record<string, { page: PageId; fake: PageFake }>;
  stage: BombStage;
  /** Konec odpočtu; null, když je pozastavený. */
  endsAt: number | null;
  /** Zbývající čas při pozastavení. */
  pausedLeft: number | null;
  cut: number[];
  pressed: string[];
  wiresSolved: boolean;
  symbolsSolved: boolean;
  errors: BombError[];
  disconnectedSince: number | null;
  reassignable: boolean;
  ghostTips: Record<string, BombTip>;
  end: BombEnd | null;
}

export interface BombPublicDevice {
  wires: WireColor[];
  cut: number[];
  symbols: string[];
  pressed: string[];
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce, pro pyrotechnika i navigátora. */
export interface BombPlayerView {
  stage: BombStage;
  pyroId: string;
  isPyro: boolean;
  /** Bomba jen u pyrotechnika, jinak null. */
  device: BombPublicDevice | null;
  /** Vlastní stránky manuálu (falešná úprava vypadá stejně jako pravá). */
  pages: PageView[];
  errors: number;
  maxErrors: number;
  wiresSolved: boolean;
  symbolsSolved: boolean;
  paused: boolean;
}

export interface BombGhostView {
  stage: BombStage;
  pyroId: string;
  errors: number;
  maxErrors: number;
  wiresSolved: boolean;
  symbolsSolved: boolean;
  paused: boolean;
  myTip: BombTip | null;
  canTip: boolean;
}

export interface BombModeratorView {
  stage: BombStage;
  pyroId: string;
  device: BombPublicDevice;
  /** Správný drát (od 0) a pořadí symbolů. */
  solution: BombSolution;
  pages: Record<string, { id: PageId; title: string; fake: string | null }[]>;
  traitors: string[];
  errors: BombError[];
  wiresSolved: boolean;
  symbolsSolved: boolean;
  paused: boolean;
  reassignable: boolean;
  ghostTips: Record<string, BombTip>;
}

const device = (s: BombState): BombPublicDevice => ({
  wires: [...s.bomb.wires],
  cut: [...s.cut],
  symbols: [...s.bomb.symbols],
  pressed: [...s.pressed],
});

/** Stránky hráče tak, jak je vidí (Zrádce s falešnou úpravou). */
export function pagesOf(s: BombState, id: string): PageView[] {
  const fake = s.fakes[id];
  return (s.pages[id] ?? []).map((p) => renderPage(p, fake && fake.page === p ? fake.fake : undefined));
}

function arm(s: BombState, now: number): BombState {
  return { ...s, stage: 'ARMED', endsAt: now + FUSE_MS, pausedLeft: null };
}

const finish = (s: BombState, end: BombEnd): BombState => ({ ...s, stage: 'DONE', end, endsAt: null, reassignable: false });

/** Chyba: zrychlí zbývající čas; třetí chyba = výbuch. */
function withError(s: BombState, err: BombError, now: number): BombState {
  const errors = [...s.errors, err];
  if (errors.length >= MAX_ERRORS) return finish({ ...s, errors }, 'EXPLODED');
  const endsAt = s.endsAt === null ? null : now + Math.round((s.endsAt - now) * ERROR_SPEEDUP);
  const pausedLeft = s.pausedLeft === null ? null : Math.round(s.pausedLeft * ERROR_SPEEDUP);
  return { ...s, errors, endsAt, pausedLeft };
}

const defusedIfDone = (s: BombState): BombState => (s.wiresSolved && s.symbolsSolved ? finish(s, 'DEFUSED') : s);

function cutWire(s: BombState, index: unknown, now: number): BombState | null {
  if (s.wiresSolved || typeof index !== 'number' || !Number.isInteger(index)) return null;
  if (index < 0 || index >= s.bomb.wires.length || s.cut.includes(index)) return null;
  const next = { ...s, cut: [...s.cut, index] };
  if (index === s.solution.wire) return defusedIfDone({ ...next, wiresSolved: true });
  return withError(next, { module: 'WIRES', did: index, expected: s.solution.wire }, now);
}

function pressSymbol(s: BombState, symbol: unknown, now: number): BombState | null {
  if (s.symbolsSolved || typeof symbol !== 'string' || !s.bomb.symbols.includes(symbol) || s.pressed.includes(symbol)) return null;
  const expected = s.solution.order[s.pressed.length];
  if (symbol !== expected) return withError(s, { module: 'SYMBOLS', did: symbol, expected, step: s.pressed.length }, now);
  const pressed = [...s.pressed, symbol];
  return defusedIfDone({ ...s, pressed, symbolsSolved: pressed.length === s.solution.order.length });
}

/** Výsledek pro tipy duchů: počet chyb, výbuch = 3. */
const outcome = (s: BombState): BombTip => (s.end === 'DEFUSED' ? (s.errors.length as BombTip) : 3);

export function ghostPoints(tip: BombTip, result: BombTip): number {
  if (tip === result) return 3;
  return Math.abs(tip - result) === 1 ? 1 : 0;
}

/** Vysvětlila by chybu některá z rozdaných falešných stránek? Vrátí název stránky, nebo null. */
export function explainedBy(s: BombState, err: BombError): string | null {
  const pressedBefore = s.solution.order.slice(0, err.step ?? 0);
  for (const { page, fake } of Object.values(s.fakes)) {
    if (err.module === 'WIRES' && fake.kind === 'wires' && fake.count === s.bomb.wires.length) {
      const rules = MANUAL.wires[fake.count].map((r, i) => (i === fake.rule ? fake.replacement : r));
      if (solveWires(rules, s.bomb.wires) === err.did) return PAGE_TITLES[page];
    }
    if (err.module === 'SYMBOLS' && fake.kind === 'symbols' && fake.column === s.bomb.column) {
      const order = symbolOrder(fake.replacement, s.bomb.symbols).filter((x) => !pressedBefore.includes(x));
      if (order[0] === err.did) return PAGE_TITLES[page];
    }
  }
  return null;
}

const ORD = (i: number) => `${i + 1}.`;

export const bomb: MinigameModule<BombState> = {
  id: BOMB_ID,
  meta: {
    name: 'Zneškodni bombu',
    minPlayers: 4,
    rules: [
      'Pyrotechnik jako jediný vidí bombu. Ostatní mají stránky manuálu a radí mu.',
      'Bomba má dráty a symboly. Na odpočet jsou 3 minuty.',
      'Každá chyba zrychlí odpočet, třetí chyba bombu odpálí.',
      'Zneškodní-li pyrotechnik bombu, získá štít. Poklad +400, minus 100 za každou chybu.',
    ],
    traitorRule: 'Ve stránce manuálu, kterou mají Zrádci, je jedno pravidlo falešné.',
    ghostRule: 'Duchové tipují, s kolika chybami se bomba zneškodní, nebo že vybuchne. Přesně 3 body, o jedno vedle 1 bod.',
  },

  init(ctx, rng, now) {
    const players = ctx.players.filter((p) => p.alive).map((p) => p.id);
    const traitors = ctx.players.filter((p) => p.alive && p.role === 'TRAITOR').map((p) => p.id);
    const pyroId = pick(rng, players);
    const b = generateBomb(rng);
    const pages = dealPages(
      players.filter((id) => id !== pyroId),
      rng,
    );
    pages[pyroId] = [];
    // Falešná stránka: přednostně ta, která o této bombě rozhoduje.
    const relevant = [pageForWires(b.wires.length), pageForColumn(b.column)];
    const fakes: BombState['fakes'] = {};
    for (const id of traitors) {
      const own = pages[id] ?? [];
      if (own.length === 0) continue;
      const choice = own.filter((p) => relevant.includes(p));
      const page = pick(rng, choice.length > 0 ? choice : own);
      fakes[id] = { page, fake: makeFake(page, b, rng) };
    }
    return {
      players,
      traitors,
      ghosts: [...ctx.ghosts],
      pyroId,
      bomb: b,
      solution: solveBomb(b),
      pages,
      fakes,
      stage: 'READY',
      endsAt: now + READY_MS,
      pausedLeft: null,
      cut: [],
      pressed: [],
      wiresSolved: false,
      symbolsSolved: false,
      errors: [],
      disconnectedSince: null,
      reassignable: false,
      ghostTips: {},
      end: null,
    };
  },

  secretCard(state, playerId) {
    if (playerId === state.pyroId) return ['Jsi pyrotechnik. Jen ty vidíš bombu.', 'Popisuj nahlas, co vidíš.'];
    const f = state.fakes[playerId];
    if (f) {
      const t = trueText(f.fake);
      return [`Ve stránce „${PAGE_TITLES[f.page]}“ je ${t.where}.`, `Pravé zní: „${t.text}“`];
    }
    return ['Tvoje stránky manuálu jsou pravé.', 'Pozor na rozpory.'];
  },

  start(state, now) {
    return { ...state, stage: 'READY', endsAt: now + READY_MS };
  },

  apply(state, playerId, input, now) {
    if (state.stage !== 'ARMED' || playerId !== state.pyroId || state.endsAt === null) return null;
    const i = (input ?? {}) as { cut?: unknown; press?: unknown };
    if (i.cut !== undefined) return cutWire(state, i.cut, now);
    if (i.press !== undefined) return pressSymbol(state, i.press, now);
    return null;
  },

  applyGhost(state, ghostId, input) {
    if (!state.ghosts.includes(ghostId) || state.stage !== 'READY') return null;
    const tip = (input as { tip?: unknown } | null)?.tip;
    if (tip !== 0 && tip !== 1 && tip !== 2 && tip !== 3) return null;
    return { ...state, ghostTips: { ...state.ghostTips, [ghostId]: tip } };
  },

  applyModerator(state, input, now, rng) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'start' && state.stage === 'READY') return arm(state, now);
    if (action === 'end' && state.stage === 'ARMED') return finish(state, 'MODERATOR');
    if (action === 'reassign' && state.stage === 'ARMED' && state.reassignable) {
      const pyroId = pick(
        rng,
        state.players.filter((id) => id !== state.pyroId),
      );
      const left = state.pausedLeft ?? FUSE_MS;
      return { ...state, pyroId, endsAt: now + left, pausedLeft: null, disconnectedSince: null, reassignable: false };
    }
    return null;
  },

  tick(state, now, _rng, connected) {
    if (state.stage === 'READY') return now >= (state.endsAt ?? now) ? arm(state, now) : state;
    if (state.stage !== 'ARMED') return state;
    if (state.endsAt !== null && now >= state.endsAt) return finish(state, 'TIME');
    if (!connected) return state;
    const online = connected.has(state.pyroId);
    if (online && state.endsAt === null) {
      // Pyrotechnik se vrátil: odpočet běží dál.
      return { ...state, endsAt: now + (state.pausedLeft ?? 0), pausedLeft: null, disconnectedSince: null, reassignable: false };
    }
    if (!online && state.endsAt !== null) {
      return { ...state, endsAt: null, pausedLeft: state.endsAt - now, disconnectedSince: now, reassignable: false };
    }
    if (!online && state.disconnectedSince !== null && !state.reassignable && now - state.disconnectedSince >= REASSIGN_AFTER_MS) {
      return { ...state, reassignable: true };
    }
    return state;
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const defused = state.end === 'DEFUSED';
    const n = state.errors.length;
    const errorRows = state.errors.map((e, i) => {
      const explained = explainedBy(state, e);
      const what =
        e.module === 'WIRES'
          ? `Dráty, přestřižen ${ORD(e.did as number)} drát (správně ${ORD(e.expected as number)})`
          : `Symboly, zmáčknuto ${e.did} (správně ${e.expected})`;
      return {
        label: `Chyba ${i + 1}`,
        value: explained ? `${what} · vysvětlila by ji falešná verze stránky ${explained}` : what,
      };
    });
    const clues: Clue[] = [
      {
        kind: 'list',
        title: defused ? `Bomba zneškodněna, chyb: ${n}` : 'Bomba vybuchla',
        rows: errorRows.length > 0 ? errorRows : [{ label: 'Bez chyby', value: '' }],
      },
      {
        kind: 'table',
        title: 'Kdo měl kterou stránku',
        rows: state.players.flatMap((id) =>
          (state.pages[id] ?? []).map((p) => ({ playerId: id, label: '', value: PAGE_TITLES[p] })),
        ),
      },
    ];
    const result = outcome(state);
    return {
      shieldWinnerId: defused ? state.pyroId : null,
      potDelta: defused ? Math.max(0, POT_DEFUSED - POT_PER_ERROR * n) : 0,
      summary: defused
        ? `Bomba je zneškodněná${n > 0 ? ` (chyb: ${n})` : ' bez chyby'}. Štít získává pyrotechnik.`
        : 'Bomba vybuchla. Štít nezíská nikdo.',
      clues,
      playerPoints: {},
      ghostScores: Object.fromEntries(Object.entries(state.ghostTips).map(([id, tip]) => [id, ghostPoints(tip, result)])),
    };
  },

  endsAt: (state) => (state.stage === 'DONE' ? null : state.endsAt),

  viewForPlayer(state, playerId): BombPlayerView {
    const isPyro = playerId === state.pyroId;
    return {
      stage: state.stage,
      pyroId: state.pyroId,
      isPyro,
      device: isPyro && state.stage !== 'READY' ? device(state) : null,
      pages: pagesOf(state, playerId),
      errors: state.errors.length,
      maxErrors: MAX_ERRORS,
      wiresSolved: state.wiresSolved,
      symbolsSolved: state.symbolsSolved,
      paused: state.stage === 'ARMED' && state.endsAt === null,
    };
  },

  viewForGhost(state, ghostId): BombGhostView {
    return {
      stage: state.stage,
      pyroId: state.pyroId,
      errors: state.errors.length,
      maxErrors: MAX_ERRORS,
      wiresSolved: state.wiresSolved,
      symbolsSolved: state.symbolsSolved,
      paused: state.stage === 'ARMED' && state.endsAt === null,
      myTip: state.ghostTips[ghostId] ?? null,
      canTip: state.stage === 'READY',
    };
  },

  viewForModerator(state): BombModeratorView {
    return {
      stage: state.stage,
      pyroId: state.pyroId,
      device: device(state),
      solution: { wire: state.solution.wire, order: [...state.solution.order] },
      pages: Object.fromEntries(
        state.players.map((id) => [
          id,
          (state.pages[id] ?? []).map((p) => {
            const f = state.fakes[id];
            const fake = f && f.page === p ? trueText(f.fake) : null;
            return { id: p, title: PAGE_TITLES[p], fake: fake ? `${fake.where}, pravé: ${fake.text}` : null };
          }),
        ]),
      ),
      traitors: [...state.traitors],
      errors: state.errors.map((e) => ({ ...e })),
      wiresSolved: state.wiresSolved,
      symbolsSolved: state.symbolsSolved,
      paused: state.stage === 'ARMED' && state.endsAt === null,
      reassignable: state.reassignable,
      ghostTips: { ...state.ghostTips },
    };
  },
};
