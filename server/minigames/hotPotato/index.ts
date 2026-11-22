// Horký brambor (DOC/SPEC.md, Rozšíření 3; podrobně DOC/minihry-analyza.md, kap. 5).
import type { Clue } from '../../../shared/types.js';
import { pick, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';

export const HOT_POTATO_ID = 'HOT_POTATO';
/** Před první bombou: duchové tipují, hráči se chystají. Moderátor může zkrátit. */
export const READY_MS = 15_000;
export const PAUSE_MS = 3_000;
/** Odpojený držitel: po této době bomba sama přeskočí. */
export const DISCONNECT_JUMP_MS = 3_000;
/** Zbavit se bomby v posledních 3 s = „na poslední chvíli“ (stopa). */
export const LAST_MOMENT_MS = 3_000;
/** Červené pole ručičky: zbývá méně než 5 s. */
export const RED_ZONE_MS = 5_000;
export const RED_ZONE_FROM = 0.8;

export type PotatoStage = 'READY' | 'BOMB' | 'PAUSE' | 'DONE';

export interface HotPotatoState {
  /** Všichni živí hráči na startu (pořadí pro mřížku). */
  players: string[];
  traitors: string[];
  stage: PotatoStage;
  /** Konec READY / PAUSE. Během BOMB null (čas výbuchu zná jen server). */
  endsAt: number | null;
  round: number;
  /** Kdo je ještě v minihře. */
  remaining: string[];
  /** Pořadí vyřazení. */
  eliminated: string[];
  holderId: string | null;
  /** Od koho bomba přišla (té osobě ji nejde vrátit). */
  fromId: string | null;
  heldSince: number;
  explodeAt: number;
  fuseMs: number;
  /** Od kdy je držitel odpojený, nebo null. */
  disconnectedSince: number | null;
  /** Ručička tlaku 0–1 pro každého hráče: Zrádci skutečná, Věrní náhodná. */
  pressure: Record<string, number>;
  /** Doby držení bomby (ms) pro stopu. */
  holds: Record<string, number[]>;
  /** Kolikrát se kdo bomby zbavil v posledních 3 s. */
  lastMoment: Record<string, number>;
  ghostTips: Record<string, { survivorId: string | null; firstId: string | null }>;
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce, liší se jen hodnota `pressure`. */
export interface HotPotatoPlayerView {
  stage: PotatoStage;
  round: number;
  players: string[];
  remaining: string[];
  eliminated: string[];
  holderId: string | null;
  amHolder: boolean;
  amOut: boolean;
  /** Komu jde bombu poslat (jen držiteli, jinak prázdné). */
  canPassTo: string[];
  pressure: number;
}

export interface HotPotatoGhostView {
  stage: PotatoStage;
  round: number;
  players: string[];
  remaining: string[];
  eliminated: string[];
  holderId: string | null;
  canTip: boolean;
  myTip: { survivorId: string | null; firstId: string | null };
}

export interface HotPotatoModeratorView {
  stage: PotatoStage;
  round: number;
  players: string[];
  remaining: string[];
  eliminated: string[];
  holderId: string | null;
  /** Skutečný čas výbuchu (jen moderátor). */
  explodeAt: number | null;
  fuseMs: number;
  ghostTips: Record<string, { survivorId: string | null; firstId: string | null }>;
}

/** Rozbuška: 1. kolo 10–25 s, každé další kratší, nejméně 6–12 s. */
export function fuseRange(round: number): [number, number] {
  return [Math.max(6_000, 10_000 - 1_000 * round), Math.max(12_000, 25_000 - 3_000 * round)];
}

/** Skutečný tlak: 0 na začátku, 0,8 při 5 s do výbuchu, 1 při výbuchu. */
export function realPressure(remainingMs: number, fuseMs: number): number {
  const left = Math.max(0, remainingMs);
  if (left <= RED_ZONE_MS) return round2(RED_ZONE_FROM + (1 - RED_ZONE_FROM) * (1 - left / RED_ZONE_MS));
  const span = Math.max(1, fuseMs - RED_ZONE_MS);
  return round2(Math.max(0, RED_ZONE_FROM * (1 - (left - RED_ZONE_MS) / span)));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Náhodné kmitání pro Věrné: náhodná procházka přes celý rozsah 0–1. */
function fakePressure(prev: number, rng: Rng): number {
  let next = prev + (rng.int(61) - 30) / 100;
  if (next < 0) next = -next;
  if (next > 1) next = 2 - next;
  return round2(next);
}

function startBomb(s: HotPotatoState, now: number, rng: Rng, connected?: ReadonlySet<string>): HotPotatoState {
  const online = connected ? s.remaining.filter((id) => connected.has(id)) : s.remaining;
  const holder = pick(rng, online.length > 0 ? online : s.remaining);
  const [lo, hi] = fuseRange(s.round);
  const fuseMs = lo + rng.int(hi - lo + 1);
  return {
    ...s,
    stage: 'BOMB',
    endsAt: null,
    holderId: holder,
    fromId: null,
    heldSince: now,
    fuseMs,
    explodeAt: now + fuseMs,
    disconnectedSince: null,
  };
}

function withHold(s: HotPotatoState, id: string, ms: number): Record<string, number[]> {
  return { ...s.holds, [id]: [...(s.holds[id] ?? []), Math.max(0, ms)] };
}

/** Komu smí držitel bombu poslat. */
export function passTargets(s: HotPotatoState): string[] {
  if (s.stage !== 'BOMB' || !s.holderId) return [];
  return s.remaining.filter((id) => id !== s.holderId && (s.remaining.length === 2 || id !== s.fromId));
}

function updatePressure(s: HotPotatoState, now: number, rng: Rng): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of s.players) {
    if (s.stage !== 'BOMB') out[id] = 0;
    else if (s.traitors.includes(id)) out[id] = realPressure(s.explodeAt - now, s.fuseMs);
    else out[id] = fakePressure(s.pressure[id] ?? 0, rng);
  }
  return out;
}

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

function ghostScores(s: HotPotatoState): Record<string, number> {
  const survivor = s.remaining.length === 1 ? s.remaining[0] : null;
  const first = s.eliminated[0] ?? null;
  return Object.fromEntries(
    Object.entries(s.ghostTips).map(([id, tip]) => [
      id,
      (survivor && tip.survivorId === survivor ? 3 : 0) + (first && tip.firstId === first ? 1 : 0),
    ]),
  );
}

/** Velká obrazovka: kdo drží bombu a pořadí vyřazení; ručička tlaku ne. */
export interface HotPotatoScreenView {
  stage: PotatoStage;
  round: number;
  remaining: string[];
  eliminated: string[];
  holderId: string | null;
}

export const hotPotato: MinigameModule<HotPotatoState> = {
  id: HOT_POTATO_ID,
  meta: {
    name: 'Horký brambor',
    minPlayers: 3,
    rules: [
      'Na telefonu jednoho z vás tiká bomba. Ťukni na jméno a pošli ji dál, jen ne zpátky tomu, od koho přišla.',
      'Kdy bouchne, nikdo neví. U koho bouchne, ten vypadá z minihry (ne ze hry).',
      'Po každém výbuchu má další bomba kratší rozbušku.',
      'Poslední přeživší získá štít. Poklad se nemění.',
    ],
    traitorRule: 'Zrádcům ukazuje ručička tlaku skutečný čas do výbuchu. Ostatním jen náhodně kmitá.',
    ghostRule:
      'Duchové před první bombou tipují posledního přeživšího (3 body) a prvního, u koho bouchne (1 bod).',
  },

  init(ctx) {
    const alive = ctx.players.filter((p) => p.alive).map((p) => p.id);
    return {
      players: alive,
      traitors: ctx.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id),
      stage: 'READY',
      endsAt: null,
      round: 0,
      remaining: alive,
      eliminated: [],
      holderId: null,
      fromId: null,
      heldSince: 0,
      explodeAt: 0,
      fuseMs: 0,
      disconnectedSince: null,
      pressure: Object.fromEntries(alive.map((id) => [id, 0])),
      holds: {},
      lastMoment: {},
      ghostTips: {},
    };
  },

  secretCard(state, playerId) {
    return state.traitors.includes(playerId)
      ? ['Tvoje ručička tlaku je pravá.', 'Červené pole = zbývá méně než 5 s.']
      : ['Tvoje ručička tlaku lže.', 'Spoléhej na štěstí.'];
  },

  start(state, now) {
    return { ...state, stage: 'READY', endsAt: now + READY_MS };
  },

  apply(state, playerId, input, now) {
    if (state.stage !== 'BOMB' || playerId !== state.holderId) return null;
    const target = (input as { targetId?: unknown } | null)?.targetId;
    if (typeof target !== 'string' || !passTargets(state).includes(target)) return null;
    const lastMoment =
      state.explodeAt - now <= LAST_MOMENT_MS
        ? { ...state.lastMoment, [playerId]: (state.lastMoment[playerId] ?? 0) + 1 }
        : state.lastMoment;
    return {
      ...state,
      holds: withHold(state, playerId, now - state.heldSince),
      lastMoment,
      holderId: target,
      fromId: playerId,
      heldSince: now,
      disconnectedSince: null,
    };
  },

  applyGhost(state, ghostId, input) {
    if (state.stage !== 'READY') return null;
    const i = (input ?? {}) as { survivorId?: unknown; firstId?: unknown };
    const valid = (v: unknown) => typeof v === 'string' && state.players.includes(v);
    if (i.survivorId === undefined && i.firstId === undefined) return null;
    if (i.survivorId !== undefined && !valid(i.survivorId)) return null;
    if (i.firstId !== undefined && !valid(i.firstId)) return null;
    const prev = state.ghostTips[ghostId] ?? { survivorId: null, firstId: null };
    return {
      ...state,
      ghostTips: {
        ...state.ghostTips,
        [ghostId]: {
          survivorId: (i.survivorId as string | undefined) ?? prev.survivorId,
          firstId: (i.firstId as string | undefined) ?? prev.firstId,
        },
      },
    };
  },

  applyModerator(state, input, now, rng) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'endStage' && state.stage === 'READY') return startBomb(state, now, rng);
    return null;
  },

  tick(state, now, rng, connected) {
    let s = state;
    if ((s.stage === 'READY' || s.stage === 'PAUSE') && s.endsAt !== null && now >= s.endsAt) {
      s = startBomb(s, now, rng, connected);
    } else if (s.stage === 'BOMB' && s.holderId) {
      if (now >= s.explodeAt) {
        const out = s.holderId;
        const remaining = s.remaining.filter((id) => id !== out);
        s = {
          ...s,
          holds: withHold(s, out, s.explodeAt - s.heldSince),
          remaining,
          eliminated: [...s.eliminated, out],
          holderId: null,
          fromId: null,
          disconnectedSince: null,
          round: s.round + 1,
          stage: remaining.length <= 1 ? 'DONE' : 'PAUSE',
          endsAt: remaining.length <= 1 ? null : now + PAUSE_MS,
        };
      } else if (connected && !connected.has(s.holderId)) {
        // Odpojený držitel: po 3 s bomba přeskočí k náhodnému připojenému hráči, rozbuška běží dál.
        if (s.disconnectedSince === null) s = { ...s, disconnectedSince: now };
        else if (now - s.disconnectedSince >= DISCONNECT_JUMP_MS) {
          const online = s.remaining.filter((id) => id !== s.holderId && connected.has(id));
          if (online.length > 0) {
            s = {
              ...s,
              holds: withHold(s, s.holderId!, now - s.heldSince),
              fromId: s.holderId,
              holderId: pick(rng, online),
              heldSince: now,
              disconnectedSince: null,
            };
          }
        }
      } else if (s.disconnectedSince !== null) {
        s = { ...s, disconnectedSince: null };
      }
    }
    return { ...s, pressure: updatePressure(s, now, rng) };
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const survivor = state.remaining.length === 1 ? state.remaining[0] : null;
    const avg = (id: string) => {
      const h = state.holds[id] ?? [];
      return h.length === 0 ? null : h.reduce((a, b) => a + b, 0) / h.length;
    };
    const clues: Clue[] = [
      {
        kind: 'list',
        title: 'Pořadí vyřazení',
        rows: [
          ...state.eliminated.map((id, i) => ({ playerId: id, label: '', value: `vypadl/a ${i + 1}.` })),
          ...(survivor ? [{ playerId: survivor, label: '', value: 'přežil/a' }] : []),
        ],
      },
      {
        kind: 'table',
        title: 'Zbavil/a se bomby v posledních 3 s · Ø držení',
        rows: [...state.players]
          .sort((a, b) => (state.lastMoment[b] ?? 0) - (state.lastMoment[a] ?? 0))
          .map((id) => {
            const a = avg(id);
            return {
              playerId: id,
              label: '',
              value: `${state.lastMoment[id] ?? 0}× · ${a === null ? 'nedržel/a' : 'Ø ' + formatSeconds(a)}`,
            };
          }),
      },
    ];
    return {
      shieldWinnerId: survivor,
      potDelta: 0,
      summary: survivor
        ? `Bomba bouchla ${state.eliminated.length}×. Štít získává poslední přeživší.`
        : 'Minihra skončila bez přeživšího.',
      clues,
      playerPoints: {},
      ghostScores: ghostScores(state),
    };
  },

  endsAt: (state) => (state.stage === 'BOMB' ? null : state.endsAt),

  viewForPlayer(state, playerId): HotPotatoPlayerView {
    const amHolder = state.stage === 'BOMB' && state.holderId === playerId;
    return {
      stage: state.stage,
      round: state.round,
      players: [...state.players],
      remaining: [...state.remaining],
      eliminated: [...state.eliminated],
      holderId: state.holderId,
      amHolder,
      amOut: state.eliminated.includes(playerId),
      canPassTo: amHolder ? passTargets(state) : [],
      pressure: state.pressure[playerId] ?? 0,
    };
  },

  viewForGhost(state, ghostId): HotPotatoGhostView {
    return {
      stage: state.stage,
      round: state.round,
      players: [...state.players],
      remaining: [...state.remaining],
      eliminated: [...state.eliminated],
      holderId: state.holderId,
      canTip: state.stage === 'READY',
      myTip: { ...(state.ghostTips[ghostId] ?? { survivorId: null, firstId: null }) },
    };
  },

  viewForScreen(state): HotPotatoScreenView {
    return {
      stage: state.stage,
      round: state.round,
      remaining: [...state.remaining],
      eliminated: [...state.eliminated],
      holderId: state.holderId,
    };
  },

  // Držitel-bot bombu po chvíli (prodleva bota) pošle náhodnému hráči; duch-bot tipne.
  bot(state, botId, rng) {
    if (state.stage !== 'BOMB' || state.holderId !== botId) return null;
    const targets = passTargets(state);
    return targets.length > 0 ? { targetId: targets[rng.int(targets.length)] } : null;
  },
  ghostBot(state, ghostId, rng) {
    if (state.stage !== 'READY' || ghostId in state.ghostTips) return null;
    const pickId = () => state.players[rng.int(state.players.length)];
    return { survivorId: pickId(), firstId: pickId() };
  },

  viewForModerator(state): HotPotatoModeratorView {
    return {
      stage: state.stage,
      round: state.round,
      players: [...state.players],
      remaining: [...state.remaining],
      eliminated: [...state.eliminated],
      holderId: state.holderId,
      explodeAt: state.stage === 'BOMB' ? state.explodeAt : null,
      fuseMs: state.fuseMs,
      ghostTips: structuredClone(state.ghostTips),
    };
  },
};
