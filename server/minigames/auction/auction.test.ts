import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { as, MOD, must, startedWith } from '../../game/testing.js';
import { viewForPlayer } from '../../game/views.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import { auction, AUCTION_ID, BID_MS, TALK_MS, type AuctionPlayerView, type AuctionState } from './index.js';

const T0 = 1_000_000;
const rng = () => seededRng(3);

const ctx = (pot = 1000): MinigameContext => ({
  players: [
    { id: 'a', role: 'TRAITOR', alive: true },
    { id: 'b', role: 'LOYAL', alive: true },
    { id: 'c', role: 'LOYAL', alive: true },
    { id: 'd', role: 'LOYAL', alive: true },
    { id: 'x', role: 'LOYAL', alive: false },
  ],
  ghosts: ['x'],
  pot,
  round: 1,
  memory: undefined,
});

/** Aukce ve fázi přihazování. */
function bidding(pot = 1000): AuctionState {
  let s = auction.start(auction.init(ctx(pot), rng(), T0), T0, rng());
  s = auction.tick(s, T0 + TALK_MS, rng());
  return s;
}

function bid(s: AuctionState, id: string, n: number): AuctionState {
  const next = auction.apply(s, id, { bid: n }, T0, rng());
  if (!next) throw new Error(`nabídka ${id}=${n} odmítnuta`);
  return next;
}

/** Dohraje odhalení až do konce. */
function revealAll(s: AuctionState): AuctionState {
  while (s.stage === 'REVEAL') s = auction.applyModerator!(s, { action: 'reveal' }, T0, rng())!;
  return s;
}

describe('Tajná aukce – pravidla', () => {
  it('hraje se jen s pokladem aspoň 200 a jen živí hráči', () => {
    expect(auction.canRun!(ctx(199))).toBe(false);
    expect(auction.canRun!(ctx(200))).toBe(true);
    expect(auction.init(ctx(), rng(), T0).players).toEqual(['a', 'b', 'c', 'd']);
  });

  it('tajná karta má pro Zrádce i Věrného stejný počet řádků', () => {
    const s = auction.init(ctx(), rng(), T0);
    expect(auction.secretCard(s, 'a')).toHaveLength(2);
    expect(auction.secretCard(s, 'b')).toHaveLength(2);
    expect(auction.secretCard(s, 'a')).not.toEqual(auction.secretCard(s, 'b'));
  });

  it('domluva 60 s, pak přihazování 30 s, pak odhalování', () => {
    let s = auction.start(auction.init(ctx(), rng(), T0), T0, rng());
    expect(s).toMatchObject({ stage: 'TALK', endsAt: T0 + TALK_MS });
    expect(auction.apply(s, 'b', { bid: 3 }, T0, rng())).toBeNull(); // při domluvě se nepřihazuje
    s = auction.tick(s, T0 + TALK_MS - 1, rng());
    expect(s.stage).toBe('TALK');
    s = auction.tick(s, T0 + TALK_MS, rng());
    expect(s).toMatchObject({ stage: 'BID', endsAt: T0 + TALK_MS + BID_MS });
    s = auction.tick(s, T0 + TALK_MS + BID_MS, rng());
    expect(s.stage).toBe('REVEAL');
  });

  it('moderátor může domluvu i přihazování ukončit dřív', () => {
    let s = auction.start(auction.init(ctx(), rng(), T0), T0, rng());
    s = auction.applyModerator!(s, { action: 'endStage' }, T0 + 5, rng())!;
    expect(s).toMatchObject({ stage: 'BID', endsAt: T0 + 5 + BID_MS });
    s = auction.applyModerator!(s, { action: 'endStage' }, T0 + 6, rng())!;
    expect(s.stage).toBe('REVEAL');
  });

  it('nabídka je celé číslo 0–10, jde ji měnit a přihazují jen živí hráči', () => {
    let s = bidding();
    for (const bad of [-1, 11, 2.5, '3', null]) expect(auction.apply(s, 'b', { bid: bad }, T0, rng())).toBeNull();
    expect(auction.apply(s, 'x', { bid: 3 }, T0, rng())).toBeNull();
    s = bid(s, 'b', 3);
    s = bid(s, 'b', 7);
    expect(s.bids).toEqual({ b: 7 });
  });

  it('odhaluje se od nejnižší nabídky; kdo nepotvrdil, přihodil 0', () => {
    let s = bidding();
    s = bid(bid(bid(s, 'a', 9), 'b', 2), 'c', 5);
    s = auction.tick(s, T0 + TALK_MS + BID_MS, rng());
    expect(s.revealOrder).toEqual(['d', 'b', 'c', 'a']);
    s = auction.applyModerator!(s, { action: 'reveal' }, T0, rng())!;
    expect((auction.viewForPlayer(s, 'b') as AuctionPlayerView).revealed).toEqual([{ playerId: 'd', bid: 0 }]);
    s = revealAll(s);
    expect(auction.isFinished(s)).toBe(true);
  });

  it('jediná nejvyšší nabídka vyhrává štít a poklad klesne o součet × 50', () => {
    let s = bidding();
    s = bid(bid(bid(s, 'a', 6), 'b', 2), 'c', 1);
    s = revealAll(auction.applyModerator!(s, { action: 'endStage' }, T0, rng())!);
    const r = auction.result(s);
    expect(r.shieldWinnerId).toBe('a');
    expect(r.potDelta).toBe(-450);
    expect(r.clues[0].rows.map((x) => x.playerId)).toEqual(['a', 'b', 'c', 'd']);
    expect(r.clues[1].rows[1].value).toBe('450 bodů');
  });

  it('při shodě nahoře ani když nikdo nepřihodí štít nezíská nikdo', () => {
    let tie = bidding();
    tie = bid(bid(tie, 'a', 4), 'b', 4);
    tie = revealAll(auction.applyModerator!(tie, { action: 'endStage' }, T0, rng())!);
    expect(auction.result(tie).shieldWinnerId).toBeNull();

    const none = revealAll(auction.applyModerator!(bidding(), { action: 'endStage' }, T0, rng())!);
    expect(auction.result(none)).toMatchObject({ shieldWinnerId: null, potDelta: 0 });
  });

  it('stopa uvádí skutečný pokles pokladu, když by šel pod nulu', () => {
    let s = bidding(300);
    s = bid(bid(s, 'a', 10), 'b', 10);
    s = revealAll(auction.applyModerator!(s, { action: 'endStage' }, T0, rng())!);
    expect(auction.result(s).clues[1].rows[1].value).toBe('300 bodů');
  });
});

describe('Tajná aukce – utajení', () => {
  it('před odhalením hráč nevidí cizí nabídky, jen kolik lidí už přihodilo', () => {
    let s = bidding();
    s = bid(bid(s, 'a', 9), 'b', 2);
    const view = auction.viewForPlayer(s, 'b') as AuctionPlayerView;
    expect(view).toEqual({ stage: 'BID', myBid: 2, submitted: 2, total: 4, revealed: [] });
    // Jiná cizí nabídka pohled nezmění.
    const other = bid(s, 'a', 1);
    expect(auction.viewForPlayer(other, 'b')).toEqual(view);
  });

  it('Věrný a Zrádce mají stejný tvar pohledu', () => {
    const s = bid(bidding(), 'a', 5);
    const keys = (v: unknown) => Object.keys(v as object).sort();
    expect(keys(auction.viewForPlayer(s, 'a'))).toEqual(keys(auction.viewForPlayer(s, 'b')));
  });
});

describe('Tajná aukce ve hře', () => {
  beforeEach(() => registerMinigame(auction));
  afterEach(() => unregisterMinigame(AUCTION_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(5), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celá aukce od losu po výsledek: poklad, štít a body vítěze', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    expect(s.minigame!.id).toBe(AUCTION_ID);
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + TALK_MS });
    s = at(s, as('p2'), { type: 'minigameInput', payload: { bid: 3 } });
    s = at(s, as('p4'), { type: 'minigameInput', payload: { bid: 1 } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    for (let i = 0; i < 6; i++) s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'reveal' } });

    expect(s.minigame!.step).toBe('RESULT');
    expect(s.pot).toBe(800);
    expect(s.minigame!.result!.shieldWinnerId).toBe('p2');
    expect(pointsOf(s, 'p2', false)).toBe(2);
    expect(viewForPlayer(s, 'p3')!.minigame!.result).toMatchObject({ shieldWinnerId: 'p2', potDelta: -200 });
  });
});
