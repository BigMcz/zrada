import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { viewForPlayer } from '../../game/views.js';
import { as, MOD, must, startedWith } from '../../game/testing.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import {
  DISCONNECT_JUMP_MS,
  fuseRange,
  hotPotato,
  HOT_POTATO_ID,
  PAUSE_MS,
  READY_MS,
  realPressure,
  RED_ZONE_FROM,
  type HotPotatoPlayerView,
  type HotPotatoState,
} from './index.js';

const T0 = 1_000_000;
const rng = (seed = 3) => seededRng(seed);
const IDS = ['a', 'b', 'c', 'd', 'e'];

const ctx = (n = 5): MinigameContext => ({
  players: IDS.slice(0, n).map((id, i) => ({ id, role: i === 0 ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts: [],
  pot: 1000,
  round: 1,
  memory: undefined,
});

/** Bomba v 1. kole u hráče `holder`. */
function bombAt(holder = 'a', n = 5): HotPotatoState {
  let s = hotPotato.start(hotPotato.init(ctx(n), rng(), T0), T0, rng());
  s = hotPotato.tick(s, T0 + READY_MS, rng());
  return { ...s, holderId: holder };
}

function pass(s: HotPotatoState, from: string, to: string, now = T0 + READY_MS): HotPotatoState {
  const next = hotPotato.apply(s, from, { targetId: to }, now, rng());
  if (!next) throw new Error(`${from} → ${to} odmítnuto`);
  return next;
}

const explode = (s: HotPotatoState) => hotPotato.tick(s, s.explodeAt, rng());

describe('Horký brambor – pravidla', () => {
  it('nejdřív příprava, pak bomba u náhodného hráče s rozbuškou 10–25 s', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = hotPotato.start(hotPotato.init(ctx(), rng(seed), T0), T0, rng(seed));
      expect(s).toMatchObject({ stage: 'READY', endsAt: T0 + READY_MS, holderId: null });
      s = hotPotato.tick(s, T0 + READY_MS, rng(seed));
      expect(s.stage).toBe('BOMB');
      expect(IDS).toContain(s.holderId);
      expect(s.fuseMs).toBeGreaterThanOrEqual(10_000);
      expect(s.fuseMs).toBeLessThanOrEqual(25_000);
    }
  });

  it('moderátor může přípravu zkrátit', () => {
    const s = hotPotato.start(hotPotato.init(ctx(), rng(), T0), T0, rng());
    expect(hotPotato.applyModerator!(s, { action: 'endStage' }, T0 + 1, rng())!.stage).toBe('BOMB');
  });

  it('rozbuška se s každým kolem zkracuje, nejméně na 6–12 s', () => {
    expect(fuseRange(0)).toEqual([10_000, 25_000]);
    for (let r = 1; r < 10; r++) {
      const [lo, hi] = fuseRange(r);
      const [plo, phi] = fuseRange(r - 1);
      expect(lo).toBeLessThanOrEqual(plo);
      expect(hi).toBeLessThanOrEqual(phi);
      expect(lo).toBeGreaterThanOrEqual(6_000);
      expect(hi).toBeGreaterThanOrEqual(12_000);
    }
    expect(fuseRange(9)).toEqual([6_000, 12_000]);
  });

  it('bombu posílá jen držitel a ne zpět odesílateli', () => {
    let s = bombAt('a');
    expect(hotPotato.apply(s, 'b', { targetId: 'c' }, T0, rng())).toBeNull();
    expect(hotPotato.apply(s, 'a', { targetId: 'a' }, T0, rng())).toBeNull();
    expect(hotPotato.apply(s, 'a', { targetId: 'zz' }, T0, rng())).toBeNull();
    s = pass(s, 'a', 'b');
    expect(s.holderId).toBe('b');
    expect(hotPotato.apply(s, 'b', { targetId: 'a' }, T0, rng())).toBeNull();
    s = pass(s, 'b', 'c');
    expect(pass(s, 'c', 'a').holderId).toBe('a');
  });

  it('výbuch vyřadí držitele, po 3 s pauze je nová kratší bomba u zbývajícího', () => {
    let s = explode(bombAt('a'));
    expect(s).toMatchObject({ stage: 'PAUSE', eliminated: ['a'], round: 1, holderId: null });
    expect(s.remaining).not.toContain('a');
    const pauseEnd = s.endsAt!;
    expect(pauseEnd - s.explodeAt).toBe(PAUSE_MS);
    s = hotPotato.tick(s, pauseEnd, rng());
    expect(s.stage).toBe('BOMB');
    expect(s.remaining).toContain(s.holderId);
    const [lo, hi] = fuseRange(1);
    expect(s.fuseMs).toBeGreaterThanOrEqual(lo);
    expect(s.fuseMs).toBeLessThanOrEqual(hi);
    // vyřazenému bombu poslat nejde
    expect(hotPotato.apply(s, s.holderId!, { targetId: 'a' }, pauseEnd, rng())).toBeNull();
  });

  it('ve dvou platí ping-pong; poslední přeživší vyhraje štít, poklad beze změny', () => {
    let s = explode(bombAt('a', 3));
    s = { ...hotPotato.tick(s, s.endsAt!, rng()), holderId: 'b' };
    s = pass(s, 'b', 'c', s.explodeAt - 100);
    s = pass(s, 'c', 'b', s.explodeAt - 50);
    s = explode(s);
    expect(s.stage).toBe('DONE');
    expect(hotPotato.isFinished(s)).toBe(true);
    const r = hotPotato.result(s);
    expect(r).toMatchObject({ shieldWinnerId: 'c', potDelta: 0, playerPoints: {} });
  });

  it('stopa: pořadí vyřazení, zbavení na poslední chvíli a průměrné držení', () => {
    let s = bombAt('a', 3);
    const start = T0 + READY_MS;
    s = pass(s, 'a', 'b', start + 2_000);
    s = pass(s, 'b', 'c', s.explodeAt - 1_000); // poslední chvíle
    s = explode(s); // c vypadne, držel 1 s
    s = { ...hotPotato.tick(s, s.endsAt!, rng()), holderId: 'a' };
    s = explode(s); // a vypadne
    const clues = hotPotato.result(s).clues;
    expect(clues[0].rows.map((r) => r.playerId)).toEqual(['c', 'a', 'b']);
    expect(clues[0].rows.map((r) => r.value)).toEqual(['vypadl/a 1.', 'vypadl/a 2.', 'přežil/a']);
    const row = (id: string) => clues[1].rows.find((r) => r.playerId === id)!.value;
    expect(clues[1].rows[0].playerId).toBe('b');
    expect(row('b')).toMatch(/^1× · Ø /);
    expect(row('c')).toBe('0× · Ø 1,0 s');
    expect(row('a')).toMatch(/^0× · Ø /);
  });

  it('odpojený držitel: po 3 s bomba přeskočí k připojenému hráči, rozbuška běží dál', () => {
    let s = bombAt('a');
    const online = new Set(['b', 'c']);
    const t = T0 + READY_MS + 1_000;
    s = hotPotato.tick(s, t, rng(), online);
    expect(s.holderId).toBe('a');
    s = hotPotato.tick(s, t + DISCONNECT_JUMP_MS - 1, rng(), online);
    expect(s.holderId).toBe('a');
    const explodeAt = s.explodeAt;
    s = hotPotato.tick(s, t + DISCONNECT_JUMP_MS, rng(), online);
    expect(['b', 'c']).toContain(s.holderId);
    expect(s.explodeAt).toBe(explodeAt);
  });

  it('držitel, který se včas vrátí, bombu neztratí', () => {
    let s = bombAt('a');
    const t = T0 + READY_MS;
    s = hotPotato.tick(s, t, rng(), new Set(['b']));
    s = hotPotato.tick(s, t + 1_000, rng(), new Set(['a', 'b']));
    s = hotPotato.tick(s, t + 5_000, rng(), new Set(['b']));
    expect(s.holderId).toBe('a');
  });
});

describe('Horký brambor – ručička tlaku a utajení', () => {
  it('skutečný tlak roste k 1 a červené pole začíná 5 s před výbuchem', () => {
    expect(realPressure(20_000, 20_000)).toBe(0);
    expect(realPressure(5_000, 20_000)).toBe(RED_ZONE_FROM);
    expect(realPressure(5_200, 20_000)).toBeLessThan(RED_ZONE_FROM);
    expect(realPressure(0, 20_000)).toBe(1);
    expect(realPressure(6_000, 6_000)).toBe(0);
  });

  it('Zrádce dostává skutečný tlak, Věrný jen kmitání v celém rozsahu', () => {
    let s = bombAt('b');
    const seen = new Set<number>();
    let reds = 0;
    for (let t = 0; t < s.fuseMs; t += 200) {
      const now = T0 + READY_MS + t;
      s = hotPotato.tick(s, now, rng(t));
      expect(s.pressure.a).toBe(realPressure(s.explodeAt - now, s.fuseMs));
      const loyal = s.pressure.c;
      expect(loyal).toBeGreaterThanOrEqual(0);
      expect(loyal).toBeLessThanOrEqual(1);
      seen.add(loyal);
      if (loyal >= RED_ZONE_FROM && s.explodeAt - now > 5_000) reds++;
    }
    expect(seen.size).toBeGreaterThan(10);
    expect(reds).toBeGreaterThan(0);
  });

  it('Věrný a Zrádce mají v každém okamžiku stejný tvar pohledu, čas výbuchu v něm není', () => {
    let s = hotPotato.start(hotPotato.init(ctx(), rng(), T0), T0, rng());
    const keys = (v: unknown) => JSON.stringify(Object.keys(v as object).sort());
    const check = () => {
      for (const id of IDS) {
        const v = hotPotato.viewForPlayer(s, id);
        expect(keys(v)).toBe(keys(hotPotato.viewForPlayer(s, 'a')));
        const json = JSON.stringify(v);
        if (s.stage === 'BOMB') expect(json).not.toContain(String(s.explodeAt));
        expect(json).not.toMatch(/explode|fuse|traitor/i);
      }
      if (s.stage === 'BOMB') expect(hotPotato.endsAt(s)).toBeNull();
    };
    for (let t = 0; s.stage !== 'DONE' && t < 600_000; t += 200) {
      s = hotPotato.tick(s, T0 + t, rng(t));
      check();
    }
    expect(s.stage).toBe('DONE');
  });

  it('jen držitel vidí, komu bombu poslat', () => {
    const s = hotPotato.tick(bombAt('b'), T0 + READY_MS, rng());
    const v = (id: string) => hotPotato.viewForPlayer(s, id) as HotPotatoPlayerView;
    expect(v('b')).toMatchObject({ amHolder: true });
    expect(v('b').canPassTo.sort()).toEqual(['a', 'c', 'd', 'e']);
    expect(v('a')).toMatchObject({ amHolder: false, canPassTo: [] });
  });

  it('tajná karta má pro obě role stejný počet řádků', () => {
    const s = hotPotato.init(ctx(), rng(), T0);
    expect(hotPotato.secretCard(s, 'a')).toHaveLength(hotPotato.secretCard(s, 'b').length);
  });
});

describe('Horký brambor – duchové', () => {
  it('tipují jen před první bombou, platné jsou jen jména hráčů', () => {
    let s = hotPotato.start(hotPotato.init(ctx(), rng(), T0), T0, rng());
    s = hotPotato.applyGhost!(s, 'g1', { survivorId: 'a' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g1', { firstId: 'b' }, T0)!;
    expect(s.ghostTips.g1).toEqual({ survivorId: 'a', firstId: 'b' });
    expect(hotPotato.applyGhost!(s, 'g1', { survivorId: 'zz' }, T0)).toBeNull();
    expect(hotPotato.applyGhost!(s, 'g1', {}, T0)).toBeNull();
    const bomb = hotPotato.tick(s, T0 + READY_MS, rng());
    expect(hotPotato.applyGhost!(bomb, 'g1', { survivorId: 'c' }, T0)).toBeNull();
    expect(hotPotato.viewForGhost!(bomb, 'g1')).not.toHaveProperty('pressure');
  });

  it('poslední přeživší 3 body, první vyřazený 1 bod', () => {
    let s = hotPotato.start(hotPotato.init(ctx(3), rng(), T0), T0, rng());
    s = hotPotato.applyGhost!(s, 'g1', { survivorId: 'c', firstId: 'a' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g2', { survivorId: 'c', firstId: 'b' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g3', { firstId: 'a' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g4', { survivorId: 'b' }, T0)!;
    s = { ...hotPotato.tick(s, T0 + READY_MS, rng()), holderId: 'a' };
    s = explode(s);
    s = { ...hotPotato.tick(s, s.endsAt!, rng()), holderId: 'b' };
    s = explode(s);
    expect(hotPotato.result(s).ghostScores).toEqual({ g1: 4, g2: 3, g3: 1, g4: 0 });
  });
});

describe('Horký brambor ve hře', () => {
  beforeEach(() => registerMinigame(hotPotato));
  afterEach(() => unregisterMinigame(HOT_POTATO_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celá minihra přes engine: přeživší vyhraje štít a +2, telefon nedostane čas výbuchu', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
    const ids = s.players.map((p) => p.id);
    let now = T0;
    for (let i = 0; i < 2000 && s.minigame!.step === 'PLAY'; i++) {
      now += 200;
      const st = s.minigame!.state as HotPotatoState;
      if (st.stage === 'BOMB' && i % 7 === 0) {
        const holder = st.holderId!;
        const v = viewForPlayer(s, holder)!.minigame!.game as HotPotatoPlayerView;
        s = at(s, as(holder), { type: 'minigameInput', payload: { targetId: v.canPassTo[0] } }, now);
      }
      s = at(s, { kind: 'system' }, { type: 'tick', now, connected: ids }, now);
      for (const id of ids) {
        const json = JSON.stringify(viewForPlayer(s, id));
        const cur = s.minigame!.state as HotPotatoState | undefined;
        if (cur?.stage === 'BOMB') expect(json).not.toContain(String(cur.explodeAt));
      }
    }
    expect(s.minigame!.step).toBe('RESULT');
    const winner = s.minigame!.result!.shieldWinnerId!;
    expect(ids).toContain(winner);
    expect(pointsOf(s, winner, false)).toBe(2);
    expect(s.pot).toBe(1000);
  });
});
