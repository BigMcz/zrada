// Rozdělit, nebo ukrást (DOC/SPEC.md, Rozšíření 2; podrobně DOC/minihry-analyza.md, kap. 7).
import type { Clue } from '../../../shared/types.js';
import { pick, shuffle, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';

export const SPLIT_STEAL_ID = 'SPLIT_STEAL';
export const TALK_MS = 60_000;
export const CHOOSE_MS = 10_000;
/** Za každou správnou sázku diváka jde do pokladu +20. */
export const BET_POT_BONUS = 20;

export type Choice = 'SPLIT' | 'STEAL';
export type Bet = 'BOTH_SPLIT' | 'ONE_STEALS' | 'BOTH_STEAL';
export type DuelStage = 'READY' | 'TALK' | 'CHOOSE' | 'REVEAL' | 'DONE';
/** Přesnější sázka duchů: kdo přesně ukradne. */
export type GhostBet = 'BOTH_SPLIT' | 'A_STEALS' | 'B_STEALS' | 'BOTH_STEAL';
const GHOST_BETS: GhostBet[] = ['BOTH_SPLIT', 'A_STEALS', 'B_STEALS', 'BOTH_STEAL'];

export interface SplitStealGhostView {
  stage: DuelStage;
  duelists: [string, string];
  myBet: GhostBet | null;
  revealed: Record<string, Choice> | null;
}

export interface SplitStealState {
  players: string[];
  traitors: string[];
  /** Duelisté A a B. */
  duelists: [string, string];
  stage: DuelStage;
  endsAt: number | null;
  /** Volby duelistů; kdo nezvolí, rozděluje. */
  choices: Record<string, Choice>;
  /** Sázky živých diváků. */
  bets: Record<string, Bet>;
  /** Sázky duchů. */
  ghostBets: Record<string, GhostBet>;
  /** Kdo už byl v této hře duelistou (paměť napříč dny). */
  pastDuelists: string[];
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce, duelistu i diváka. */
export interface SplitStealPlayerView {
  stage: DuelStage;
  duelists: [string, string];
  amDuelist: boolean;
  myChoice: Choice | null;
  myBet: Bet | null;
  /** Volby obou duelistů; jen po odhalení. */
  revealed: Record<string, Choice> | null;
}

export interface SplitStealModeratorView {
  stage: DuelStage;
  duelists: [string, string];
  choices: Record<string, Choice>;
  bets: Record<string, Bet>;
  revealed: boolean;
}

const BETS: Bet[] = ['BOTH_SPLIT', 'ONE_STEALS', 'BOTH_STEAL'];
export const BET_LABEL: Record<Bet, string> = {
  BOTH_SPLIT: 'Oba rozdělí',
  ONE_STEALS: 'Jeden ukradne',
  BOTH_STEAL: 'Oba ukradnou',
};
export const CHOICE_LABEL: Record<Choice, string> = { SPLIT: 'Rozdělit', STEAL: 'Ukrást' };

const choiceOf = (s: SplitStealState, id: string): Choice => s.choices[id] ?? 'SPLIT';

export function ghostOutcomeOf(s: SplitStealState): GhostBet {
  const [a, b] = s.duelists;
  const sa = choiceOf(s, a) === 'STEAL';
  const sb = choiceOf(s, b) === 'STEAL';
  return sa && sb ? 'BOTH_STEAL' : sa ? 'A_STEALS' : sb ? 'B_STEALS' : 'BOTH_SPLIT';
}

/** Body duchů: přesná sázka 3; „někdo ukradl“, ale špatný duelista 1. */
export function duelGhostScores(bets: Record<string, GhostBet>, outcome: GhostBet): Record<string, number> {
  const single = (b: GhostBet) => b === 'A_STEALS' || b === 'B_STEALS';
  return Object.fromEntries(
    Object.entries(bets).map(([id, bet]) => [id, bet === outcome ? 3 : single(bet) && single(outcome) ? 1 : 0]),
  );
}

export function outcomeOf(s: SplitStealState): Bet {
  const steals = s.duelists.filter((d) => choiceOf(s, d) === 'STEAL').length;
  return steals === 0 ? 'BOTH_SPLIT' : steals === 1 ? 'ONE_STEALS' : 'BOTH_STEAL';
}

/**
 * Los dvou duelistů. Kdo už byl duelistou, má nižší šanci (váha 1 místo 3):
 * kandidáti se v osudí objeví vícekrát.
 */
function drawDuelists(players: string[], past: string[], rng: Rng): [string, string] {
  const pool = players.flatMap((id) => Array(past.includes(id) ? 1 : 3).fill(id) as string[]);
  const a = pick(rng, pool);
  const b = pick(rng, pool.filter((id) => id !== a));
  return shuffle(rng, [a, b]) as [string, string];
}

/** Velká obrazovka: duelisté a jejich volby až po odhalení. */
export interface SplitStealScreenView {
  stage: DuelStage;
  duelists: [string, string];
  revealed: Record<string, Choice> | null;
}

export const splitSteal: MinigameModule<SplitStealState> = {
  id: SPLIT_STEAL_ID,
  meta: {
    name: 'Rozdělit, nebo ukrást',
    minPlayers: 3,
    rules: [
      'Los vybere dva duelisty. Minutu se nahlas přesvědčují.',
      'Pak tajně zvolí Rozdělit, nebo Ukrást (kdo nezvolí, rozděluje). Ostatní mezitím sázejí na výsledek.',
      'Oba rozdělí: poklad +300. Jeden ukradne: zloděj získá štít. Oba ukradnou: poklad −200.',
      'Každá správná sázka diváka přidá do pokladu 20 a divákovi 1 bod.',
    ],
    traitorRule: 'Zrádcům štít nic nedá, ale krádež rozbíjí důvěru. A to se jim hodí.',
    ghostRule: 'Duchové sázejí přesněji: kdo přesně ukradne. Přesná sázka 3 body, správně „někdo ukradl“, ale špatný duelista 1 bod.',
  },

  init(ctx, rng) {
    const alive = ctx.players.filter((p) => p.alive).map((p) => p.id);
    const past = (ctx.memory as { duelists?: string[] } | undefined)?.duelists ?? [];
    return {
      players: alive,
      traitors: ctx.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id),
      duelists: drawDuelists(alive, past, rng),
      stage: 'READY',
      endsAt: null,
      choices: {},
      bets: {},
      ghostBets: {},
      pastDuelists: past,
    };
  },

  secretCard(state, playerId) {
    return state.traitors.includes(playerId)
      ? ['Rozdělit pomáhá Věrným.', 'Ukrást rozbíjí důvěru.']
      : ['Rozdělit pomáhá všem.', 'Ukrást pomáhá jen tobě.'];
  },

  start(state, now) {
    return { ...state, stage: 'TALK', endsAt: now + TALK_MS };
  },

  apply(state, playerId, input) {
    if (state.stage !== 'CHOOSE' || !state.players.includes(playerId)) return null;
    const i = (input ?? {}) as { choice?: unknown; bet?: unknown };
    if (state.duelists.includes(playerId)) {
      if (i.choice !== 'SPLIT' && i.choice !== 'STEAL') return null;
      return { ...state, choices: { ...state.choices, [playerId]: i.choice } };
    }
    if (!BETS.includes(i.bet as Bet)) return null;
    return { ...state, bets: { ...state.bets, [playerId]: i.bet as Bet } };
  },

  applyGhost(state, ghostId, input) {
    if (state.stage !== 'TALK' && state.stage !== 'CHOOSE') return null;
    const bet = (input as { ghostBet?: unknown } | null)?.ghostBet;
    if (!GHOST_BETS.includes(bet as GhostBet)) return null;
    return { ...state, ghostBets: { ...state.ghostBets, [ghostId]: bet as GhostBet } };
  },

  applyModerator(state, input, now) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'endStage') {
      if (state.stage === 'TALK') return { ...state, stage: 'CHOOSE', endsAt: now + CHOOSE_MS };
      if (state.stage === 'CHOOSE') return { ...state, stage: 'REVEAL', endsAt: null };
      return null;
    }
    if (action === 'reveal' && state.stage === 'REVEAL') return { ...state, stage: 'DONE' };
    return null;
  },

  tick(state, now) {
    if (state.endsAt === null || now < state.endsAt) return state;
    if (state.stage === 'TALK') return { ...state, stage: 'CHOOSE', endsAt: now + CHOOSE_MS };
    if (state.stage === 'CHOOSE') return { ...state, stage: 'REVEAL', endsAt: null };
    return state;
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const [a, b] = state.duelists;
    const ca = choiceOf(state, a);
    const cb = choiceOf(state, b);
    const outcome = outcomeOf(state);
    const winners = Object.entries(state.bets)
      .filter(([, bet]) => bet === outcome)
      .map(([id]) => id);

    let shieldWinnerId: string | null = null;
    let potDelta = 0;
    if (outcome === 'BOTH_SPLIT') potDelta = 300;
    if (outcome === 'BOTH_STEAL') potDelta = -200;
    if (outcome === 'ONE_STEALS') shieldWinnerId = ca === 'STEAL' ? a : b;
    potDelta += winners.length * BET_POT_BONUS;

    const clues: Clue[] = [
      {
        kind: 'table',
        title: 'Volby duelistů',
        rows: [
          { playerId: a, label: '', value: CHOICE_LABEL[ca] },
          { playerId: b, label: '', value: CHOICE_LABEL[cb] },
        ],
      },
      {
        kind: 'table',
        title: 'Sázky diváků',
        rows: state.players
          .filter((id) => !state.duelists.includes(id))
          .map((id) => ({ playerId: id, label: '', value: state.bets[id] ? BET_LABEL[state.bets[id]] : 'nevsadil/a' })),
      },
    ];

    return {
      shieldWinnerId,
      potDelta,
      summary:
        outcome === 'BOTH_SPLIT'
          ? 'Oba duelisté rozdělili.'
          : outcome === 'BOTH_STEAL'
            ? 'Oba duelisté ukradli.'
            : 'Jeden duelista ukradl, druhý rozdělil.',
      clues,
      playerPoints: Object.fromEntries(winners.map((id) => [id, 1])),
      ghostScores: duelGhostScores(state.ghostBets, ghostOutcomeOf(state)),
      memory: { duelists: [...state.pastDuelists, a, b] },
    };
  },

  endsAt: (state) => state.endsAt,

  viewForPlayer(state, playerId): SplitStealPlayerView {
    return {
      stage: state.stage,
      duelists: [...state.duelists] as [string, string],
      amDuelist: state.duelists.includes(playerId),
      myChoice: state.choices[playerId] ?? null,
      myBet: state.bets[playerId] ?? null,
      revealed:
        state.stage === 'DONE'
          ? Object.fromEntries(state.duelists.map((d) => [d, choiceOf(state, d)]))
          : null,
    };
  },

  viewForGhost(state, ghostId): SplitStealGhostView {
    return {
      stage: state.stage,
      duelists: [...state.duelists] as [string, string],
      myBet: state.ghostBets[ghostId] ?? null,
      revealed:
        state.stage === 'DONE'
          ? Object.fromEntries(state.duelists.map((d) => [d, choiceOf(state, d)]))
          : null,
    };
  },

  viewForScreen(state): SplitStealScreenView {
    return {
      stage: state.stage,
      duelists: [...state.duelists] as [string, string],
      revealed: state.stage === 'DONE' ? Object.fromEntries(state.duelists.map((d) => [d, choiceOf(state, d)])) : null,
    };
  },

  viewForModerator(state): SplitStealModeratorView {
    return {
      stage: state.stage,
      duelists: [...state.duelists] as [string, string],
      choices: { ...state.choices },
      bets: { ...state.bets },
      revealed: state.stage === 'DONE',
    };
  },
};
