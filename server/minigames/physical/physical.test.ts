import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { viewForModerator, viewForPlayer } from '../../game/views.js';
import { as, GUEST, MOD, must, rejected, startedWith } from '../../game/testing.js';
import { drawCandidates, manualChoices } from '../framework.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import { MAX_TEXT, physical, PHYSICAL_ID, SUGGESTIONS, type PhysicalPlayerView, type PhysicalState } from './index.js';

const T0 = 1_000_000;
const rng = () => seededRng(3);
const IDS = ['a', 'b', 'c', 'd'];

const ctx = (ghosts: string[] = []): MinigameContext => ({
  players: [...IDS.map((id) => ({ id, role: id === 'a' ? ('TRAITOR' as const) : ('LOYAL' as const), alive: true })), { id: 'x', role: 'LOYAL', alive: false }],
  ghosts,
  pot: 1000,
  round: 1,
  memory: undefined,
});

const started = (ghosts: string[] = []) => physical.start(physical.init(ctx(ghosts), rng(), T0), T0, rng());
const mod = (s: PhysicalState, payload: unknown) => physical.applyModerator!(s, payload, T0, rng());
const published = (ghosts: string[] = []) => mod(started(ghosts), { action: 'publish', text: SUGGESTIONS[0] })!;
const outcome = (o: Record<string, unknown>) => ({ action: 'result', potDelta: 100, winnerId: 'b', ghostId: null, ...o });

describe('Fyzická mise – modul', () => {
  it('zadání: moderátor zveřejní text, telefony ho uvidí až pak', () => {
    let s = started();
    expect(physical.viewForPlayer(s, 'b')).toEqual({ stage: 'BRIEF', text: null });
    s = mod(s, { action: 'publish', text: '  Postavte   věž.  ' })!;
    expect(physical.viewForPlayer(s, 'b')).toEqual({ stage: 'RUN', text: 'Postavte věž.' });
    expect(physical.isFinished(s)).toBe(false);
    expect(physical.endsAt(s)).toBeNull();
  });

  it('zadání: prázdné, delší než 300 znaků nebo podruhé se odmítne', () => {
    const s = started();
    expect(mod(s, { action: 'publish', text: '   ' })).toBeNull();
    expect(mod(s, { action: 'publish', text: 'x'.repeat(MAX_TEXT + 1) })).toBeNull();
    expect(mod(s, { action: 'publish', text: 42 })).toBeNull();
    expect(mod(s, { action: 'publish', text: 'x'.repeat(MAX_TEXT) })).not.toBeNull();
    expect(mod(published(), { action: 'publish', text: 'Znovu' })).toBeNull();
    expect(mod(s, outcome({}))).toBeNull(); // výsledek až po zveřejnění
  });

  it('výsledek: štít, poklad, duch a stopa podle zápisu', () => {
    let s = published(['g1', 'g2']);
    s = mod(s, outcome({ potDelta: -150, winnerId: 'c', ghostId: 'g2', note: 'Petra upustila klíč dvakrát.' }))!;
    expect(physical.isFinished(s)).toBe(true);
    const r = physical.result(s);
    expect(r).toMatchObject({ shieldWinnerId: 'c', potDelta: -150, ghostScores: { g2: 3 } });
    expect(r.clues[0].rows.map((x) => x.label)).toEqual([SUGGESTIONS[0], 'Petra upustila klíč dvakrát.']);
  });

  it('výsledek bez štítu, bez ducha a bez stopy', () => {
    const s = mod(published(['g']), outcome({ potDelta: 0, winnerId: null, ghostId: null }))!;
    const r = physical.result(s);
    expect(r).toMatchObject({ shieldWinnerId: null, potDelta: 0, ghostScores: {} });
    expect(r.clues[0].rows).toHaveLength(1);
    expect(r.summary).toContain('nikdo');
  });

  it('neplatný výsledek se odmítne: poklad mimo rozsah nebo krok, mrtvý či neznámý hráč, neznámý duch, dlouhá stopa', () => {
    const s = published(['g']);
    for (const bad of [
      { potDelta: 350 },
      { potDelta: -250 },
      { potDelta: 120 },
      { potDelta: '100' },
      { winnerId: 'x' }, // mrtvý
      { winnerId: 'zzz' },
      { winnerId: 'g' }, // duch nemůže získat štít
      { ghostId: 'b' }, // živý hráč není duch
      { note: 'x'.repeat(MAX_TEXT + 1) },
    ]) {
      expect(mod(s, outcome(bad))).toBeNull();
    }
    expect(mod(s, outcome({ potDelta: 300 }))).not.toBeNull();
    expect(mod(s, outcome({ potDelta: -200 }))).not.toBeNull();
  });

  it('hráči ani duchové nic nezadávají; Věrný a Zrádce mají stejný pohled; karty mají stejný počet řádků', () => {
    const s = published(['g']);
    expect(physical.apply(s, 'b', { anything: 1 }, T0, rng())).toBeNull();
    expect(physical.applyGhost!(s, 'g', { tip: 1 }, T0)).toBeNull();
    expect(physical.viewForPlayer(s, 'a')).toEqual(physical.viewForPlayer(s, 'b'));
    expect((physical.viewForGhost!(s, 'g') as PhysicalPlayerView).text).toBe(SUGGESTIONS[0]);
    expect(physical.secretCard(s, 'a')).toHaveLength(physical.secretCard(s, 'b').length);
    expect(physical.secretCard(s, 'a')).not.toEqual(physical.secretCard(s, 'b'));
  });
});

describe('Fyzická mise ve hře', () => {
  beforeEach(() => registerMinigame(physical));
  afterEach(() => unregisterMinigame(PHYSICAL_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('výchozí stav: vypnutá, nelosuje se ani nejde vybrat ručně', () => {
    const s = startedWith(5, ['p1']);
    expect(s.settings.physicalMission).toBe(false);
    expect(viewForModerator(s, new Set()).physicalMission).toBe(false);
    expect(drawCandidates(s).map((m) => m.id)).not.toContain(PHYSICAL_ID);
    expect(manualChoices(s).map((m) => m.id)).not.toContain(PHYSICAL_ID);
    rejected(s, MOD, { type: 'drawMinigame' });
  });

  it('přepínač jde kdykoli, ale jen moderátorovi', () => {
    let s = startedWith(5, ['p1']);
    rejected(s, as('p2'), { type: 'setPhysicalMission', enabled: true });
    rejected(s, GUEST, { type: 'setPhysicalMission', enabled: true });
    s = must(s, MOD, { type: 'startVote' });
    s = must(s, MOD, { type: 'setPhysicalMission', enabled: true });
    expect(s.settings.physicalMission).toBe(true);
    expect(viewForModerator(s, new Set()).physicalMission).toBe(true);
    s = must(s, MOD, { type: 'setPhysicalMission', enabled: false });
    expect(s.settings.physicalMission).toBe(false);
  });

  it('zapnutá mise přes engine: zadání, výsledek, štít a +2, poklad a body ducha', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'setPhysicalMission', enabled: true });
    s = must(s, MOD, { type: 'drawMinigame' });
    expect(s.minigame!.id).toBe(PHYSICAL_ID);
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    expect((viewForPlayer(s, 'p2')!.minigame!.game as PhysicalPlayerView).text).toBeNull();
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'publish', text: SUGGESTIONS[2] } });
    expect((viewForPlayer(s, 'p2')!.minigame!.game as PhysicalPlayerView).text).toBe(SUGGESTIONS[2]);
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'result', potDelta: 250, winnerId: 'p3', ghostId: null, note: '' } });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + 300 }, T0 + 300);
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe('p3');
    expect(pointsOf(s, 'p3', false)).toBe(2);
    expect(s.pot).toBe(1250);
  });

  it('záporná změna pokladu nesníží poklad pod nulu', () => {
    let s = must(startedWith(4, ['p1']), MOD, { type: 'setPhysicalMission', enabled: true });
    s = { ...s, pot: 100 };
    s = must(s, MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'publish', text: 'Úkol' } });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'result', potDelta: -200, winnerId: null, ghostId: null } });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + 300 }, T0 + 300);
    expect(s.pot).toBe(0);
  });
});
