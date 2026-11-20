import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../game/engine.js';
import { seededRng } from '../game/random.js';
import { pointsOf } from '../game/rules.js';
import type { GameState } from '../game/state.js';
import { as, MOD, must, startedWith } from '../game/testing.js';
import { viewForModerator, viewForPlayer } from '../game/views.js';
import { HANDOFF_MS, WIN_POINTS } from './framework.js';
import { registerMinigame, unregisterMinigame } from './registry.js';
import { makeButtonModule } from './testModule.js';
import type { MinigameResult } from './types.js';

const SYSTEM: Actor = { kind: 'system' };
const T0 = 1_000_000;

function at(state: GameState, actor: Actor, action: Action, now = T0): GameState {
  const r = apply(state, actor, action, seededRng(1), now);
  if (!r.ok) throw new Error(`Akce ${action.type} odmítnuta: ${r.error}`);
  return r.state;
}

/** Testovací minihra s předepsaným výsledkem. */
function registerFixed(id: string, result: Partial<MinigameResult>) {
  const base = makeButtonModule(id);
  registerMinigame({
    ...base,
    result: (state) => ({ ...base.result(state), ...result }),
  });
}

/** Odehraje minihru `id` od losu po výsledek; p3 zmáčkne první (vyhraje štít). */
function playTo(state: GameState, id: string): GameState {
  let s = must(state, MOD, { type: 'drawMinigame' });
  s = must(s, MOD, { type: 'chooseMinigame', id });
  s = at(s, MOD, { type: 'confirmMinigame' });
  s = at(s, MOD, { type: 'startMinigame' });
  for (const p of s.players.filter((x) => x.status === 'ALIVE')) {
    if (p.id !== 'p3') continue;
    s = at(s, as(p.id), { type: 'minigameInput', payload: 'press' });
  }
  return at(s, MOD, { type: 'minigameModerator', payload: 'end' });
}

/** Od výsledku přes stopu a předání štítu až ke kulatému stolu; vítěz štít daruje `giftTo`. */
function finishDay(state: GameState, giftTo: string | null = null): GameState {
  let s = at(state, MOD, { type: 'showClue' });
  s = at(s, MOD, { type: 'afterClue' });
  if (s.minigame!.step === 'HANDOFF') {
    if (giftTo) s = at(s, as(s.minigame!.handoff!.winnerId), { type: 'handoffPick', targetId: giftTo });
    s = at(s, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS });
  }
  return must(s, MOD, { type: 'startVote' });
}

/** Ze kulatého stolu bez hlasů do noci, Zrádce p1 vybere `target`, konec noci. */
function nightKilling(state: GameState, target: string): GameState {
  let s = must(state, MOD, { type: 'closeVote' });
  s = must(s, MOD, { type: 'startNight' });
  s = must(s, as('p1'), { type: 'nightPick', targetId: target });
  return must(s, MOD, { type: 'endNight' });
}

beforeEach(() => registerMinigame(makeButtonModule('TEST')));
afterEach(() => {
  for (const id of ['TEST', 'LOSS', 'POINTS']) unregisterMinigame(id);
});

describe('poklad', () => {
  it('hra začíná s pokladem 1000 a výsledek minihry ho změní', () => {
    const start = startedWith(6, ['p1']);
    expect(start.pot).toBe(1000);
    const s = playTo(start, 'TEST'); // testovací minihra +100
    expect(s.pot).toBe(1100);
    expect(viewForPlayer(s, 'p2')!.pot).toBe(1100);
    expect(viewForModerator(s, new Set()).pot).toBe(1100);
  });

  it('poklad nikdy neklesne pod 0', () => {
    registerFixed('LOSS', { potDelta: -5000 });
    expect(playTo(startedWith(6, ['p1']), 'LOSS').pot).toBe(0);
  });

  it('přeskočená minihra poklad ani body nezmění', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    s = must(s, MOD, { type: 'skipMinigame' });
    expect(s.pot).toBe(1000);
    expect(s.points).toEqual([]);
  });
});

describe('osobní body z miniher', () => {
  it('vítěz minihry dostane +2 a vidí je hned', () => {
    const s = playTo(startedWith(6, ['p1']), 'TEST');
    expect(pointsOf(s, 'p3', false)).toBe(WIN_POINTS);
    expect(viewForPlayer(s, 'p3')!.myPoints).toBe(2);
    expect(viewForPlayer(s, 'p2')!.myPoints).toBe(0);
  });

  it('body hráčů a duchů z výsledku; duchem je jen vyřazený Věrný', () => {
    // p6 zemře v noci 1. kola → duch. p1 je živý Zrádce, jeho „body ducha“ se nepočítají.
    registerFixed('POINTS', { playerPoints: { p4: 1 }, ghostScores: { p6: 3, p1: 3 }, shieldWinnerId: null });
    let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    s = nightKilling(s, 'p6');
    s = playTo(s, 'POINTS');
    expect(pointsOf(s, 'p4', false)).toBe(1);
    expect(pointsOf(s, 'p6', false)).toBe(3);
    expect(pointsOf(s, 'p1', false)).toBe(0);
    expect(s.history.find((h) => h.round === 2)!.minigame!.ghostWinnerIds).toEqual(['p6']);
    expect(viewForPlayer(s, 'p6')!.myPoints).toBe(3);
  });
});

describe('štít v noci', () => {
  it('když Zrádci vyberou hráče se štítem, nikdo nezemře a štít ráno zmizí', () => {
    let s = playTo(startedWith(6, ['p1']), 'TEST'); // p3 vyhraje štít
    s = finishDay(s); // p3 si ho ponechá
    expect(s.shieldHolderId).toBe('p3');
    s = nightKilling(s, 'p3');
    expect(s.phase).toBe('MORNING');
    expect(s.players.every((p) => p.status === 'ALIVE')).toBe(true);
    expect(s.history[0]).toMatchObject({ murderedId: null, shieldSaved: true });
    expect(s.shieldHolderId).toBeNull();
  });

  it('daruje-li vítěz štít, chrání obdarovaného; ostatní zemřou normálně', () => {
    let s = finishDay(playTo(startedWith(6, ['p1']), 'TEST'), 'p5');
    expect(s.shieldHolderId).toBe('p5');
    const saved = nightKilling(s, 'p5');
    expect(saved.history[0].murderedId).toBeNull();
    const killed = nightKilling(s, 'p3');
    expect(killed.history[0].murderedId).toBe('p3');
    expect(killed.history[0].shieldSaved).toBeUndefined();
  });

  it('kdo štít drží, vidí jen on; ostatní jen, že ho má někdo jiný', () => {
    const s = finishDay(playTo(startedWith(6, ['p1']), 'TEST'), 'p5');
    expect(viewForPlayer(s, 'p5')!.me.shield).toBe('MINE');
    expect(viewForPlayer(s, 'p1')!.me.shield).toBe('OTHER');
    expect(viewForPlayer(s, 'p3')!.me.shield).toBe('OTHER');
    expect(viewForModerator(s, new Set()).shieldHolderId).toBe('p5');

    // Pohled hráče, který štít nemá, se nezmění, ať ho drží kdokoli jiný.
    const other = structuredClone(s);
    other.shieldHolderId = 'p4';
    for (const viewer of ['p1', 'p2', 'p6']) {
      expect(viewForPlayer(other, viewer)).toEqual(viewForPlayer(s, viewer));
    }
  });

  it('bez minihry štít nikdo nemá', () => {
    const s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    expect(viewForPlayer(s, 'p2')!.me.shield).toBe('NONE');
  });
});
