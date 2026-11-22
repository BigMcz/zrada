import { describe, expect, it } from 'vitest';
import { apply } from './engine.js';
import { seededRng } from './random.js';
import { createGame } from './state.js';
import { CRESTS } from '../../shared/crests.js';
import { as, GUEST, lobby, MOD, must, rejected, startedWith } from './testing.js';

const status = (state: ReturnType<typeof createGame>, id: string) =>
  state.players.find((p) => p.id === id)!.status;

describe('připojení do lobby', () => {
  it('přidá hráče a upraví mezery ve jméně', () => {
    const state = must(createGame(), GUEST, { type: 'join', name: '  Petra   Nová ', playerId: 'p1', token: 't1' });
    expect(state.players).toEqual([
      { id: 'p1', token: 't1', name: 'Petra Nová', status: 'ALIVE', sawRole: false, crest: expect.any(String) },
    ]);
  });

  it('každý hráč dostane při vstupu jiný znak (Rozšíření 16)', () => {
    const state = lobby(Array.from({ length: 10 }, (_, i) => 'Hráč ' + i));
    const crests = state.players.map((p) => p.crest);
    expect(new Set(crests).size).toBe(10);
    for (const c of crests) expect(CRESTS).toContain(c);
  });

  it('téma nastaví jen moderátor a jen v čekárně (Rozšíření 16)', () => {
    const state = lobby(['A', 'B', 'C', 'D']);
    expect(must(state, MOD, { type: 'setTheme', theme: 'SPACE' }).settings.theme).toBe('SPACE');
    expect(rejected(state, as('p1'), { type: 'setTheme', theme: 'SPACE' })).toBeTruthy();
    expect(rejected(state, MOD, { type: 'setTheme', theme: 'MARS' as never })).toMatch(/není/);
    const started = must(state, MOD, { type: 'startGame', traitorCount: 1 });
    expect(rejected(started, MOD, { type: 'setTheme', theme: 'OFFICE' })).toBeTruthy();
  });

  it('znak jde v lobby změnit jen na volný a platný', () => {
    const state = lobby(['Anna', 'Bára']);
    const taken = state.players[1].crest!;
    expect(rejected(state, as('p1'), { type: 'setCrest', crest: taken })).toMatch(/už má někdo/);
    expect(rejected(state, as('p1'), { type: 'setCrest', crest: 'DRAK' as never })).toMatch(/není/);
    const free = CRESTS.find((c) => !state.players.some((p) => p.crest === c))!;
    expect(must(state, as('p1'), { type: 'setCrest', crest: free }).players[0].crest).toBe(free);
    const started = must(lobby(['A', 'B', 'C', 'D']), MOD, { type: 'startGame', traitorCount: 1 });
    expect(rejected(started, as('p1'), { type: 'setCrest', crest: free })).toBeTruthy();
  });

  it('odmítne prázdné, dlouhé a duplicitní jméno', () => {
    const state = lobby(['Petra']);
    expect(rejected(state, GUEST, { type: 'join', name: '   ', playerId: 'x', token: 'x' })).toBe('Zadej jméno.');
    expect(rejected(state, GUEST, { type: 'join', name: 'a'.repeat(21), playerId: 'x', token: 'x' })).toMatch(/20 znaků/);
    expect(rejected(state, GUEST, { type: 'join', name: 'PETRA', playerId: 'x', token: 'x' })).toMatch(/už ve hře/);
  });

  it('pustí nejvýš 10 hráčů', () => {
    const state = lobby(Array.from({ length: 10 }, (_, i) => `H${i}`));
    expect(rejected(state, GUEST, { type: 'join', name: 'Jedenáctý', playerId: 'x', token: 'x' })).toMatch(/plná/);
  });

  it('po začátku hry se už nikdo nepřipojí', () => {
    const state = startedWith(4, ['p1']);
    rejected(state, GUEST, { type: 'join', name: 'Pozdě', playerId: 'x', token: 'x' });
  });

  it('moderátor může hráče z lobby odebrat, hráč ne', () => {
    const state = lobby(['A', 'B']);
    expect(must(state, MOD, { type: 'kick', playerId: 'p2' }).players.map((p) => p.id)).toEqual(['p1']);
    rejected(state, as('p1'), { type: 'kick', playerId: 'p2' });
  });
});

describe('rozdání rolí', () => {
  it('potřebuje aspoň 4 hráče', () => {
    expect(rejected(lobby(['A', 'B', 'C']), MOD, { type: 'startGame', traitorCount: 1 })).toMatch(/aspoň 4/);
  });

  it('Zrádců musí být aspoň jeden a méně než Věrných', () => {
    const four = lobby(['A', 'B', 'C', 'D']);
    rejected(four, MOD, { type: 'startGame', traitorCount: 0 });
    rejected(four, MOD, { type: 'startGame', traitorCount: 2 });
    must(four, MOD, { type: 'startGame', traitorCount: 1 });
  });

  it('rozdá přesně zvolený počet Zrádců a začne 1. kolo', () => {
    const names = Array.from({ length: 8 }, (_, i) => `H${i}`);
    const state = must(lobby(names), MOD, { type: 'startGame', traitorCount: 2 });
    expect(state.phase).toBe('ROLES');
    expect(state.round).toBe(1);
    expect(state.players.filter((p) => p.role === 'TRAITOR')).toHaveLength(2);
    expect(state.players.filter((p) => p.role === 'LOYAL')).toHaveLength(6);
  });

  it('Zrádcem se může stát kdokoli', () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const everTraitor = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const state = must(lobby(names), MOD, { type: 'startGame', traitorCount: 1 }, seededRng(seed));
      everTraitor.add(state.players.find((p) => p.role === 'TRAITOR')!.id);
    }
    expect(everTraitor.size).toBe(5);
  });

  it('hráč nemůže spustit hru', () => {
    rejected(lobby(['A', 'B', 'C', 'D']), as('p1'), { type: 'startGame', traitorCount: 1 });
  });

  it('hráč může potvrdit, že roli viděl, ale ne v lobby', () => {
    const state = must(startedWith(4, ['p1']), as('p2'), { type: 'ackRole' });
    expect(state.players.find((p) => p.id === 'p2')!.sawRole).toBe(true);
    rejected(lobby(['A']), as('p1'), { type: 'ackRole' });
  });
});

describe('kulatý stůl', () => {
  const voting = () => must(startedWith(6, ['p1']), MOD, { type: 'startVote' });

  it('nejde hlasovat pro sebe, pro vyřazeného ani mimo hlasování', () => {
    expect(rejected(voting(), as('p2'), { type: 'vote', targetId: 'p2' })).toBe('Tohoto hráče nelze vybrat.');
    rejected(voting(), as('p2'), { type: 'vote', targetId: 'neexistuje' });
    rejected(startedWith(6, ['p1']), as('p2'), { type: 'vote', targetId: 'p3' });
  });

  it('vyřazený hráč nehlasuje a nedá se pro něj hlasovat', () => {
    let state = voting();
    state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, MOD, { type: 'endNight' });
    state = must(state, MOD, { type: 'startVote' });
    expect(rejected(state, as('p3'), { type: 'vote', targetId: 'p4' })).toBe('Už nejsi ve hře.');
    rejected(state, as('p4'), { type: 'vote', targetId: 'p3' });
  });

  it('hlas jde změnit; vyhnán je ten s nejvíce hlasy', () => {
    let state = voting();
    state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
    state = must(state, as('p2'), { type: 'vote', targetId: 'p1' });
    state = must(state, as('p3'), { type: 'vote', targetId: 'p1' });
    state = must(state, as('p4'), { type: 'vote', targetId: 'p5' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(status(state, 'p1')).toBe('BANISHED');
    expect(state.history).toEqual([{ round: 1, banishedId: 'p1', murderedId: null }]);
  });

  it('při remíze rozhodne los, a to jen mezi remízujícími', () => {
    const banished = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      let state = voting();
      state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
      state = must(state, as('p3'), { type: 'vote', targetId: 'p4' });
      state = must(state, as('p5'), { type: 'vote', targetId: 'p6' });
      state = must(state, MOD, { type: 'closeVote' }, seededRng(seed));
      banished.add(state.history[0].banishedId!);
    }
    expect([...banished].sort()).toEqual(['p3', 'p4', 'p6']);
  });

  it('když nikdo nehlasoval, nikdo není vyhnán a hra pokračuje', () => {
    const state = must(voting(), MOD, { type: 'closeVote' });
    expect(state.phase).toBe('VOTE_RESULT');
    expect(state.history[0].banishedId).toBeNull();
    expect(state.players.every((p) => p.status === 'ALIVE')).toBe(true);
  });

  it('vyhnání posledního Zrádce = výhra Věrných', () => {
    let state = voting();
    state = must(state, as('p2'), { type: 'vote', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(state.phase).toBe('ENDED');
    expect(state.winner).toBe('LOYAL');
  });

  it('když vyhnáním Věrného dojde k rovnosti, vyhrávají Zrádci', () => {
    let state = must(startedWith(5, ['p1', 'p2']), MOD, { type: 'startVote' });
    state = must(state, as('p1'), { type: 'vote', targetId: 'p3' });
    state = must(state, MOD, { type: 'closeVote' });
    expect(state.phase).toBe('ENDED');
    expect(state.winner).toBe('TRAITOR');
  });
});

describe('noc', () => {
  const night = (players = 6, traitors = ['p1']) => {
    let state = must(startedWith(players, traitors), MOD, { type: 'startVote' });
    state = must(state, MOD, { type: 'closeVote' });
    return must(state, MOD, { type: 'startNight' });
  };

  it('Zrádce nemůže vybrat spoluzrádce ani sebe a hláška nic neprozradí', () => {
    const state = night(8, ['p1', 'p2']);
    expect(rejected(state, as('p1'), { type: 'nightPick', targetId: 'p2' })).toBe('Tohoto hráče nelze vybrat.');
    expect(rejected(state, as('p1'), { type: 'nightPick', targetId: 'p1' })).toBe('Tohoto hráče nelze vybrat.');
  });

  it('Věrný tipuje kohokoli živého kromě sebe a tip nic neovlivní', () => {
    let state = night();
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p3' });
    state = must(state, as('p2'), { type: 'nightPick', targetId: 'p4' });
    state = must(state, as('p4'), { type: 'nightPick', targetId: 'p1' });
    expect(state.nightPicks).toEqual({ p1: 'p3' });
    expect(state.nightTips).toEqual({ p2: 'p4', p4: 'p1' });
    state = must(state, MOD, { type: 'endNight' });
    expect(status(state, 'p3')).toBe('MURDERED');
    expect(state.phase).toBe('MORNING');
    expect(state.history).toEqual([{ round: 1, banishedId: null, murderedId: 'p3' }]);
  });

  it('při neshodě dvou Zrádců rozhodne los mezi jejich volbami', () => {
    const murdered = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      let state = night(8, ['p1', 'p2']);
      state = must(state, as('p1'), { type: 'nightPick', targetId: 'p3' });
      state = must(state, as('p2'), { type: 'nightPick', targetId: 'p4' });
      state = must(state, MOD, { type: 'endNight' }, seededRng(seed));
      murdered.add(state.history[0].murderedId!);
    }
    expect([...murdered].sort()).toEqual(['p3', 'p4']);
  });

  it('když Zrádci nikoho nevyberou, oběť se losuje jen mezi živými Věrnými', () => {
    const murdered = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const state = must(night(8, ['p1', 'p2']), MOD, { type: 'endNight' }, seededRng(seed));
      murdered.add(state.history[0].murderedId!);
    }
    expect(murdered.has('p1') || murdered.has('p2')).toBe(false);
    expect(murdered.size).toBe(6);
  });

  it('když po noci dojde k rovnosti, vyhrávají Zrádci', () => {
    // 2 Zrádci proti 3 Věrným, po vraždě 2 : 2
    let state = night(5, ['p1', 'p2']);
    state = must(state, as('p1'), { type: 'nightPick', targetId: 'p3' });
    state = must(state, MOD, { type: 'endNight' });
    expect(state.phase).toBe('ENDED');
    expect(state.winner).toBe('TRAITOR');
  });
});

describe('průběh kol a oprávnění', () => {
  it('další kolo zvýší číslo kola a vynuluje hlasy', () => {
    let state = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    state = must(state, as('p2'), { type: 'vote', targetId: 'p3' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'startNight' });
    state = must(state, MOD, { type: 'endNight' });
    state = must(state, MOD, { type: 'startVote' });
    expect(state.round).toBe(2);
    expect(state.votes).toEqual({});
    expect(state.phase).toBe('VOTE');
  });

  it('fáze řídí jen moderátor a jen ve správném pořadí', () => {
    const state = startedWith(6, ['p1']);
    for (const type of ['startVote', 'closeVote', 'startNight', 'endNight', 'newGame'] as const) {
      rejected(state, as('p2'), { type });
    }
    expect(rejected(state, MOD, { type: 'startNight' })).toBe('Teď to nejde.');
    rejected(state, MOD, { type: 'endNight' });
    rejected(state, MOD, { type: 'closeVote' });
  });

  it('nová hra ponechá hráče a vymaže role i výsledky', () => {
    let state = must(startedWith(4, ['p1']), MOD, { type: 'startVote' });
    state = must(state, as('p2'), { type: 'vote', targetId: 'p1' });
    state = must(state, MOD, { type: 'closeVote' });
    state = must(state, MOD, { type: 'newGame' });
    expect(state.phase).toBe('LOBBY');
    expect(state.round).toBe(0);
    expect(state.history).toEqual([]);
    expect(state.winner).toBeUndefined();
    expect(state.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(state.players.every((p) => p.status === 'ALIVE' && !p.role && !p.sawRole)).toBe(true);
  });

  it('nemění předaný stav', () => {
    const before = startedWith(6, ['p1']);
    const snapshot = structuredClone(before);
    apply(before, MOD, { type: 'startVote' }, seededRng(1));
    expect(before).toEqual(snapshot);
  });
});
