// Tajná aukce (DOC/SPEC.md, Rozšíření 2; podrobně DOC/minihry-analyza.md, kap. 4).
import type { Clue } from '../../../shared/types.js';
import { tokensWord } from '../../../shared/words.js';
import { shuffle, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';

export const AUCTION_ID = 'AUCTION';
export const TALK_MS = 60_000;
export const BID_MS = 30_000;
export const MAX_BID = 10;
/** 1 žeton = 50 bodů pokladu. */
export const TOKEN_VALUE = 50;
export const MIN_POT = 200;

export type AuctionStage = 'READY' | 'TALK' | 'BID' | 'REVEAL' | 'DONE';

export interface AuctionState {
  /** Živí hráči v pořadí hry. */
  players: string[];
  traitors: string[];
  /** Poklad na začátku (kvůli skutečnému poklesu ve stopě). */
  pot: number;
  stage: AuctionStage;
  endsAt: number | null;
  /** Potvrzené nabídky; kdo nepotvrdí, přihodil 0. */
  bids: Record<string, number>;
  /** Pořadí odhalování od nejnižší nabídky; stejné nabídky v náhodném pořadí. */
  revealOrder: string[];
  revealed: number;
  /** Tipy duchů na součet nabídek (krok M5). */
  ghostGuesses: Record<string, number>;
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce. */
export interface AuctionPlayerView {
  stage: AuctionStage;
  myBid: number | null;
  submitted: number;
  total: number;
  /** Už odhalené nabídky v pořadí odhalení. */
  revealed: { playerId: string; bid: number }[];
}

export interface AuctionModeratorView extends AuctionPlayerView {
  bids: Record<string, number>;
  revealOrder: string[];
}

const bidOf = (s: AuctionState, id: string) => s.bids[id] ?? 0;

function startReveal(state: AuctionState, rng: Rng): AuctionState {
  // Od nejnižší nabídky; stejné nabídky náhodně (zamícháním před stabilním řazením).
  const order = shuffle(rng, state.players).sort((a, b) => bidOf(state, a) - bidOf(state, b));
  return { ...state, stage: 'REVEAL', endsAt: null, revealOrder: order, revealed: 0 };
}

function revealedList(state: AuctionState) {
  return state.revealOrder.slice(0, state.revealed).map((id) => ({ playerId: id, bid: bidOf(state, id) }));
}

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

export const auction: MinigameModule<AuctionState> = {
  id: AUCTION_ID,
  meta: {
    name: 'Tajná aukce',
    minPlayers: 3,
    rules: [
      'Každý má 10 žetonů a tajně přihodí na štít.',
      'Nejvyšší nabídka vyhrává štít. Při shodě nahoře ho nezíská nikdo.',
      'Všechny nabídky se platí ze společného pokladu: 1 žeton = 50 bodů.',
      'Nejdřív minuta na domluvu nahlas, pak 30 sekund na přihazování.',
    ],
    traitorRule: 'Zrádcům nevadí, když poklad klesne. Spíš naopak.',
  },

  canRun: (ctx) => ctx.pot >= MIN_POT,

  init(ctx) {
    const alive = ctx.players.filter((p) => p.alive);
    return {
      players: alive.map((p) => p.id),
      traitors: ctx.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id),
      pot: ctx.pot,
      stage: 'READY',
      endsAt: null,
      bids: {},
      revealOrder: [],
      revealed: 0,
      ghostGuesses: {},
    };
  },

  secretCard(state, playerId) {
    // Stejný počet řádků pro obě role; Zrádce nemá skrytou informaci, jen jiný motiv.
    return state.traitors.includes(playerId)
      ? ['Každý žeton stojí poklad 50 bodů.', 'Čím víc, tím líp, ale nebuď nápadný.']
      : ['Každý žeton stojí poklad 50 bodů.', 'Šetři.'];
  },

  start(state, now) {
    return { ...state, stage: 'TALK', endsAt: now + TALK_MS };
  },

  apply(state, playerId, input) {
    if (state.stage !== 'BID' || !state.players.includes(playerId)) return null;
    const bid = (input as { bid?: unknown } | null)?.bid;
    if (!isInt(bid, 0, MAX_BID)) return null;
    return { ...state, bids: { ...state.bids, [playerId]: bid } };
  },

  applyModerator(state, input, now, rng) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'endStage') {
      if (state.stage === 'TALK') return { ...state, stage: 'BID', endsAt: now + BID_MS };
      if (state.stage === 'BID') return startReveal(state, rng);
      return null;
    }
    if (action === 'reveal' && state.stage === 'REVEAL') {
      const revealed = state.revealed + 1;
      return { ...state, revealed, stage: revealed >= state.revealOrder.length ? 'DONE' : 'REVEAL' };
    }
    return null;
  },

  tick(state, now, rng) {
    if (state.endsAt === null || now < state.endsAt) return state;
    if (state.stage === 'TALK') return { ...state, stage: 'BID', endsAt: now + BID_MS };
    if (state.stage === 'BID') return startReveal(state, rng);
    return state;
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const bids = state.players.map((id) => ({ id, bid: bidOf(state, id) }));
    const sum = bids.reduce((s, b) => s + b.bid, 0);
    const top = Math.max(...bids.map((b) => b.bid));
    const leaders = bids.filter((b) => b.bid === top);
    const winner = leaders.length === 1 && top > 0 ? leaders[0].id : null;
    const loss = Math.min(sum * TOKEN_VALUE, state.pot);

    const clues: Clue[] = [
      {
        kind: 'table',
        title: 'Nabídky',
        rows: [...bids]
          .sort((a, b) => b.bid - a.bid)
          .map((b) => ({ playerId: b.id, label: '', value: `${b.bid} ${tokensWord(b.bid)}` })),
      },
      {
        kind: 'list',
        title: 'Součet',
        rows: [
          { label: 'Přihozeno celkem', value: `${sum} ${tokensWord(sum)}` },
          { label: 'Poklad se snížil o', value: `${loss} bodů` },
        ],
      },
    ];

    return {
      shieldWinnerId: winner,
      potDelta: sum === 0 ? 0 : -sum * TOKEN_VALUE,
      summary: winner
        ? `Nejvyšší nabídka byla ${top} ${tokensWord(top)} a štít získává jediný, kdo ji dal.`
        : top === 0
          ? 'Nikdo nepřihodil, štít zůstává v trezoru.'
          : `Nejvyšší nabídku (${top}) dalo víc hráčů, štít zůstává v trezoru.`,
      clues,
      playerPoints: {},
      ghostScores: {},
    };
  },

  endsAt: (state) => state.endsAt,

  viewForPlayer(state, playerId): AuctionPlayerView {
    return {
      stage: state.stage,
      myBid: playerId in state.bids ? state.bids[playerId] : null,
      submitted: Object.keys(state.bids).length,
      total: state.players.length,
      revealed: revealedList(state),
    };
  },

  viewForModerator(state): AuctionModeratorView {
    return {
      stage: state.stage,
      myBid: null,
      submitted: Object.keys(state.bids).length,
      total: state.players.length,
      revealed: revealedList(state),
      bids: { ...state.bids },
      revealOrder: [...state.revealOrder],
    };
  },
};
