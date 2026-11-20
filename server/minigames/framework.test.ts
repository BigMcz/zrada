import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seededRng } from '../game/random.js';
import type { GameState } from '../game/state.js';
import { as, MOD, must, rejected, startedWith } from '../game/testing.js';
import { apply, type Action, type Actor } from '../game/engine.js';
import { viewForModerator, viewForPlayer } from '../game/views.js';
import { HANDOFF_MS } from './framework.js';
import { registerMinigame, unregisterMinigame } from './registry.js';
import { makeButtonModule, makeTimedButtonModule, TEST_DURATION_MS } from './testModule.js';

const SYSTEM: Actor = { kind: 'system' };
const T0 = 1_000_000;

/** Akce s pevným časem. */
function at(state: GameState, actor: Actor, action: Action, now = T0, seed = 1): GameState {
  const r = apply(state, actor, action, seededRng(seed), now);
  if (!r.ok) throw new Error(`Akce ${action.type} odmítnuta: ${r.error}`);
  return r.state;
}

function rejectedAt(state: GameState, actor: Actor, action: Action, now = T0): string {
  const r = apply(state, actor, action, seededRng(1), now);
  if (r.ok) throw new Error(`Akce ${action.type} měla být odmítnuta`);
  return r.error;
}

/** 6 hráčů, Zrádce p1, minihra TEST vylosovaná, potvrzená a spuštěná. */
function playing(): GameState {
  let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
  s = must(s, MOD, { type: 'chooseMinigame', id: 'TEST' });
  s = at(s, MOD, { type: 'confirmMinigame' });
  return at(s, MOD, { type: 'startMinigame' });
}

/** Všichni živí zmáčknou v pořadí podle seznamu; vítěz = první. */
function everyonePresses(s: GameState, order = ['p3', 'p1', 'p2', 'p4', 'p5', 'p6']): GameState {
  for (const id of order) s = at(s, as(id), { type: 'minigameInput', payload: 'press' });
  return s;
}

/** Ráno po první noci (bez minihry). */
function morning(): GameState {
  let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
  s = must(s, MOD, { type: 'closeVote' });
  s = must(s, MOD, { type: 'startNight' });
  s = must(s, as('p1'), { type: 'nightPick', targetId: 'p6' });
  return must(s, MOD, { type: 'endNight' });
}

beforeEach(() => {
  registerMinigame(makeButtonModule('TEST'));
  registerMinigame(makeButtonModule('TEST2'));
});
afterEach(() => {
  for (const id of ['TEST', 'TEST2', 'BIG', 'TIMED']) unregisterMinigame(id);
});

describe('řízení dne a los', () => {
  it('po rozdání rolí jde minihru spustit; los vybere registrovanou minihru', () => {
    const s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    expect(s.phase).toBe('MINIGAME');
    expect(s.round).toBe(1);
    expect(s.minigame).toMatchObject({ step: 'DRAW', rerollsLeft: 1 });
    expect(['TEST', 'TEST2']).toContain(s.minigame!.id);
  });

  it('ráno spuštění minihry začne nový den a štít z minulé noci zmizí', () => {
    let s = morning();
    s.shieldHolderId = 'p2';
    s = must(s, MOD, { type: 'drawMinigame' });
    expect(s.round).toBe(2);
    expect(s.shieldHolderId).toBeNull();
  });

  it('přeskočení minihry ráno (rovnou kulatý stůl) taky začne nový den', () => {
    let s = morning();
    s.shieldHolderId = 'p2';
    s = must(s, MOD, { type: 'startVote' });
    expect(s.round).toBe(2);
    expect(s.shieldHolderId).toBeNull();
  });

  it('vypnuté minihry nejde spustit a přepínač jde měnit jen v lobby', () => {
    let s = startedWith(6, ['p1']);
    expect(rejected(s, MOD, { type: 'setMinigames', enabled: false })).toBe('Teď to nejde.');
    s.settings.minigamesEnabled = false;
    expect(rejected(s, MOD, { type: 'drawMinigame' })).toBe('Minihry jsou vypnuté.');
    expect(viewForModerator(s, new Set()).minigameAvailable).toBe(false);
  });

  it('bez vhodné minihry se nic nelosuje a fáze se nezmění', () => {
    unregisterMinigame('TEST');
    unregisterMinigame('TEST2');
    registerMinigame(makeButtonModule('BIG', 9));
    const s = startedWith(6, ['p1']);
    expect(rejected(s, MOD, { type: 'drawMinigame' })).toMatch(/žádná minihra/);
    expect(viewForModerator(s, new Set()).minigameAvailable).toBe(false);
  });

  it('los neopakuje odehranou minihru; když se hrály všechny, vynechá jen včerejší', () => {
    const s = startedWith(6, ['p1']);
    s.minigamesPlayed = ['TEST'];
    for (let seed = 1; seed <= 20; seed++) {
      expect(at(s, MOD, { type: 'drawMinigame' }, T0, seed).minigame!.id).toBe('TEST2');
    }
    s.minigamesPlayed = ['TEST', 'TEST2'];
    for (let seed = 1; seed <= 20; seed++) {
      expect(at(s, MOD, { type: 'drawMinigame' }, T0, seed).minigame!.id).toBe('TEST');
    }
  });

  it('přelosovat jde jednou za den, ručně vybrat jde kdykoli při losu', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    const first = s.minigame!.id;
    s = must(s, MOD, { type: 'rerollMinigame' });
    expect(s.minigame!.id).not.toBe(first);
    expect(rejected(s, MOD, { type: 'rerollMinigame' })).toMatch(/jednou za den/);
    s = must(s, MOD, { type: 'chooseMinigame', id: first! });
    expect(s.minigame!.id).toBe(first);
    expect(rejected(s, MOD, { type: 'chooseMinigame', id: 'NEEXISTUJE' })).toMatch(/nejde hrát/);
  });

  it('minihru řídí jen moderátor', () => {
    const s = startedWith(6, ['p1']);
    rejected(s, as('p2'), { type: 'drawMinigame' });
    const drawn = must(s, MOD, { type: 'drawMinigame' });
    rejected(drawn, as('p2'), { type: 'confirmMinigame' });
    rejected(drawn, as('p2'), { type: 'skipMinigame' });
  });
});

describe('kroky minihry', () => {
  it('pravidla: každý živý hráč má tajnou kartu a moderátor vidí, kdo ji viděl', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    s = must(s, MOD, { type: 'chooseMinigame', id: 'TEST' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    expect(s.minigame!.step).toBe('INTRO');
    const traitor = viewForPlayer(s, 'p1')!.minigame!;
    const loyal = viewForPlayer(s, 'p2')!.minigame!;
    expect(traitor.secretCard).toHaveLength(2);
    expect(loyal.secretCard).toHaveLength(2);
    expect(traitor.secretCard).not.toEqual(loyal.secretCard);

    s = at(s, as('p2'), { type: 'ackSecretCard' });
    expect(viewForModerator(s, new Set()).minigame!.secretCardSeen).toEqual({ p2: true });
    expect(viewForPlayer(s, 'p2')!.minigame!.cardSeen).toBe(true);
  });

  it('hra skončí, když modul řekne; výsledek se uloží do historie a minihra se počítá jako odehraná', () => {
    let s = playing();
    expect(s.minigame!.step).toBe('PLAY');
    expect(viewForPlayer(s, 'p2')!.minigame!.endsAt).toBe(T0 + TEST_DURATION_MS);
    s = everyonePresses(s);
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigamesPlayed).toEqual(['TEST']);
    expect(s.history[0].minigame).toMatchObject({ id: 'TEST', shieldWinnerId: 'p3', potDelta: 100 });
    expect(viewForPlayer(s, 'p2')!.minigame!.result).toMatchObject({ shieldWinnerId: 'p3' });
  });

  it('neplatný vstup se odmítne a stav se nezmění', () => {
    const s = playing();
    const pressed = at(s, as('p2'), { type: 'minigameInput', payload: 'press' });
    expect(rejectedAt(pressed, as('p2'), { type: 'minigameInput', payload: 'press' })).toBe('Teď to nejde.');
    expect(rejectedAt(s, as('p2'), { type: 'minigameInput', payload: { hack: true } })).toBe('Teď to nejde.');
  });

  it('moderátor může hru ukončit dřív (podle modulu)', () => {
    let s = playing();
    s = at(s, as('p4'), { type: 'minigameInput', payload: 'press' });
    s = at(s, MOD, { type: 'minigameModerator', payload: 'end' });
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe('p4');
  });

  it('časovač: tick s časem po konci ukončí hru', () => {
    registerMinigame(makeTimedButtonModule('TIMED'));
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    s = must(s, MOD, { type: 'chooseMinigame', id: 'TIMED' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    s = at(s, SYSTEM, { type: 'tick', now: T0 + TEST_DURATION_MS - 1 });
    expect(s.minigame!.step).toBe('PLAY');
    s = at(s, SYSTEM, { type: 'tick', now: T0 + TEST_DURATION_MS });
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBeNull();
  });

  it('tick smí poslat jen server', () => {
    expect(rejectedAt(playing(), MOD, { type: 'tick', now: T0 })).toBe('Na tohle nemáš oprávnění.');
  });

  it('přeskočená minihra nedá výsledek ani se nepočítá jako odehraná; pak jde začít kulatý stůl', () => {
    let s = playing();
    expect(rejected(s, MOD, { type: 'startVote' })).toBe('Teď to nejde.');
    s = must(s, MOD, { type: 'skipMinigame' });
    expect(s.minigame).toMatchObject({ step: 'DONE', result: null });
    expect(s.minigamesPlayed).toEqual([]);
    expect(s.history.find((h) => h.minigame)).toBeUndefined();
    s = must(s, MOD, { type: 'startVote' });
    expect(s.phase).toBe('VOTE');
    expect(s.minigame).toBeNull();
    expect(s.round).toBe(1);
  });

  it('po výsledku už přeskočit nejde', () => {
    const s = everyonePresses(playing());
    expect(rejected(s, MOD, { type: 'skipMinigame' })).toBe('Teď to nejde.');
  });
});

describe('stopa a předání štítu', () => {
  const atClue = () => at(everyonePresses(playing()), MOD, { type: 'showClue' });

  it('stopa je vidět až od kroku Stopa (ani v historii ne dřív)', () => {
    const result = everyonePresses(playing());
    expect(viewForPlayer(result, 'p2')!.minigame!.clues).toBeNull();
    expect(viewForPlayer(result, 'p2')!.history[0].minigame!.clues).toEqual([]);
    const clue = at(result, MOD, { type: 'showClue' });
    expect(viewForPlayer(clue, 'p2')!.minigame!.clues![0].title).toBe('Pořadí');
    expect(viewForPlayer(clue, 'p2')!.history[0].minigame!.clues[0].rows).toHaveLength(6);
  });

  it('vítěz štít tajně daruje; po 20 s ho drží obdarovaný a volby ostatních se nepočítají', () => {
    let s = at(atClue(), MOD, { type: 'afterClue' });
    expect(s.minigame!.step).toBe('HANDOFF');
    s = at(s, as('p3'), { type: 'handoffPick', targetId: 'p5' });
    s = at(s, as('p2'), { type: 'handoffPick', targetId: 'p4' });

    // Telefon vidí jen svou volbu, moderátor všechny.
    expect(viewForPlayer(s, 'p3')!.minigame!.handoff).toEqual({ isWinner: true, myPick: 'p5', endsAt: T0 + HANDOFF_MS });
    expect(viewForPlayer(s, 'p2')!.minigame!.handoff).toEqual({ isWinner: false, myPick: 'p4', endsAt: T0 + HANDOFF_MS });
    expect(JSON.stringify(viewForPlayer(s, 'p2'))).not.toContain('"myPick":"p5"');
    expect(viewForModerator(s, new Set()).minigame!.handoff!.picks).toEqual({ p3: 'p5', p2: 'p4' });

    s = at(s, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS - 1 });
    expect(s.minigame!.step).toBe('HANDOFF');
    s = at(s, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS });
    expect(s.minigame!.step).toBe('DONE');
    expect(s.shieldHolderId).toBe('p5');
  });

  it('vítěz, který nic nezvolí nebo zvolí sám sebe, si štít ponechá', () => {
    const handoff = at(atClue(), MOD, { type: 'afterClue' });
    const noPick = at(handoff, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS });
    expect(noPick.shieldHolderId).toBe('p3');
    const self = at(at(handoff, as('p3'), { type: 'handoffPick', targetId: 'p3' }), SYSTEM, {
      type: 'tick',
      now: T0 + HANDOFF_MS,
    });
    expect(self.shieldHolderId).toBe('p3');
  });

  it('bez vítěze se předání přeskočí', () => {
    let s = playing();
    s = at(s, MOD, { type: 'minigameModerator', payload: 'end' });
    s = at(s, MOD, { type: 'showClue' });
    s = at(s, MOD, { type: 'afterClue' });
    expect(s.minigame!.step).toBe('DONE');
    expect(s.shieldHolderId).toBeNull();
  });

  it('štít jde darovat jen živému hráči', () => {
    const handoff = at(atClue(), MOD, { type: 'afterClue' });
    handoff.players.find((p) => p.id === 'p6')!.status = 'MURDERED';
    expect(rejectedAt(handoff, as('p3'), { type: 'handoffPick', targetId: 'p6' })).toBe('Tohoto hráče nelze vybrat.');
  });
});

describe('vyřazení hráči v minihře', () => {
  it('bez úlohy pro duchy nemůže vyřazený hráč do minihry zasahovat', () => {
    let s = morning();
    s = must(s, MOD, { type: 'drawMinigame' });
    s = must(s, MOD, { type: 'chooseMinigame', id: 'TEST' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    expect(rejectedAt(s, as('p6'), { type: 'minigameInput', payload: 'press' })).toBe('Na tohle nemáš oprávnění.');
    expect(rejectedAt(s, as('p6'), { type: 'ackSecretCard' })).toBe('Na tohle nemáš oprávnění.');
    expect(viewForPlayer(s, 'p6')!.minigame!.secretCard).toBeNull();
  });
});

/** Rekurzivní „tvar“ hodnoty: klíče a typy, bez konkrétních hodnot. */
function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]));
  }
  return v === null ? 'null' : typeof v;
}

describe('utajení v minihře', () => {
  it('všichni živí hráči mají v každém kroku pohled minihry stejného tvaru', () => {
    const steps: GameState[] = [];
    let s = must(startedWith(6, ['p1']), MOD, { type: 'drawMinigame' });
    steps.push(s);
    s = must(s, MOD, { type: 'chooseMinigame', id: 'TEST' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    steps.push(s);
    s = at(s, MOD, { type: 'startMinigame' });
    steps.push(s);
    s = everyonePresses(s, ['p2', 'p1', 'p3', 'p4', 'p5', 'p6']);
    steps.push(s);
    s = at(s, MOD, { type: 'showClue' });
    steps.push(s);
    s = at(s, MOD, { type: 'afterClue' });
    steps.push(s);
    s = at(s, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS });
    steps.push(s);

    // Všichni živí – Zrádce, Věrní i vítěz minihry (p2) při předání štítu – mají stejný tvar.
    for (const state of steps) {
      const traitor = viewForPlayer(state, 'p1')!.minigame;
      for (const id of ['p2', 'p3', 'p4', 'p5', 'p6']) {
        expect(shape(viewForPlayer(state, id)!.minigame)).toEqual(shape(traitor));
      }
    }
  });

  it('kdo drží štít, se v pohledech hráčů neobjeví', () => {
    let s = at(at(everyonePresses(playing()), MOD, { type: 'showClue' }), MOD, { type: 'afterClue' });
    s = at(s, as('p3'), { type: 'handoffPick', targetId: 'p5' });
    s = at(s, SYSTEM, { type: 'tick', now: T0 + HANDOFF_MS });
    expect(s.shieldHolderId).toBe('p5');
    for (const p of s.players) {
      const json = JSON.stringify(viewForPlayer(s, p.id));
      expect(json).not.toContain('shieldHolder');
      expect(json).not.toContain('picks');
    }
  });
});
