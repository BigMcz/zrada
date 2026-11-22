// Trezor (DOC/SPEC.md, Rozšíření 5; podrobně DOC/minihry-analyza.md, kap. 1).
import type { Clue } from '../../../shared/types.js';
import { pick, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';
import { dealVault, hintText, type VaultHint } from './hints.js';

export const VAULT_ID = 'VAULT';
export const VOTE_MS = 20_000;
export const CRACK_MS = 180_000;
export const MAX_ATTEMPTS = 3;
/** Po tolika ms odpojení zámečníka nabídne konzole přidělit ho znovu. */
export const REASSIGN_AFTER_MS = 20_000;
/** Poklad podle pokusu, kterým se trezor otevřel. */
export const POT_BY_ATTEMPT = [300, 200, 100];

export type VaultStage = 'VOTE' | 'CRACK' | 'DONE';
export type VaultEnd = 'OPENED' | 'NO_ATTEMPTS' | 'TIME' | 'MODERATOR';
/** Tip ducha: kolikátým pokusem se trezor otevře; 4 = neotevře se. */
export type VaultTip = 1 | 2 | 3 | 4;

export interface VaultAttempt {
  guess: number[];
  /** Počet číslic na správném místě. */
  hits: number;
  by: string;
}

export interface VaultState {
  players: string[];
  traitors: string[];
  ghosts: string[];
  digits: number;
  code: number[];
  /** Pravdivé nápovědy každého hráče. */
  hints: Record<string, VaultHint[]>;
  /** Falešná nápověda Zrádce: kterou z jeho nápověd nahrazuje. */
  fakes: Record<string, { index: number; hint: VaultHint }>;
  stage: VaultStage;
  endsAt: number;
  votes: Record<string, string>;
  locksmithId: string | null;
  attempts: VaultAttempt[];
  /** Od kdy je zámečník odpojený, nebo null. */
  disconnectedSince: number | null;
  /** Konzole smí přidělit zámečníka znovu (odpojený aspoň 20 s). */
  reassignable: boolean;
  ghostTips: Record<string, VaultTip>;
  end: VaultEnd | null;
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce. */
export interface VaultPlayerView {
  stage: VaultStage;
  digits: number;
  /** Nápovědy tak, jak je hráč má na telefonu (falešná vypadá stejně jako pravá). */
  myHints: string[];
  /** Koho smí volit (všichni kromě sebe). */
  voteTargets: string[];
  myVote: string | null;
  votedCount: number;
  locksmithId: string | null;
  isLocksmith: boolean;
  attempts: VaultAttempt[];
  attemptsLeft: number;
  /** Kód až po konci minihry. */
  revealedCode: number[] | null;
}

export interface VaultGhostView {
  stage: VaultStage;
  digits: number;
  locksmithId: string | null;
  attempts: VaultAttempt[];
  attemptsLeft: number;
  myTip: VaultTip | null;
  canTip: boolean;
  revealedCode: number[] | null;
}

export interface VaultModeratorView {
  stage: VaultStage;
  digits: number;
  code: number[];
  /** Nápovědy všech hráčů tak, jak je mají na telefonu; `fake` u falešné. */
  hints: Record<string, { text: string; fake: boolean; trueText: string }[]>;
  votes: Record<string, string>;
  locksmithId: string | null;
  attempts: VaultAttempt[];
  attemptsLeft: number;
  locksmithConnected: boolean;
  reassignable: boolean;
  ghostTips: Record<string, VaultTip>;
  traitors: string[];
}

/** Nápovědy hráče tak, jak je vidí na telefonu. */
export function shownHints(s: VaultState, id: string): VaultHint[] {
  const own = s.hints[id] ?? [];
  const fake = s.fakes[id];
  return own.map((h, i) => (fake && fake.index === i ? fake.hint : h));
}

export const hitsOf = (guess: number[], code: number[]) => guess.filter((d, i) => d === code[i]).length;

/** Zámečník podle hlasů: nejvíc hlasů, remíza los, bez hlasů los ze všech. */
export function electLocksmith(s: VaultState, rng: Rng): string {
  const counts = new Map<string, number>();
  for (const target of Object.values(s.votes)) counts.set(target, (counts.get(target) ?? 0) + 1);
  if (counts.size === 0) return pick(rng, s.players);
  const top = Math.max(...counts.values());
  return pick(rng, s.players.filter((id) => counts.get(id) === top));
}

function startCrack(s: VaultState, now: number, rng: Rng): VaultState {
  return { ...s, stage: 'CRACK', endsAt: now + CRACK_MS, locksmithId: electLocksmith(s, rng), disconnectedSince: null, reassignable: false };
}

const finish = (s: VaultState, end: VaultEnd): VaultState => ({ ...s, stage: 'DONE', end, reassignable: false });

const opened = (s: VaultState) => s.end === 'OPENED';
/** Výsledek pro tipy duchů: číslo pokusu, nebo 4 = neotevřeno. */
const outcome = (s: VaultState): VaultTip => (opened(s) ? (s.attempts.length as VaultTip) : 4);

export function ghostPoints(tip: VaultTip, result: VaultTip): number {
  if (tip === result) return 3;
  return Math.abs(tip - result) === 1 ? 1 : 0;
}

const codeText = (c: number[]) => c.join(' ');

/** Velká obrazovka: zámečník, okénka, pokusy; kód až po konci, nápovědy ani hlasy ne. */
export interface VaultScreenView {
  stage: VaultStage;
  digits: number;
  votedCount: number;
  playerCount: number;
  locksmithId: string | null;
  attempts: VaultAttempt[];
  attemptsLeft: number;
  revealedCode: number[] | null;
}

export const vault: MinigameModule<VaultState> = {
  id: VAULT_ID,
  meta: {
    name: 'Trezor',
    minPlayers: 4,
    rules: [
      'Každý má na telefonu 1–3 nápovědy ke kódu trezoru. Čtěte je nahlas.',
      'Nejdřív zvolíte zámečníka (20 s). Jen on má klávesnici. Sám sebe volit nejde.',
      'Zámečník má 3 pokusy a 3 minuty. Po pokusu trezor ukáže, kolik číslic je na správném místě.',
      'Otevře-li zámečník trezor, získá štít. Poklad +300 / +200 / +100 podle pokusu.',
    ],
    traitorRule: 'Zrádci mají na telefonu falešnou nápovědu.',
    ghostRule: 'Duchové tipují, kolikátým pokusem se trezor otevře. Přesně 3 body, o jeden vedle 1 bod.',
  },

  init(ctx, rng, now) {
    const players = ctx.players.filter((p) => p.alive).map((p) => p.id);
    const traitors = ctx.players.filter((p) => p.alive && p.role === 'TRAITOR').map((p) => p.id);
    const digits = players.length <= 4 ? 3 : 4;
    const deal = dealVault(players, traitors, digits, rng);
    return {
      players,
      traitors,
      ghosts: [...ctx.ghosts],
      digits,
      code: deal.code,
      hints: deal.hints,
      fakes: deal.fakes,
      stage: 'VOTE',
      endsAt: now + VOTE_MS,
      votes: {},
      locksmithId: null,
      attempts: [],
      disconnectedSince: null,
      reassignable: false,
      ghostTips: {},
      end: null,
    };
  },

  secretCard(state, playerId) {
    const fake = state.fakes[playerId];
    if (fake) {
      return ['Jedna tvoje nápověda je falešná.', `Pravá zní: „${hintText(state.hints[playerId][fake.index])}“`];
    }
    return ['Tvoje nápovědy jsou pravdivé.', 'Ostatním věř opatrně.'];
  },

  start(state, now) {
    return { ...state, stage: 'VOTE', endsAt: now + VOTE_MS };
  },

  apply(state, playerId, input, now) {
    if (!state.players.includes(playerId)) return null;
    const i = (input ?? {}) as { vote?: unknown; guess?: unknown };
    if (state.stage === 'VOTE' && i.vote !== undefined) {
      if (typeof i.vote !== 'string' || i.vote === playerId || !state.players.includes(i.vote)) return null;
      return { ...state, votes: { ...state.votes, [playerId]: i.vote } };
    }
    if (state.stage === 'CRACK' && i.guess !== undefined) {
      if (playerId !== state.locksmithId) return null;
      const g = i.guess;
      if (!Array.isArray(g) || g.length !== state.digits || !g.every((d) => Number.isInteger(d) && d >= 0 && d <= 9)) return null;
      const guess = [...(g as number[])];
      const hits = hitsOf(guess, state.code);
      const s = { ...state, attempts: [...state.attempts, { guess, hits, by: playerId }] };
      if (hits === state.digits) return finish(s, 'OPENED');
      if (s.attempts.length >= MAX_ATTEMPTS) return finish(s, 'NO_ATTEMPTS');
      return s;
    }
    return null;
  },

  applyGhost(state, ghostId, input) {
    if (!state.ghosts.includes(ghostId)) return null;
    if (state.stage === 'DONE' || state.attempts.length > 0) return null;
    const tip = (input as { tip?: unknown } | null)?.tip;
    if (tip !== 1 && tip !== 2 && tip !== 3 && tip !== 4) return null;
    return { ...state, ghostTips: { ...state.ghostTips, [ghostId]: tip } };
  },

  applyModerator(state, input, now, rng) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'endVote' && state.stage === 'VOTE') return startCrack(state, now, rng);
    if (action === 'end' && state.stage === 'CRACK') return finish(state, 'MODERATOR');
    if (action === 'reassign' && state.stage === 'CRACK' && state.reassignable) {
      const others = state.players.filter((id) => id !== state.locksmithId);
      return { ...state, locksmithId: pick(rng, others), disconnectedSince: null, reassignable: false };
    }
    return null;
  },

  tick(state, now, rng, connected) {
    if (state.stage === 'VOTE') return now >= state.endsAt ? startCrack(state, now, rng) : state;
    if (state.stage !== 'CRACK') return state;
    if (now >= state.endsAt) return finish(state, 'TIME');
    if (!connected || !state.locksmithId) return state;
    if (connected.has(state.locksmithId)) {
      return state.disconnectedSince === null ? state : { ...state, disconnectedSince: null, reassignable: false };
    }
    const since = state.disconnectedSince ?? now;
    const reassignable = now - since >= REASSIGN_AFTER_MS;
    if (since === state.disconnectedSince && reassignable === state.reassignable) return state;
    return { ...state, disconnectedSince: since, reassignable };
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const win = opened(state);
    const n = state.attempts.length;
    const clues: Clue[] = [
      {
        kind: 'table',
        title: 'Kód a pokusy zámečníka',
        rows: [
          { label: 'Kód trezoru', value: codeText(state.code) },
          ...state.attempts.map((a, i) => ({
            label: `${i + 1}. pokus`,
            value: `${codeText(a.guess)} · ${a.hits} z ${state.digits}`,
          })),
        ],
      },
      {
        kind: 'table',
        title: 'Nápovědy na telefonech · z pravdivých šlo kód složit jednoznačně',
        rows: state.players.flatMap((id) =>
          shownHints(state, id).map((h) => ({ playerId: id, label: '', value: hintText(h) })),
        ),
      },
    ];
    const result = outcome(state);
    const ghostScores = Object.fromEntries(
      Object.entries(state.ghostTips).map(([id, tip]) => [id, ghostPoints(tip, result)]),
    );
    return {
      shieldWinnerId: win ? state.locksmithId : null,
      potDelta: win ? POT_BY_ATTEMPT[n - 1] : 0,
      summary: win
        ? `Trezor se otevřel na ${n}. pokus. Štít získává zámečník.`
        : 'Trezor zůstal zavřený. Štít nezíská nikdo.',
      clues,
      playerPoints: {},
      ghostScores,
    };
  },

  endsAt: (state) => (state.stage === 'DONE' ? null : state.endsAt),

  viewForPlayer(state, playerId): VaultPlayerView {
    return {
      stage: state.stage,
      digits: state.digits,
      myHints: shownHints(state, playerId).map(hintText),
      voteTargets: state.players.filter((id) => id !== playerId),
      myVote: state.votes[playerId] ?? null,
      votedCount: Object.keys(state.votes).length,
      locksmithId: state.locksmithId,
      isLocksmith: state.locksmithId === playerId,
      attempts: state.attempts.map((a) => ({ ...a, guess: [...a.guess] })),
      attemptsLeft: MAX_ATTEMPTS - state.attempts.length,
      revealedCode: state.stage === 'DONE' ? [...state.code] : null,
    };
  },

  viewForGhost(state, ghostId): VaultGhostView {
    return {
      stage: state.stage,
      digits: state.digits,
      locksmithId: state.locksmithId,
      attempts: state.attempts.map((a) => ({ ...a, guess: [...a.guess] })),
      attemptsLeft: MAX_ATTEMPTS - state.attempts.length,
      myTip: state.ghostTips[ghostId] ?? null,
      canTip: state.stage !== 'DONE' && state.attempts.length === 0,
      revealedCode: state.stage === 'DONE' ? [...state.code] : null,
    };
  },

  viewForScreen(state): VaultScreenView {
    return {
      stage: state.stage,
      digits: state.digits,
      votedCount: Object.keys(state.votes).length,
      playerCount: state.players.length,
      locksmithId: state.locksmithId,
      attempts: state.attempts.map((a) => ({ ...a, guess: [...a.guess] })),
      attemptsLeft: MAX_ATTEMPTS - state.attempts.length,
      revealedCode: state.stage === 'DONE' ? [...state.code] : null,
    };
  },

  // Bot volí zámečníka náhodně; zámečník-bot trefí kód napůl (Zrádce méně), jinak část číslic.
  bot(state, botId, rng) {
    if (state.stage === 'VOTE') {
      if (botId in state.votes) return null;
      const others = state.players.filter((id) => id !== botId);
      return { vote: others[rng.int(others.length)] };
    }
    if (state.stage !== 'CRACK' || state.locksmithId !== botId) return null;
    const right = rng.int(10) < (state.traitors.includes(botId) ? 3 : 5);
    return { guess: state.code.map((d) => (right || rng.int(10) < 4 ? d : (d + 1 + rng.int(9)) % 10)) };
  },
  ghostBot(state, ghostId, rng) {
    return state.stage !== 'DONE' && state.attempts.length === 0 && !(ghostId in state.ghostTips)
      ? { tip: (1 + rng.int(4)) as VaultTip }
      : null;
  },

  viewForModerator(state): VaultModeratorView {
    return {
      stage: state.stage,
      digits: state.digits,
      code: [...state.code],
      hints: Object.fromEntries(
        state.players.map((id) => [
          id,
          shownHints(state, id).map((h, i) => ({
            text: hintText(h),
            fake: state.fakes[id]?.index === i,
            trueText: hintText(state.hints[id][i]),
          })),
        ]),
      ),
      votes: { ...state.votes },
      locksmithId: state.locksmithId,
      attempts: state.attempts.map((a) => ({ ...a, guess: [...a.guess] })),
      attemptsLeft: MAX_ATTEMPTS - state.attempts.length,
      locksmithConnected: state.disconnectedSince === null,
      reassignable: state.reassignable,
      ghostTips: { ...state.ghostTips },
      traitors: [...state.traitors],
    };
  },
};
