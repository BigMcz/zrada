import { describe, expect, it } from 'vitest';
import { seededRng } from './random.js';
import { pointsOf } from './rules.js';
import type { GameState } from './state.js';
import { as, MOD, must, playRandomGame, rejected, startedWith } from './testing.js';
import { viewForModerator, viewForPlayer } from './views.js';

/**
 * 6 hráčů, Zrádci p1 a p2. V 1. kole je vyhnán Věrný p3 (stane se duchem).
 * Vrací stav ve fázi VOTE_RESULT 1. kola.
 */
function afterFirstBanish(): GameState {
  let state = must(startedWith(7, ['p1', 'p2']), MOD, { type: 'startVote' });
  for (const voter of ['p1', 'p2', 'p4']) state = must(state, as(voter), { type: 'vote', targetId: 'p3' });
  return must(state, MOD, { type: 'closeVote' });
}

const ALL = (state: GameState) => new Set(state.players.map((p) => p.id));

describe('tipy duchů', () => {
  it('vyhnaný Věrný tipuje ještě v tomtéž kole a tip může měnit', () => {
    let state = afterFirstBanish();
    expect(state.phase).toBe('VOTE_RESULT');
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p4' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p1' });
    expect(state.ghostTips).toEqual({ p3: 'p1' });
  });

  it('ráno se tipovat nedá, v dalším kole zase ano', () => {
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    state = must(state, MOD, { type: 'endNight' });
    expect(state.phase).toBe('MORNING');
    expect(rejected(state, as('p3'), { type: 'ghostTip', targetId: 'p1' })).toBe('Teď to nejde.');
    state = must(state, MOD, { type: 'startVote' });
    must(state, as('p3'), { type: 'ghostTip', targetId: 'p1' });
  });

  it('živý hráč tipovat nemůže a tipovat jde jen živého hráče', () => {
    const state = afterFirstBanish();
    expect(rejected(state, as('p4'), { type: 'ghostTip', targetId: 'p1' })).toBe('Na tohle nemáš oprávnění.');
    expect(rejected(state, as('p3'), { type: 'ghostTip', targetId: 'p3' })).toBe('Tohoto hráče nelze vybrat.');
    rejected(state, as('p3'), { type: 'ghostTip', targetId: 'neexistuje' });
  });

  it('vyhnaný Zrádce netipuje', () => {
    let state = must(startedWith(7, ['p1', 'p2']), MOD, { type: 'startVote' });
    for (const voter of ['p3', 'p4', 'p5']) state = must(state, as(voter), { type: 'vote', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(state.players.find((p) => p.id === 'p1')!.status).toBe('BANISHED');
    expect(rejected(state, as('p1'), { type: 'ghostTip', targetId: 'p2' })).toBe('Na tohle nemáš oprávnění.');
    expect(viewForPlayer(state, 'p1')!.ghost).toEqual({ canTip: false, tipOpen: false, myTip: null, tipsGiven: 0 });
  });
});

describe('body za tipy', () => {
  it('tip na Zrádce dá na konci noci 1 bod, tip na Věrného nic', () => {
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p2' });
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p4' });
    state = must(state, MOD, { type: 'endNight' });
    expect(pointsOf(state, 'p3', true)).toBe(1);
    expect(state.ghostTips).toEqual({});
    expect(state.ghostTipLog).toEqual([{ round: 1, ghostId: 'p3', targetId: 'p2' }]);

    // 2. kolo: p3 tipne Věrného, p4 (zemřel v noci) tipne Zrádce
    state = must(state, MOD, { type: 'startVote' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p5' });
    state = must(state, as('p4'), { type: 'ghostTip', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, MOD, { type: 'endNight' });
    expect(pointsOf(state, 'p3', true)).toBe(1);
    expect(pointsOf(state, 'p4', true)).toBe(1);
  });

  it('když hra skončí u kulatého stolu, tipy z tohoto kola se započítají', () => {
    // 5 hráčů, Zrádce p1. 1. kolo: vyhnán Věrný p2, noc bez oběti nejde – Zrádce vybere p3.
    let state = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    state = must(state, as('p1'), { type: 'vote', targetId: 'p2' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p3' });
    state = must(state, MOD, { type: 'endNight' });
    // 2. kolo: duch p2 tipne Zrádce a Zrádce je vyhnán → konec hry
    state = must(state, MOD, { type: 'startVote' });
    state = must(state, as('p2'), { type: 'ghostTip', targetId: 'p1' });
    state = must(state, as('p4'), { type: 'vote', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(state.phase).toBe('ENDED');
    expect(pointsOf(state, 'p2', true)).toBe(1);
  });

  it('nová hra body i tipy vynuluje', () => {
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p2' });
    state.phase = 'ENDED'; // zkratka: nová hra jde jen z konce
    state = must(state, MOD, { type: 'newGame' });
    expect(state.points).toEqual([]);
    expect(state.ghostTips).toEqual({});
    expect(state.ghostTipLog).toEqual([]);
  });

  it('v 300 hrách s boty mají duchové přesně tolik bodů, kolikrát tipli Zrádce', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const state = playRandomGame(4 + (seed % 7), seededRng(seed));
      expect(state.ghostTips).toEqual({});
      for (const p of state.players) {
        const hits = state.ghostTipLog.filter(
          (t) => t.ghostId === p.id && state.players.find((x) => x.id === t.targetId)!.role === 'TRAITOR',
        ).length;
        expect(pointsOf(state, p.id, true)).toBe(hits);
        if (p.role === 'TRAITOR') expect(state.ghostTipLog.some((t) => t.ghostId === p.id)).toBe(false);
      }
    }
  });
});

describe('utajení bodů duchů', () => {
  it('během hry nikdo na telefonu nevidí body ani žebříček, na konci ano', () => {
    let sawEnded = false;
    for (let seed = 1; seed <= 60; seed++) {
      playRandomGame(4 + (seed % 7), seededRng(seed), (state) => {
        for (const p of state.players) {
          const view = viewForPlayer(state, p.id)!;
          if (state.phase !== 'ENDED') {
            expect(view.myPoints).toBe(0);
            expect(view.ghostBoard).toBeUndefined();
          } else {
            sawEnded = true;
            expect(view.myPoints).toBe(pointsOf(state, p.id, true));
          }
        }
      });
    }
    expect(sawEnded).toBe(true);
  });

  it('pohled ducha se nezmění, když se jeho tip ukáže jako správný nebo špatný', () => {
    // Duch tipne p1. Prohození rolí p1 (Zrádce) a p5 (Věrný) změní správnost tipu,
    // pohled ducha ale musí zůstat stejný.
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p1' });
    state = must(state, as('p2'), { type: 'nightPick', targetId: 'p4' });
    const swapped = structuredClone(state);
    swapped.players.find((p) => p.id === 'p1')!.role = 'LOYAL';
    swapped.players.find((p) => p.id === 'p5')!.role = 'TRAITOR';
    swapped.nightPicks = { p2: 'p4' };

    const a = must(state, MOD, { type: 'endNight' });
    const b = must(swapped, MOD, { type: 'endNight' });
    expect(pointsOf(a, 'p3', true)).toBe(1);
    expect(pointsOf(b, 'p3', true)).toBe(0);
    expect(viewForPlayer(a, 'p3')).toEqual(viewForPlayer(b, 'p3'));
  });

  it('duch vidí svůj tip a počet tipů', () => {
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    expect(viewForPlayer(state, 'p3')!.ghost).toEqual({ canTip: true, tipOpen: true, myTip: null, tipsGiven: 0 });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p1' });
    expect(viewForPlayer(state, 'p3')!.ghost).toEqual({ canTip: true, tipOpen: true, myTip: 'p1', tipsGiven: 1 });
    state = must(state, MOD, { type: 'endNight' });
    expect(viewForPlayer(state, 'p3')!.ghost).toEqual({ canTip: true, tipOpen: false, myTip: null, tipsGiven: 1 });
    expect(viewForPlayer(state, 'p4')!.ghost).toBeUndefined(); // živý hráč
  });
});

describe('duchové v pohledu moderátora', () => {
  it('moderátor vidí po celou hru tipy, jejich správnost a body', () => {
    let state = must(afterFirstBanish(), MOD, { type: 'startNight' });
    state = must(state, as('p3'), { type: 'ghostTip', targetId: 'p2' });
    expect(viewForModerator(state, ALL(state)).ghosts).toEqual([
      { id: 'p3', points: 0, tipsGiven: 1, canTip: true, tip: 'p2', tipOnTraitor: true },
    ]);

    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p4' });
    state = must(state, MOD, { type: 'endNight' });
    state = must(state, MOD, { type: 'startVote' });
    state = must(state, as('p4'), { type: 'ghostTip', targetId: 'p5' });
    expect(viewForModerator(state, ALL(state)).ghosts).toEqual([
      { id: 'p3', points: 1, tipsGiven: 1, canTip: true, tip: null, tipOnTraitor: null },
      { id: 'p4', points: 0, tipsGiven: 1, canTip: true, tip: 'p5', tipOnTraitor: false },
    ]);
  });

  it('vyhnaný Zrádce je v seznamu duchů jako netipující', () => {
    let state = must(startedWith(7, ['p1', 'p2']), MOD, { type: 'startVote' });
    for (const voter of ['p3', 'p4', 'p5']) state = must(state, as(voter), { type: 'vote', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(viewForModerator(state, ALL(state)).ghosts).toEqual([
      { id: 'p1', points: 0, tipsGiven: 0, canTip: false, tip: null, tipOnTraitor: null },
    ]);
  });
});
