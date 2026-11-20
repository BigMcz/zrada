import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { as, MOD, must, startedWith } from '../../game/testing.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import {
  CHOOSE_MS,
  splitSteal,
  SPLIT_STEAL_ID,
  TALK_MS,
  type Choice,
  type SplitStealPlayerView,
  type SplitStealState,
} from './index.js';

const T0 = 1_000_000;
const rng = (seed = 3) => seededRng(seed);

const ctx = (memory?: unknown): MinigameContext => ({
  players: ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, role: i === 0 ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts: [],
  pot: 1000,
  round: 1,
  memory,
});

/** Duel ve fázi volby s pevnými duelisty a, b. */
function choosing(): SplitStealState {
  let s = splitSteal.init(ctx(), rng(), T0);
  s = { ...s, duelists: ['a', 'b'] };
  s = splitSteal.start(s, T0, rng());
  return splitSteal.tick(s, T0 + TALK_MS, rng());
}

function input(s: SplitStealState, id: string, payload: unknown): SplitStealState {
  const next = splitSteal.apply(s, id, payload, T0, rng());
  if (!next) throw new Error(`vstup ${id} odmítnut: ${JSON.stringify(payload)}`);
  return next;
}

function finish(s: SplitStealState): SplitStealState {
  s = splitSteal.applyModerator!(s, { action: 'endStage' }, T0, rng())!;
  return splitSteal.applyModerator!(s, { action: 'reveal' }, T0, rng())!;
}

function duel(ca: Choice | null, cb: Choice | null) {
  let s = choosing();
  if (ca) s = input(s, 'a', { choice: ca });
  if (cb) s = input(s, 'b', { choice: cb });
  return splitSteal.result(finish(s));
}

describe('Rozdělit, nebo ukrást – pravidla', () => {
  it('los vybere dva různé živé duelisty', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = splitSteal.init(ctx(), rng(seed), T0);
      expect(new Set(s.duelists).size).toBe(2);
      for (const d of s.duelists) expect(s.players).toContain(d);
    }
  });

  it('kdo už byl duelistou, má nižší šanci', () => {
    let count = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = splitSteal.init(ctx({ duelists: ['a', 'b'] }), rng(seed), T0);
      count += s.duelists.filter((d) => d === 'a' || d === 'b').length;
    }
    // Bez paměti by na a/b připadlo ~40 % míst (2 z 5), s nižší váhou výrazně méně.
    expect(count / 800).toBeLessThan(0.3);
  });

  it('domluva 60 s, volba 10 s, pak čeká na odhalení moderátorem', () => {
    let s = splitSteal.start({ ...splitSteal.init(ctx(), rng(), T0), duelists: ['a', 'b'] }, T0, rng());
    expect(splitSteal.apply(s, 'a', { choice: 'STEAL' }, T0, rng())).toBeNull();
    s = splitSteal.tick(s, T0 + TALK_MS, rng());
    expect(s).toMatchObject({ stage: 'CHOOSE', endsAt: T0 + TALK_MS + CHOOSE_MS });
    s = splitSteal.tick(s, T0 + TALK_MS + CHOOSE_MS, rng());
    expect(s.stage).toBe('REVEAL');
    expect(splitSteal.isFinished(s)).toBe(false);
    s = splitSteal.applyModerator!(s, { action: 'reveal' }, T0, rng())!;
    expect(splitSteal.isFinished(s)).toBe(true);
  });

  it('duelista volí Rozdělit/Ukrást, divák sází; volbu jde do konce změnit', () => {
    let s = choosing();
    expect(splitSteal.apply(s, 'a', { bet: 'BOTH_SPLIT' }, T0, rng())).toBeNull();
    expect(splitSteal.apply(s, 'c', { choice: 'STEAL' }, T0, rng())).toBeNull();
    expect(splitSteal.apply(s, 'c', { bet: 'NESMYSL' }, T0, rng())).toBeNull();
    s = input(s, 'a', { choice: 'STEAL' });
    s = input(s, 'a', { choice: 'SPLIT' });
    s = input(s, 'c', { bet: 'ONE_STEALS' });
    expect(s.choices).toEqual({ a: 'SPLIT' });
    expect(s.bets).toEqual({ c: 'ONE_STEALS' });
  });

  it('všechny čtyři výsledky podle tabulky', () => {
    expect(duel('SPLIT', 'SPLIT')).toMatchObject({ shieldWinnerId: null, potDelta: 300 });
    expect(duel('STEAL', 'SPLIT')).toMatchObject({ shieldWinnerId: 'a', potDelta: 0 });
    expect(duel('SPLIT', 'STEAL')).toMatchObject({ shieldWinnerId: 'b', potDelta: 0 });
    expect(duel('STEAL', 'STEAL')).toMatchObject({ shieldWinnerId: null, potDelta: -200 });
  });

  it('kdo nezvolí, rozděluje', () => {
    expect(duel(null, null)).toMatchObject({ shieldWinnerId: null, potDelta: 300 });
    expect(duel('STEAL', null)).toMatchObject({ shieldWinnerId: 'a' });
  });

  it('správná sázka: +20 do pokladu a +1 bod divákovi', () => {
    let s = choosing();
    s = input(s, 'a', { choice: 'STEAL' });
    s = input(s, 'c', { bet: 'ONE_STEALS' });
    s = input(s, 'd', { bet: 'ONE_STEALS' });
    s = input(s, 'e', { bet: 'BOTH_SPLIT' });
    const r = splitSteal.result(finish(s));
    expect(r.potDelta).toBe(40);
    expect(r.playerPoints).toEqual({ c: 1, d: 1 });
  });

  it('stopa ukáže volby duelistů a sázky diváků; paměť si zapamatuje duelisty', () => {
    let s = choosing();
    s = input(s, 'b', { choice: 'STEAL' });
    s = input(s, 'c', { bet: 'BOTH_STEAL' });
    const r = splitSteal.result(finish(s));
    expect(r.clues[0].rows.map((x) => x.value)).toEqual(['Rozdělit', 'Ukrást']);
    expect(r.clues[1].rows).toEqual([
      { playerId: 'c', label: '', value: 'Oba ukradnou' },
      { playerId: 'd', label: '', value: 'nevsadil/a' },
      { playerId: 'e', label: '', value: 'nevsadil/a' },
    ]);
    expect(r.memory).toEqual({ duelists: ['a', 'b'] });
  });
});

describe('Rozdělit, nebo ukrást – utajení', () => {
  it('volby duelistů vidí ostatní až po odhalení; duelista vidí jen svou', () => {
    let s = input(choosing(), 'a', { choice: 'STEAL' });
    const spectator = splitSteal.viewForPlayer(s, 'c') as SplitStealPlayerView;
    expect(spectator.revealed).toBeNull();
    expect(JSON.stringify(spectator)).not.toContain('STEAL');
    expect((splitSteal.viewForPlayer(s, 'b') as SplitStealPlayerView).myChoice).toBeNull();
    expect((splitSteal.viewForPlayer(s, 'a') as SplitStealPlayerView).myChoice).toBe('STEAL');

    s = splitSteal.applyModerator!(s, { action: 'endStage' }, T0, rng())!;
    expect((splitSteal.viewForPlayer(s, 'c') as SplitStealPlayerView).revealed).toBeNull();
    s = splitSteal.applyModerator!(s, { action: 'reveal' }, T0, rng())!;
    expect((splitSteal.viewForPlayer(s, 'c') as SplitStealPlayerView).revealed).toEqual({ a: 'STEAL', b: 'SPLIT' });
  });

  it('Zrádce a Věrný (diváci i duelisté) mají stejný tvar pohledu', () => {
    const s = choosing(); // a = Zrádce a duelista
    const keys = (v: unknown) => Object.keys(v as object).sort();
    for (const id of ['b', 'c', 'd']) expect(keys(splitSteal.viewForPlayer(s, id))).toEqual(keys(splitSteal.viewForPlayer(s, 'a')));
  });

  it('tajná karta má pro obě role stejný počet řádků', () => {
    const s = choosing();
    expect(splitSteal.secretCard(s, 'a')).toHaveLength(splitSteal.secretCard(s, 'c').length);
  });
});

describe('Rozdělit, nebo ukrást ve hře', () => {
  beforeEach(() => registerMinigame(splitSteal));
  afterEach(() => unregisterMinigame(SPLIT_STEAL_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celý duel: zloděj vyhraje štít a +2, správní sázkaři +1, paměť přejde do dalšího dne', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    const [a, b] = (s.minigame!.state as SplitStealState).duelists;
    s = at(s, as(a), { type: 'minigameInput', payload: { choice: 'STEAL' } });
    s = at(s, as(b), { type: 'minigameInput', payload: { choice: 'SPLIT' } });
    const spectators = s.players.map((p) => p.id).filter((id) => id !== a && id !== b);
    s = at(s, as(spectators[0]), { type: 'minigameInput', payload: { bet: 'ONE_STEALS' } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'reveal' } });

    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe(a);
    expect(pointsOf(s, a, false)).toBe(2);
    expect(pointsOf(s, spectators[0], false)).toBe(1);
    expect(s.pot).toBe(1020);
    expect(s.minigameMemory[SPLIT_STEAL_ID]).toEqual({ duelists: [a, b] });
  });
});
