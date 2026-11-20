import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../game/engine.js';
import { seededRng } from '../game/random.js';
import { pointsOf } from '../game/rules.js';
import type { GameState } from '../game/state.js';
import { as, MOD, must, startedWith } from '../game/testing.js';
import { viewForModerator, viewForPlayer } from '../game/views.js';
import {
  auction,
  AUCTION_ID,
  auctionGhostScores,
  TALK_MS as AUCTION_TALK_MS,
  type AuctionGhostView,
  type AuctionState,
} from './auction/index.js';
import { registerMinigame, unregisterMinigame } from './registry.js';
import {
  duelGhostScores,
  splitSteal,
  SPLIT_STEAL_ID,
  type SplitStealGhostView,
  type SplitStealState,
} from './splitSteal/index.js';

const T0 = 1_000_000;

const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
  const r = apply(state, actor, action, seededRng(5), now);
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.state;
};
const rejected = (state: GameState, actor: Actor, action: Action) => {
  const r = apply(state, actor, action, seededRng(5), T0);
  if (r.ok) throw new Error(`${action.type} měla být odmítnuta`);
  return r.error;
};

/**
 * 6 hráčů, Zrádce p1. V 1. kole je vyhnán Věrný p2 a v noci zemře p6 (oba duchové).
 * Vrací ráno 1. kola.
 */
function morningWithGhosts(): GameState {
  let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
  for (const v of ['p1', 'p3', 'p4']) s = must(s, as(v), { type: 'vote', targetId: 'p2' });
  s = must(s, MOD, { type: 'closeVote' });
  s = must(s, MOD, { type: 'startNight' });
  s = must(s, as('p1'), { type: 'nightPick', targetId: 'p6' });
  return must(s, MOD, { type: 'endNight' });
}

function startMinigame(s: GameState, id: string): GameState {
  s = at(s, MOD, { type: 'drawMinigame' });
  s = at(s, MOD, { type: 'chooseMinigame', id });
  s = at(s, MOD, { type: 'confirmMinigame' });
  return at(s, MOD, { type: 'startMinigame' });
}

beforeEach(() => {
  registerMinigame(auction);
  registerMinigame(splitSteal);
});
afterEach(() => {
  unregisterMinigame(AUCTION_ID);
  unregisterMinigame(SPLIT_STEAL_ID);
});

describe('body duchů – výpočet', () => {
  it('aukce: nejbližší tip 3 (při shodě všichni), do 3 žetonů 1, jinak 0', () => {
    expect(auctionGhostScores({ a: 10, b: 14, c: 12, d: 20 }, 12)).toEqual({ a: 1, b: 1, c: 3, d: 0 });
    expect(auctionGhostScores({ a: 10, b: 14 }, 12)).toEqual({ a: 3, b: 3 });
    expect(auctionGhostScores({}, 12)).toEqual({});
  });

  it('duel: přesná sázka 3, „někdo ukradl“ se špatným duelistou 1', () => {
    expect(duelGhostScores({ a: 'A_STEALS', b: 'B_STEALS', c: 'BOTH_STEAL', d: 'BOTH_SPLIT' }, 'A_STEALS')).toEqual({
      a: 3,
      b: 1,
      c: 0,
      d: 0,
    });
    expect(duelGhostScores({ a: 'BOTH_STEAL' }, 'BOTH_STEAL')).toEqual({ a: 3 });
  });
});

describe('duchové v Tajné aukci', () => {
  it('duch tipuje součet při domluvě i přihazování a body dostane hned', () => {
    let s = startMinigame(morningWithGhosts(), AUCTION_ID);
    expect(viewForPlayer(s, 'p2')!.minigame!.ghostRule).toMatch(/součet/);
    s = at(s, as('p2'), { type: 'minigameInput', payload: { guess: 4 } });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + AUCTION_TALK_MS });
    s = at(s, as('p6'), { type: 'minigameInput', payload: { guess: 20 } });
    s = at(s, as('p3'), { type: 'minigameInput', payload: { bid: 3 } });
    s = at(s, as('p4'), { type: 'minigameInput', payload: { bid: 2 } });

    const ghostView = viewForPlayer(s, 'p2')!.minigame!.game as AuctionGhostView;
    expect(ghostView).toMatchObject({ stage: 'BID', myGuess: 4, maxSum: 40, submitted: 2, revealed: [] });
    expect(JSON.stringify(ghostView)).not.toContain('bids');

    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    for (let i = 0; i < 4; i++) s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'reveal' } });
    expect(s.minigame!.step).toBe('RESULT');
    // součet 5: p2 (4) je nejblíž → 3 body, p6 (20) → 0
    expect(pointsOf(s, 'p2', false)).toBe(3);
    expect(pointsOf(s, 'p6', false)).toBe(0);
    expect(viewForPlayer(s, 'p2')!.myPoints).toBe(3);
    expect(viewForPlayer(s, 'p4')!.minigame!.result!.ghostWinnerIds).toEqual(['p2']);
  });

  it('duch netipuje mimo domluvu a přihazování ani mimo rozsah; živý hráč tipovat nemůže', () => {
    let s = startMinigame(morningWithGhosts(), AUCTION_ID);
    expect(rejected(s, as('p2'), { type: 'minigameInput', payload: { guess: 41 } })).toBe('Teď to nejde.');
    expect(rejected(s, as('p3'), { type: 'minigameInput', payload: { guess: 5 } })).toBe('Teď to nejde.');
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    expect((s.minigame!.state as AuctionState).stage).toBe('REVEAL');
    expect(rejected(s, as('p2'), { type: 'minigameInput', payload: { guess: 5 } })).toBe('Teď to nejde.');
  });

  it('vyhnaný Zrádce v minihře netipuje', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    for (const v of ['p2', 'p3', 'p4']) s = must(s, as(v), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    // 1 Zrádce vyhnán → konec hry; pro test minihry vrátíme hru do rána.
    s.phase = 'MORNING';
    delete s.winner;
    s = startMinigame(s, AUCTION_ID);
    expect(rejected(s, as('p1'), { type: 'minigameInput', payload: { guess: 5 } })).toBe('Na tohle nemáš oprávnění.');
    expect(viewForPlayer(s, 'p1')!.minigame!.game).toBeNull();
  });
});

describe('duchové v duelu', () => {
  it('duch sází, kdo přesně ukradne; přesná sázka 3 body', () => {
    let s = startMinigame(morningWithGhosts(), SPLIT_STEAL_ID);
    const [a] = (s.minigame!.state as SplitStealState).duelists;
    s = at(s, as('p2'), { type: 'minigameInput', payload: { ghostBet: 'A_STEALS' } });
    s = at(s, as('p6'), { type: 'minigameInput', payload: { ghostBet: 'BOTH_SPLIT' } });
    expect((viewForPlayer(s, 'p2')!.minigame!.game as SplitStealGhostView).myBet).toBe('A_STEALS');

    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    s = at(s, as(a), { type: 'minigameInput', payload: { choice: 'STEAL' } });
    expect((viewForPlayer(s, 'p2')!.minigame!.game as SplitStealGhostView).revealed).toBeNull();

    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    // Po zamčení voleb už duch sázku nezmění.
    expect(rejected(s, as('p6'), { type: 'minigameInput', payload: { ghostBet: 'A_STEALS' } })).toBe('Teď to nejde.');
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'reveal' } });
    expect(pointsOf(s, 'p2', false)).toBe(3);
    expect(pointsOf(s, 'p6', false)).toBe(0);
    expect(s.minigame!.result!.ghostScores).toEqual({ p2: 3, p6: 0 });
  });
});

describe('žebříček hráčů a body pro moderátora', () => {
  it('na konci hry vidí všichni žebříček hráčů včetně bodů za tipy duchů', () => {
    let s = startMinigame(morningWithGhosts(), AUCTION_ID);
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + AUCTION_TALK_MS });
    s = at(s, as('p3'), { type: 'minigameInput', payload: { bid: 4 } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    for (let i = 0; i < 4; i++) s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'reveal' } });
    expect(viewForPlayer(s, 'p3')!.playerBoard).toBeUndefined();
    expect(viewForModerator(s, new Set()).playerPoints).toMatchObject({ p3: 2, p1: 0 });

    // Duch p2 tipne Zrádce (skryté body), pak je vyhnán Zrádce → konec hry.
    s = at(s, MOD, { type: 'showClue' });
    s = at(s, MOD, { type: 'afterClue' });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + 20_000 });
    s = at(s, MOD, { type: 'startVote' });
    s = at(s, as('p2'), { type: 'ghostTip', targetId: 'p1' });
    for (const v of ['p3', 'p4', 'p5']) s = at(s, as(v), { type: 'vote', targetId: 'p1' });
    s = at(s, MOD, { type: 'closeVote' });

    expect(s.phase).toBe('ENDED');
    const board = viewForPlayer(s, 'p4')!.playerBoard!;
    expect(board.slice(0, 2)).toEqual([
      { id: 'p3', points: 2 },
      { id: 'p2', points: 1 },
    ]);
    expect(board).toHaveLength(6);
  });

  it('bez miniher a bez bodů se žebříček hráčů neukazuje', () => {
    let s = must(startedWith(4, ['p1']), MOD, { type: 'startVote' });
    for (const v of ['p2', 'p3']) s = must(s, as(v), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    expect(s.phase).toBe('ENDED');
    expect(viewForPlayer(s, 'p2')!.playerBoard).toBeUndefined();
  });
});
