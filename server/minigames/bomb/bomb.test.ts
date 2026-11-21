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
  bomb,
  BOMB_ID,
  FUSE_MS,
  ghostPoints,
  READY_MS,
  REASSIGN_AFTER_MS,
  type BombGhostView,
  type BombPlayerView,
  type BombState,
} from './index.js';
import {
  dealPages,
  generateBomb,
  makeFake,
  MANUAL,
  matchingColumns,
  PAGE_IDS,
  pageForColumn,
  pageForWires,
  renderPage,
  ruleText,
  solveBomb,
  solveWires,
  symbolOrder,
  type PageId,
} from './manual.js';

const T0 = 1_000_000;
const rng = (seed = 3) => seededRng(seed);
/** a = Zrádce, b–e Věrní. */
const IDS = ['a', 'b', 'c', 'd', 'e'];

const ctx = (ghosts: string[] = [], ids = IDS): MinigameContext => ({
  players: ids.map((id) => ({ id, role: id === 'a' ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts,
  pot: 1000,
  round: 1,
  memory: undefined,
});

const started = (seed = 3, ghosts: string[] = []) => bomb.start(bomb.init(ctx(ghosts), rng(seed), T0), T0, rng(seed));
const armed = (seed = 3, ghosts: string[] = []) => bomb.tick(started(seed, ghosts), T0 + READY_MS, rng());

/** Semínko, pro které platí podmínka na počáteční stav. */
function seedWhere(pred: (s: BombState) => boolean): number {
  for (let seed = 1; seed < 2000; seed++) if (pred(started(seed))) return seed;
  throw new Error('žádné semínko');
}

function act(s: BombState, payload: unknown, now = T0 + READY_MS + 1000, id = s.pyroId): BombState {
  const next = bomb.apply(s, id, payload, now, rng());
  if (!next) throw new Error(`akce odmítnuta: ${JSON.stringify(payload)}`);
  return next;
}

const wrongWire = (s: BombState) => (s.solution.wire + 1) % s.bomb.wires.length;
const solveAll = (s: BombState) => {
  s = act(s, { cut: s.solution.wire });
  for (const sym of s.solution.order) s = act(s, { press: sym });
  return s;
};

describe('Zneškodni bombu – manuál a generátor', () => {
  it('každá bomba je manuálem jednoznačně řešitelná', () => {
    const r = rng(11);
    for (let i = 0; i < 1000; i++) {
      const b = generateBomb(r);
      expect(b.wires.length).toBeGreaterThanOrEqual(3);
      expect(b.wires.length).toBeLessThanOrEqual(6);
      const sol = solveBomb(b);
      expect(sol.wire).toBeGreaterThanOrEqual(0);
      expect(sol.wire).toBeLessThan(b.wires.length);
      expect(matchingColumns(MANUAL.symbols, b.symbols)).toEqual([b.column]);
      expect(sol.order).toHaveLength(4);
      expect([...sol.order].sort()).toEqual([...b.symbols].sort());
    }
  });

  it('falešné pravidlo na rozhodující stránce vždy změní řešení této bomby', () => {
    const r = rng(12);
    for (let i = 0; i < 500; i++) {
      const b = generateBomb(r);
      const sol = solveBomb(b);
      const wf = makeFake(pageForWires(b.wires.length), b, r);
      if (wf.kind !== 'wires') throw new Error('čekal jsem dráty');
      const rules = MANUAL.wires[wf.count].map((x, k) => (k === wf.rule ? wf.replacement : x));
      const fakeWire = solveWires(rules, b.wires);
      expect(fakeWire).not.toBe(sol.wire);
      expect(fakeWire).toBeGreaterThanOrEqual(0);

      const sf = makeFake(pageForColumn(b.column), b, r);
      if (sf.kind !== 'symbols') throw new Error('čekal jsem symboly');
      expect(symbolOrder(sf.replacement, b.symbols)).not.toEqual(sol.order);
      expect([...sf.replacement].sort()).toEqual([...MANUAL.symbols[b.column]].sort());
    }
  });

  it('falešná stránka má stejné rozložení i počet pravidel jako pravá', () => {
    const r = rng(13);
    const b = generateBomb(r);
    for (const p of PAGE_IDS) {
      const real = renderPage(p);
      const fake = renderPage(p, makeFake(p, b, r));
      expect(fake.sections.map((x) => [x.heading, x.items.length])).toEqual(real.sections.map((x) => [x.heading, x.items.length]));
      expect(JSON.stringify(fake)).not.toBe(JSON.stringify(real));
    }
  });

  it('texty pravidel a stránek', () => {
    expect(ruleText(MANUAL.wires[3][0])).toBe('Pokud je první drát žlutý, přestřihni třetí drát.');
    expect(ruleText(MANUAL.wires[4][0])).toBe('Pokud je víc než jeden bílý drát, přestřihni poslední bílý drát.');
    expect(ruleText(MANUAL.wires[5][1])).toBe('Pokud jsou víc než dva modré dráty, přestřihni poslední modrý drát.');
    expect(ruleText(MANUAL.wires[3][3])).toBe('Jinak přestřihni první drát.');
    expect(renderPage('W56').sections.map((x) => x.heading)).toEqual(['5 drátů', '6 drátů']);
    expect(renderPage('S46').sections[0]).toEqual({ heading: 'Sloupec 4', items: MANUAL.symbols[3] });
  });

  it('rozdání stránek: každá aspoň jednou, každý 1–2, od 8 navigátorů každá aspoň dvakrát', () => {
    for (const n of [3, 4, 5, 6, 8, 9]) {
      const navs = Array.from({ length: n }, (_, i) => `p${i}`);
      const pages = dealPages(navs, rng(n));
      const counts = new Map<PageId, number>();
      for (const id of navs) {
        expect(pages[id].length).toBeGreaterThanOrEqual(1);
        expect(pages[id].length).toBeLessThanOrEqual(2);
        for (const p of pages[id]) counts.set(p, (counts.get(p) ?? 0) + 1);
      }
      expect([...counts.keys()].sort()).toEqual([...PAGE_IDS].sort());
      if (n >= 8) expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Zneškodni bombu – pravidla', () => {
  it('příprava 20 s, pak odpočet 3:00; moderátor může spustit dřív', () => {
    let s = started();
    expect(s.stage).toBe('READY');
    expect(s.pages[s.pyroId]).toEqual([]);
    expect(bomb.apply(s, s.pyroId, { cut: 0 }, T0, rng())).toBeNull();
    expect(bomb.tick(s, T0 + READY_MS - 1, rng()).stage).toBe('READY');
    s = bomb.tick(s, T0 + READY_MS, rng());
    expect(s).toMatchObject({ stage: 'ARMED', endsAt: T0 + READY_MS + FUSE_MS });
    const early = bomb.applyModerator!(started(), { action: 'start' }, T0 + 5000, rng())!;
    expect(early).toMatchObject({ stage: 'ARMED', endsAt: T0 + 5000 + FUSE_MS });
  });

  it('akce smí jen pyrotechnik; správné dráty i symboly bombu zneškodní', () => {
    let s = armed();
    const other = s.players.find((id) => id !== s.pyroId)!;
    expect(bomb.apply(s, other, { cut: s.solution.wire }, T0 + READY_MS, rng())).toBeNull();
    s = solveAll(s);
    expect(s).toMatchObject({ stage: 'DONE', end: 'DEFUSED', wiresSolved: true, symbolsSolved: true });
    const r = bomb.result(s);
    expect(r.shieldWinnerId).toBe(s.pyroId);
    expect(r.potDelta).toBe(400);
  });

  it('špatný drát = chyba: zrychlí odpočet, drát zůstane přestřižený, správný se nemění', () => {
    let s = armed();
    const now = T0 + READY_MS + 60_000;
    const left = s.endsAt! - now;
    s = act(s, { cut: wrongWire(s) }, now);
    expect(s.errors).toHaveLength(1);
    expect(s.endsAt).toBe(now + Math.round(left * 0.9));
    expect(s.cut).toEqual([wrongWire(s)]);
    expect(bomb.apply(s, s.pyroId, { cut: wrongWire(s) }, now, rng())).toBeNull();
    s = act(s, { cut: s.solution.wire }, now);
    expect(s.wiresSolved).toBe(true);
  });

  it('špatný symbol = chyba, už zmáčknuté platí dál', () => {
    let s = armed();
    const [first, second] = s.solution.order;
    s = act(s, { press: first });
    s = act(s, { press: s.solution.order[3] });
    expect(s.errors[0]).toMatchObject({ module: 'SYMBOLS', did: s.solution.order[3], expected: second, step: 1 });
    expect(s.pressed).toEqual([first]);
    s = act(s, { press: second });
    expect(s.pressed).toEqual([first, second]);
  });

  it('se 2 chybami zneškodněno: poklad +200; třetí chyba = výbuch', () => {
    let s = armed();
    s = act(s, { cut: wrongWire(s) });
    s = act(s, { press: s.solution.order[1] });
    s = solveAll({ ...s });
    expect(bomb.result(s)).toMatchObject({ potDelta: 200, shieldWinnerId: s.pyroId });

    let boom = armed();
    for (let i = 0; i < 3; i++) boom = act(boom, { press: boom.solution.order[3] === boom.pressed[0] ? boom.solution.order[2] : boom.solution.order[3] });
    expect(boom).toMatchObject({ stage: 'DONE', end: 'EXPLODED' });
    expect(bomb.result(boom)).toMatchObject({ shieldWinnerId: null, potDelta: 0 });
  });

  it('vypršení času i ukončení moderátorem = výbuch', () => {
    const s = armed();
    expect(bomb.tick(s, s.endsAt!, rng()).end).toBe('TIME');
    const m = bomb.applyModerator!(s, { action: 'end' }, T0, rng())!;
    expect(m.end).toBe('MODERATOR');
    expect(bomb.result(m).shieldWinnerId).toBeNull();
  });

  it('odpojený pyrotechnik: odpočet stojí, po 20 s jde přidělit nového, ten si stránky ponechá', () => {
    let s = armed();
    const t = T0 + READY_MS + 30_000;
    const left = s.endsAt! - t;
    const online = new Set(s.players.filter((id) => id !== s.pyroId));
    s = bomb.tick(s, t, rng(), online);
    expect(s).toMatchObject({ endsAt: null, pausedLeft: left });
    expect((bomb.viewForPlayer(s, s.pyroId) as BombPlayerView).paused).toBe(true);
    expect(bomb.apply(s, s.pyroId, { cut: s.solution.wire }, t, rng())).toBeNull();
    expect(bomb.applyModerator!(s, { action: 'reassign' }, t + 1000, rng())).toBeNull();

    // Návrat před 20 s: odpočet běží dál se stejným zbývajícím časem.
    const back = bomb.tick(s, t + 5000, rng(), new Set(s.players));
    expect(back).toMatchObject({ endsAt: t + 5000 + left, pausedLeft: null });

    s = bomb.tick(s, t + REASSIGN_AFTER_MS, rng(), online);
    expect(s.reassignable).toBe(true);
    const old = s.pyroId;
    const oldPagesOfNew = (id: string) => s.pages[id];
    const next = bomb.applyModerator!(s, { action: 'reassign' }, t + 25_000, rng(7))!;
    expect(next.pyroId).not.toBe(old);
    expect(next.endsAt).toBe(t + 25_000 + left);
    const v = bomb.viewForPlayer(next, next.pyroId) as BombPlayerView;
    expect(v.isPyro).toBe(true);
    expect(v.device).not.toBeNull();
    expect(v.pages.map((p) => p.id)).toEqual(oldPagesOfNew(next.pyroId));
    expect((bomb.viewForPlayer(next, old) as BombPlayerView).device).toBeNull();
  });
});

describe('Zneškodni bombu – utajení', () => {
  it('stejný tvar pohledu pro všechny; bombu vidí jen pyrotechnik; řešení nikdo', () => {
    let s = started();
    const keys = (v: unknown) => Object.keys(v as object).sort().join(',');
    const check = () => {
      for (const id of IDS) {
        const v = bomb.viewForPlayer(s, id) as BombPlayerView;
        expect(keys(v)).toBe(keys(bomb.viewForPlayer(s, 'a')));
        if (id !== s.pyroId) expect(v.device).toBeNull();
        const json = JSON.stringify(v);
        for (const bad of ['solution', 'fakes', 'column', 'traitors', '"order"']) expect(json).not.toContain(bad);
        expect(v.pages.map((p) => p.id)).toEqual(s.pages[id]);
      }
    };
    check();
    s = bomb.tick(s, T0 + READY_MS, rng());
    check();
    expect((bomb.viewForPlayer(s, s.pyroId) as BombPlayerView).device!.wires).toEqual(s.bomb.wires);
    s = act(s, { cut: wrongWire(s) });
    check();
    s = solveAll(s);
    check();
  });

  it('Zrádce má falešnou stránku, pravé znění na tajné kartě; karty mají stejný počet řádků', () => {
    const seed = seedWhere((s) => s.pyroId !== 'a' && !!s.fakes.a);
    const s = started(seed);
    const { page, fake } = s.fakes.a;
    const shown = (bomb.viewForPlayer(s, 'a') as BombPlayerView).pages.find((p) => p.id === page)!;
    expect(JSON.stringify(shown)).not.toBe(JSON.stringify(renderPage(page)));
    expect(shown).toEqual(renderPage(page, fake));
    const card = bomb.secretCard(s, 'a');
    expect(card[0]).toContain(page === 'W34' || page === 'W56' ? 'falešné pravidlo' : 'falešný sloupec');
    for (const id of IDS) expect(bomb.secretCard(s, id)).toHaveLength(2);
    expect(bomb.secretCard(s, s.pyroId)[0]).toBe('Jsi pyrotechnik. Jen ty vidíš bombu.');
    // Věrní mají pravé stránky.
    for (const id of IDS.filter((x) => x !== 'a')) {
      for (const p of (bomb.viewForPlayer(s, id) as BombPlayerView).pages) expect(p).toEqual(renderPage(p.id));
    }
  });

  it('falešná stránka přednostně ta, která o bombě rozhoduje', () => {
    let relevant = 0;
    let possible = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = started(seed);
      if (!s.fakes.a) continue;
      const rel = [pageForWires(s.bomb.wires.length), pageForColumn(s.bomb.column)];
      if (s.pages.a.some((p) => rel.includes(p))) {
        possible++;
        if (rel.includes(s.fakes.a.page)) relevant++;
      }
    }
    expect(possible).toBeGreaterThan(20);
    expect(relevant).toBe(possible);
  });

  it('duch nevidí bombu ani stránky', () => {
    const s = armed(3, ['g']);
    const g = bomb.viewForGhost!(s, 'g') as BombGhostView;
    expect(g).not.toHaveProperty('device');
    expect(g).not.toHaveProperty('pages');
    expect(JSON.stringify(g)).not.toContain(s.bomb.symbols[0]);
  });

  it('stopa: chyby s vysvětlením falešnou stránkou, bez jména; kdo měl kterou stránku', () => {
    const seed = seedWhere((s) => s.pyroId !== 'a' && s.fakes.a?.fake.kind === 'wires' && s.fakes.a.page === pageForWires(s.bomb.wires.length));
    let s = bomb.tick(started(seed), T0 + READY_MS, rng());
    const f = s.fakes.a.fake;
    if (f.kind !== 'wires') throw new Error('dráty');
    const fakeWire = solveWires(
      MANUAL.wires[f.count].map((x, k) => (k === f.rule ? f.replacement : x)),
      s.bomb.wires,
    );
    s = act(s, { cut: fakeWire });
    s = solveAll(s);
    const r = bomb.result(s);
    const errorRow = r.clues[0].rows[0];
    expect(errorRow.label).toBe('Chyba 1');
    expect(errorRow.value).toContain(`přestřižen ${fakeWire + 1}. drát (správně ${s.solution.wire + 1}.)`);
    expect(errorRow.value).toContain(`vysvětlila by ji falešná verze stránky ${s.fakes.a.page === 'W34' ? 'Dráty 3–4' : 'Dráty 5–6'}`);
    expect(errorRow.playerId).toBeUndefined();
    const holders = r.clues[1].rows.filter((x) => x.playerId === 'a').map((x) => x.value);
    expect(holders.length).toBe(s.pages.a.length);
  });
});

describe('Zneškodni bombu – duchové', () => {
  it('tipují jen v přípravě; body přesně 3, o jedno vedle 1, výbuch = 3 chyby', () => {
    let s = started(3, ['g1', 'g2', 'g3']);
    s = bomb.applyGhost!(s, 'g1', { tip: 1 }, T0)!;
    s = bomb.applyGhost!(s, 'g2', { tip: 3 }, T0)!;
    s = bomb.applyGhost!(s, 'g3', { tip: 0 }, T0)!;
    expect(bomb.applyGhost!(s, 'g1', { tip: 4 }, T0)).toBeNull();
    s = bomb.tick(s, T0 + READY_MS, rng());
    expect(bomb.applyGhost!(s, 'g1', { tip: 2 }, T0)).toBeNull();
    expect((bomb.viewForGhost!(s, 'g1') as BombGhostView).canTip).toBe(false);
    s = act(s, { cut: wrongWire(s) });
    s = solveAll(s);
    expect(bomb.result(s).ghostScores).toEqual({ g1: 3, g2: 0, g3: 1 });
    expect(ghostPoints(2, 3)).toBe(1);
  });
});

describe('Zneškodni bombu ve hře', () => {
  beforeEach(() => registerMinigame(bomb));
  afterEach(() => unregisterMinigame(BOMB_ID));

  const at = (state: GameState, actor: Actor, action: Action, now: number) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celá bomba přes engine: pyrotechnik zneškodní s 1 chybou, dostane štít a +2, poklad +300', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' }, T0);
    s = at(s, MOD, { type: 'startMinigame' }, T0);
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'start' } }, T0 + 1000);
    const st = s.minigame!.state as BombState;
    const pyro = st.pyroId;
    for (const p of s.players) {
      const v = viewForPlayer(s, p.id)!.minigame!.game as BombPlayerView;
      expect(v.device === null).toBe(p.id !== pyro);
    }
    const now = T0 + 2000;
    s = at(s, as(pyro), { type: 'minigameInput', payload: { cut: (st.solution.wire + 1) % st.bomb.wires.length } }, now);
    s = at(s, as(pyro), { type: 'minigameInput', payload: { cut: st.solution.wire } }, now);
    for (const sym of st.solution.order) s = at(s, as(pyro), { type: 'minigameInput', payload: { press: sym } }, now);
    s = at(s, { kind: 'system' }, { type: 'tick', now: now + 300, connected: s.players.map((p) => p.id) }, now + 300);
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe(pyro);
    expect(pointsOf(s, pyro, false)).toBe(2);
    expect(s.pot).toBe(1300);
  });
});
