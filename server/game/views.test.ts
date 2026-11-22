import { describe, expect, it } from 'vitest';
import { seededRng } from './random.js';
import type { GameState } from './state.js';
import { as, MOD, must, playRandomGame, startedWith } from './testing.js';
import { viewForModerator, viewForPlayer } from './views.js';

/** Všechny stavy z náhodných her se 4–18 hráči. */
function allStates(seeds: number): GameState[] {
  const states: GameState[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    playRandomGame(4 + (seed % 15), seededRng(seed), (s) => states.push(s));
  }
  return states;
}

const STATES = allStates(40);

/** Prohodí role dvou hráčů včetně jejich noční volby / tipu, aby stav zůstal konzistentní. */
function swapRoles(state: GameState, aId: string, bId: string): GameState {
  const s = structuredClone(state);
  const a = s.players.find((p) => p.id === aId)!;
  const b = s.players.find((p) => p.id === bId)!;
  [a.role, b.role] = [b.role, a.role];
  for (const p of [a, b]) {
    const entry = s.nightPicks[p.id] ?? s.nightTips[p.id];
    delete s.nightPicks[p.id];
    delete s.nightTips[p.id];
    if (entry !== undefined) (p.role === 'TRAITOR' ? s.nightPicks : s.nightTips)[p.id] = entry;
  }
  return s;
}

describe('utajení rolí', () => {
  it('pohled Věrného se nezmění, když se prohodí role kohokoli, kdo ještě nebyl odhalen', () => {
    // Nejsilnější kontrola: kdyby pohled Věrného jakkoli závisel na cizí skryté roli,
    // prohození Zrádce a Věrného by ho změnilo.
    let compared = 0;
    for (const state of STATES) {
      if (state.phase === 'LOBBY' || state.phase === 'ENDED') continue;
      const hidden = state.players.filter((p) => p.status === 'ALIVE');

      for (const viewer of state.players.filter((p) => p.role === 'LOYAL')) {
        const original = viewForPlayer(state, viewer.id);
        const others = hidden.filter((p) => p.id !== viewer.id);
        for (const t of others.filter((p) => p.role === 'TRAITOR')) {
          for (const l of others.filter((p) => p.role === 'LOYAL')) {
            expect(viewForPlayer(swapRoles(state, t.id, l.id), viewer.id)).toEqual(original);
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(1000);
    // Tisíce srovnání; na vytíženém notebooku to trvá i desítky sekund.
  }, 120_000);

  it('žádný pohled neobsahuje token jiného hráče', () => {
    for (const state of STATES) {
      const connected = new Set(state.players.map((p) => p.id));
      const views = [
        ...state.players.map((p) => ({ owner: p.id, json: JSON.stringify(viewForPlayer(state, p.id)) })),
        { owner: null, json: JSON.stringify(viewForModerator(state, connected)) },
      ];
      for (const { json } of views) {
        for (const p of state.players) expect(json).not.toContain(`"${p.token}"`);
      }
    }
  });

  it('cizí role jsou vidět jen u vyhnaných a na konci hry; role oběti noci až na konci', () => {
    for (const state of STATES) {
      for (const viewer of state.players) {
        const view = viewForPlayer(state, viewer.id)!;
        for (const p of view.players) {
          const real = state.players.find((x) => x.id === p.id)!;
          if (state.phase === 'ENDED') expect(p.revealedRole).toBe(real.role);
          else if (real.status === 'BANISHED') expect(p.revealedRole).toBe(real.role);
          else expect(p.revealedRole).toBeUndefined();
        }
      }
    }
  });

  it('Zrádce zná spoluzrádce, Věrný nezná nikoho', () => {
    const state = startedWith(8, ['p1', 'p2']);
    expect(viewForPlayer(state, 'p1')!.allies).toEqual([{ id: 'p2', name: 'Hráč 2' }]);
    expect(viewForPlayer(state, 'p1')!.me.role).toBe('TRAITOR');
    expect(viewForPlayer(state, 'p3')!.allies).toEqual([]);
    expect(viewForPlayer(state, 'p3')!.me.role).toBe('LOYAL');
  });

  it('hráč vidí jen svůj vlastní hlas', () => {
    let state = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
    state = must(state, as('p4'), { type: 'vote', targetId: 'p5' });
    expect(viewForPlayer(state, 'p2')!.myVote).toBe('p3');
    expect(viewForPlayer(state, 'p3')!.myVote).toBeNull();
    // Cizí hlas nesmí pohled ovlivnit.
    const other = must(state, as('p4'), { type: 'vote', targetId: 'p6' });
    expect(viewForPlayer(other, 'p2')).toEqual(viewForPlayer(state, 'p2'));
  });
});

describe('noc vypadá pro obě role stejně', () => {
  const night = () => {
    let state = must(startedWith(8, ['p1', 'p2']), MOD, { type: 'startVote' });
    state = must(state, MOD, { type: 'closeVote' });
    return must(state, MOD, { type: 'startNight' });
  };

  it('Věrný i Zrádce mají noční část se stejnými poli a stejnou mřížku', () => {
    const state = night();
    const traitor = viewForPlayer(state, 'p1')!;
    const loyal = viewForPlayer(state, 'p3')!;
    expect(Object.keys(traitor.night!).sort()).toEqual(Object.keys(loyal.night!).sort());
    const grid = (v: typeof traitor) => v.players.filter((p) => p.status === 'ALIVE' && p.id !== v.me.id).length;
    expect(grid(traitor)).toBe(grid(loyal));
  });

  it('Zrádce vidí volbu spojence a spojence nemůže vybrat; Věrný vidí svůj tip', () => {
    let state = night();
    state = must(state, as('p2'), { type: 'nightPick', targetId: 'p5' });
    state = must(state, as('p3'), { type: 'nightPick', targetId: 'p1' });

    expect(viewForPlayer(state, 'p1')!.night).toEqual({
      myPick: null,
      blocked: ['p2'],
      hint: { kind: 'ALLY', picks: [{ allyId: 'p2', targetId: 'p5' }] },
    });
    expect(viewForPlayer(state, 'p3')!.night).toEqual({
      myPick: 'p1',
      blocked: [],
      hint: { kind: 'OWN', targetId: 'p1' },
    });
  });

  it('osamocený Zrádce vidí pod mřížkou svou vlastní volbu jako Věrný', () => {
    let state = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p4' });
    expect(viewForPlayer(state, 'p1')!.night).toEqual({
      myPick: 'p4',
      blocked: [],
      hint: { kind: 'OWN', targetId: 'p4' },
    });
  });
});

describe('pohled moderátora', () => {
  it('vidí role, připojení a kdo už hlasoval', () => {
    let state = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
    const view = viewForModerator(state, new Set(['p1', 'p2']));
    expect(view.players.find((p) => p.id === 'p1')).toMatchObject({ role: 'TRAITOR', connected: true });
    expect(view.players.find((p) => p.id === 'p2')).toMatchObject({ done: true, connected: true });
    expect(view.players.find((p) => p.id === 'p3')).toMatchObject({ done: false, connected: false });
  });

  it('v noci vidí jen, zda Zrádci vybrali, ne koho', () => {
    let state = must(startedWith(8, ['p1', 'p2']), MOD, { type: 'startVote' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    const all = new Set(state.players.map((p) => p.id));

    expect(viewForModerator(state, all).traitorsDone).toBe(false);
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p3' });
    expect(viewForModerator(state, all).traitorsDone).toBe(false);
    const a = must(state, as('p2'), { type: 'nightPick', targetId: 'p3' });
    const b = must(state, as('p2'), { type: 'nightPick', targetId: 'p4' });

    expect(viewForModerator(a, all).traitorsDone).toBe(true);
    // Jiná volba oběti nesmí pohled moderátora nijak změnit.
    expect(viewForModerator(a, all)).toEqual(viewForModerator(b, all));
    expect(viewForModerator(a, all).players.every((p) => p.done === undefined)).toBe(true);
  });
});
