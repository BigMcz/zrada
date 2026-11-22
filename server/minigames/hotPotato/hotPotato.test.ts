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
  bombCount,
  DISCONNECT_JUMP_MS,
  fuseRange,
  holdersOf,
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
const BIG = Array.from({ length: 12 }, (_, i) => `h${i}`);

const ctx = (n = 5, ids = IDS): MinigameContext => ({
  players: ids.slice(0, n).map((id, i) => ({ id, role: i === 0 ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts: [],
  pot: 1000,
  round: 1,
  memory: undefined,
});

/** Jediná (první) bomba. */
const bomb = (s: HotPotatoState) => s.bombs[0];
const holder = (s: HotPotatoState) => s.bombs[0]?.holderId ?? null;

/** Bomba v 1. kole u hráče `who` (malá skupina = jedna bomba). */
function bombAt(who = 'a', n = 5): HotPotatoState {
  let s = hotPotato.start(hotPotato.init(ctx(n), rng(), T0), T0, rng());
  s = hotPotato.tick(s, T0 + READY_MS, rng());
  return withHolder(s, who);
}

/** Přesune první bombu k hráči `who` (jen pro testy). */
const withHolder = (s: HotPotatoState, who: string): HotPotatoState => ({
  ...s,
  bombs: s.bombs.map((b, i) => (i === 0 ? { ...b, holderId: who } : b)),
});

function pass(s: HotPotatoState, from: string, to: string, now = T0 + READY_MS): HotPotatoState {
  const next = hotPotato.apply(s, from, { targetId: to }, now, rng());
  if (!next) throw new Error(`${from} → ${to} odmítnuto`);
  return next;
}

const explode = (s: HotPotatoState) => hotPotato.tick(s, bomb(s).explodeAt, rng());

describe('Horký brambor – pravidla', () => {
  it('nejdřív příprava, pak bomba u náhodného hráče s rozbuškou 10–25 s', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = hotPotato.start(hotPotato.init(ctx(), rng(seed), T0), T0, rng(seed));
      expect(s).toMatchObject({ stage: 'READY', endsAt: T0 + READY_MS, bombs: [] });
      s = hotPotato.tick(s, T0 + READY_MS, rng(seed));
      expect(s.stage).toBe('BOMB');
      expect(s.bombs).toHaveLength(1);
      expect(IDS).toContain(holder(s));
      expect(bomb(s).fuseMs).toBeGreaterThanOrEqual(10_000);
      expect(bomb(s).fuseMs).toBeLessThanOrEqual(25_000);
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
    expect(holder(s)).toBe('b');
    expect(hotPotato.apply(s, 'b', { targetId: 'a' }, T0, rng())).toBeNull();
    s = pass(s, 'b', 'c');
    expect(holder(pass(s, 'c', 'a'))).toBe('a');
  });

  it('výbuch vyřadí držitele, po 3 s pauze je nová kratší bomba u zbývajícího', () => {
    const before = bombAt('a');
    let s = explode(before);
    expect(s).toMatchObject({ stage: 'PAUSE', eliminated: ['a'], lastOut: ['a'], round: 1, bombs: [] });
    expect(s.remaining).not.toContain('a');
    const pauseEnd = s.endsAt!;
    expect(pauseEnd - bomb(before).explodeAt).toBe(PAUSE_MS);
    s = hotPotato.tick(s, pauseEnd, rng());
    expect(s.stage).toBe('BOMB');
    expect(s.lastOut).toEqual([]);
    expect(s.remaining).toContain(holder(s));
    const [lo, hi] = fuseRange(1);
    expect(bomb(s).fuseMs).toBeGreaterThanOrEqual(lo);
    expect(bomb(s).fuseMs).toBeLessThanOrEqual(hi);
    // vyřazenému bombu poslat nejde
    expect(hotPotato.apply(s, holder(s)!, { targetId: 'a' }, pauseEnd, rng())).toBeNull();
  });

  it('ve dvou platí ping-pong; poslední přeživší vyhraje štít, poklad beze změny', () => {
    let s = explode(bombAt('a', 3));
    s = withHolder(hotPotato.tick(s, s.endsAt!, rng()), 'b');
    s = pass(s, 'b', 'c', bomb(s).explodeAt - 100);
    s = pass(s, 'c', 'b', bomb(s).explodeAt - 50);
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
    s = pass(s, 'b', 'c', bomb(s).explodeAt - 1_000); // poslední chvíle
    s = explode(s); // c vypadne, držel 1 s
    s = withHolder(hotPotato.tick(s, s.endsAt!, rng()), 'a');
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
    expect(holder(s)).toBe('a');
    s = hotPotato.tick(s, t + DISCONNECT_JUMP_MS - 1, rng(), online);
    expect(holder(s)).toBe('a');
    const explodeAt = bomb(s).explodeAt;
    s = hotPotato.tick(s, t + DISCONNECT_JUMP_MS, rng(), online);
    expect(['b', 'c']).toContain(holder(s));
    expect(bomb(s).explodeAt).toBe(explodeAt);
  });

  it('držitel, který se včas vrátí, bombu neztratí', () => {
    let s = bombAt('a');
    const t = T0 + READY_MS;
    s = hotPotato.tick(s, t, rng(), new Set(['b']));
    s = hotPotato.tick(s, t + 1_000, rng(), new Set(['a', 'b']));
    s = hotPotato.tick(s, t + 5_000, rng(), new Set(['b']));
    expect(holder(s)).toBe('a');
  });
});

describe('Horký brambor – dvě bomby ve velké skupině (Rozšíření 17)', () => {
  const bigStart = (seed = 3) => {
    const s = hotPotato.start(hotPotato.init(ctx(BIG.length, BIG), rng(seed), T0), T0, rng(seed));
    return hotPotato.tick(s, T0 + READY_MS, rng(seed));
  };

  it('dvě bomby jen od 11 hráčů a dokud zbývá víc než 4', () => {
    const n = (players: number, remaining: number) =>
      bombCount({ players: BIG.slice(0, players), remaining: BIG.slice(0, remaining) });
    expect(n(10, 10)).toBe(1);
    expect(n(11, 11)).toBe(2);
    expect(n(18, 5)).toBe(2);
    expect(n(18, 4)).toBe(1);
  });

  it('dvě bomby u dvou různých hráčů, každá s vlastní rozbuškou', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = bigStart(seed);
      expect(s.bombs).toHaveLength(2);
      expect(new Set(holdersOf(s)).size).toBe(2);
    }
  });

  it('držiteli druhé bomby nejde poslat, zákaz vrácení platí pro každou bombu zvlášť', () => {
    let s = bigStart();
    const [x, y] = holdersOf(s);
    expect(hotPotato.apply(s, x, { targetId: y }, T0 + READY_MS, rng())).toBeNull();
    const target = BIG.find((id) => id !== x && id !== y)!;
    s = pass(s, x, target);
    expect(holdersOf(s)).toEqual([target, y]);
    expect(hotPotato.apply(s, target, { targetId: x }, T0 + READY_MS, rng())).toBeNull();
    // Druhá bomba odesílatele první nezná, té ho poslat jde.
    expect(hotPotato.apply(s, y, { targetId: x }, T0 + READY_MS, rng())).not.toBeNull();
    const v = hotPotato.viewForPlayer(s, y) as HotPotatoPlayerView;
    expect(v.canPassTo).not.toContain(target);
    expect(v.canPassTo).not.toContain(y);
  });

  it('každá bomba bouchne zvlášť, kolo končí po obou výbuších', () => {
    let s = bigStart();
    const [first, second] = [...s.bombs].sort((a, b) => a.explodeAt - b.explodeAt);
    s = hotPotato.tick(s, first.explodeAt, rng());
    if (first.explodeAt < second.explodeAt) {
      expect(s).toMatchObject({ stage: 'BOMB', eliminated: [first.holderId], lastOut: [first.holderId], round: 0 });
      expect(holdersOf(s)).toEqual([second.holderId]);
      s = hotPotato.tick(s, second.explodeAt, rng());
    }
    expect(s).toMatchObject({ stage: 'PAUSE', eliminated: [first.holderId, second.holderId], round: 1, bombs: [] });
    expect(s.lastOut).toEqual([first.holderId, second.holderId]);
  });

  it('ručička Zrádce ukazuje bombu, která bouchne dřív', () => {
    let s = bigStart();
    const soonest = [...s.bombs].sort((a, b) => a.explodeAt - b.explodeAt)[0];
    const now = T0 + READY_MS + 1_000;
    s = hotPotato.tick(s, now, rng());
    expect(s.pressure.h0).toBe(realPressure(soonest.explodeAt - now, soonest.fuseMs));
  });

  it('celá minihra s 12 hráči skončí jedním přeživším, při 4 zbývajících už jen jedna bomba', () => {
    let s = hotPotato.start(hotPotato.init(ctx(BIG.length, BIG), rng(), T0), T0, rng());
    let rounds = 0;
    for (let t = 0; s.stage !== 'DONE' && t < 900_000; t += 200) {
      const prev = s.stage;
      s = hotPotato.tick(s, T0 + t, rng(t));
      if (prev !== 'BOMB' && s.stage === 'BOMB') {
        rounds++;
        expect(s.bombs).toHaveLength(s.remaining.length > 4 ? 2 : 1);
      }
    }
    expect(s.stage).toBe('DONE');
    expect(s.remaining).toHaveLength(1);
    expect(s.eliminated).toHaveLength(11);
    // 12 → 10 → 8 → 6 → 4 po dvou, pak 4 → 3 → 2 → 1 po jedné.
    expect(rounds).toBe(7);
  });

  it('odpojený držitel: bomba přeskočí jen k hráči bez bomby', () => {
    let s = bigStart();
    const [x, y] = holdersOf(s);
    const online = new Set([y, 'h11']);
    const t = T0 + READY_MS + 1_000;
    s = hotPotato.tick(s, t, rng(), online);
    s = hotPotato.tick(s, t + DISCONNECT_JUMP_MS, rng(), online);
    if (x !== 'h11' && y !== 'h11') expect(holdersOf(s)).toEqual(['h11', y]);
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
    const { explodeAt, fuseMs } = bomb(s);
    for (let t = 0; t < fuseMs; t += 200) {
      const now = T0 + READY_MS + t;
      s = hotPotato.tick(s, now, rng(t));
      expect(s.pressure.a).toBe(realPressure(explodeAt - now, fuseMs));
      const loyal = s.pressure.c;
      expect(loyal).toBeGreaterThanOrEqual(0);
      expect(loyal).toBeLessThanOrEqual(1);
      seen.add(loyal);
      if (loyal >= RED_ZONE_FROM && explodeAt - now > 5_000) reds++;
    }
    expect(seen.size).toBeGreaterThan(10);
    expect(reds).toBeGreaterThan(0);
  });

  it('Věrný a Zrádce mají v každém okamžiku stejný tvar pohledu, čas výbuchu v něm není', () => {
    for (const [ids, n] of [[IDS, 5], [BIG, 12]] as const) {
      let s = hotPotato.start(hotPotato.init(ctx(n, [...ids]), rng(), T0), T0, rng());
      const keys = (v: unknown) => JSON.stringify(Object.keys(v as object).sort());
      const check = () => {
        for (const id of ids) {
          const v = hotPotato.viewForPlayer(s, id);
          expect(keys(v)).toBe(keys(hotPotato.viewForPlayer(s, ids[0])));
          const json = JSON.stringify(v);
          for (const b of s.bombs) expect(json).not.toContain(String(b.explodeAt));
          expect(json).not.toMatch(/explode|fuse|traitor/i);
        }
        if (s.stage === 'BOMB') expect(hotPotato.endsAt(s)).toBeNull();
      };
      for (let t = 0; s.stage !== 'DONE' && t < 900_000; t += 200) {
        s = hotPotato.tick(s, T0 + t, rng(t));
        check();
      }
      expect(s.stage).toBe('DONE');
    }
  });

  it('jen držitel vidí, komu bombu poslat', () => {
    const s = hotPotato.tick(bombAt('b'), T0 + READY_MS, rng());
    const v = (id: string) => hotPotato.viewForPlayer(s, id) as HotPotatoPlayerView;
    expect(v('b')).toMatchObject({ amHolder: true, holderIds: ['b'] });
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
    const started = hotPotato.tick(s, T0 + READY_MS, rng());
    expect(hotPotato.applyGhost!(started, 'g1', { survivorId: 'c' }, T0)).toBeNull();
    expect(hotPotato.viewForGhost!(started, 'g1')).not.toHaveProperty('pressure');
  });

  it('poslední přeživší 3 body, první vyřazený 1 bod', () => {
    let s = hotPotato.start(hotPotato.init(ctx(3), rng(), T0), T0, rng());
    s = hotPotato.applyGhost!(s, 'g1', { survivorId: 'c', firstId: 'a' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g2', { survivorId: 'c', firstId: 'b' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g3', { firstId: 'a' }, T0)!;
    s = hotPotato.applyGhost!(s, 'g4', { survivorId: 'b' }, T0)!;
    s = withHolder(hotPotato.tick(s, T0 + READY_MS, rng()), 'a');
    s = explode(s);
    s = withHolder(hotPotato.tick(s, s.endsAt!, rng()), 'b');
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

  for (const n of [5, 14]) {
    it(`celá minihra přes engine (${n} hráčů): přeživší vyhraje štít a +2, telefon nedostane čas výbuchu`, () => {
      let s = must(startedWith(n, ['p1']), MOD, { type: 'drawMinigame' });
      s = at(s, MOD, { type: 'confirmMinigame' });
      s = at(s, MOD, { type: 'startMinigame' });
      s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endStage' } });
      const ids = s.players.map((p) => p.id);
      let now = T0;
      for (let i = 0; i < 4000 && s.minigame!.step === 'PLAY'; i++) {
        now += 200;
        const st = s.minigame!.state as HotPotatoState;
        if (st.stage === 'BOMB' && i % 7 === 0) {
          for (const h of holdersOf(st)) {
            const v = viewForPlayer(s, h)!.minigame!.game as HotPotatoPlayerView;
            if (v.canPassTo.length > 0) s = at(s, as(h), { type: 'minigameInput', payload: { targetId: v.canPassTo[0] } }, now);
          }
        }
        s = at(s, { kind: 'system' }, { type: 'tick', now, connected: ids }, now);
        const cur = s.minigame!.state as HotPotatoState | undefined;
        for (const id of ids) {
          const json = JSON.stringify(viewForPlayer(s, id));
          for (const b of cur?.bombs ?? []) expect(json).not.toContain(String(b.explodeAt));
        }
      }
      expect(s.minigame!.step).toBe('RESULT');
      const winner = s.minigame!.result!.shieldWinnerId!;
      expect(ids).toContain(winner);
      expect(pointsOf(s, winner, false)).toBe(2);
      expect(s.pot).toBe(1000);
    });
  }
});
