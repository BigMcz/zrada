// Rozšíření 10, krok S3: pauza a zásahy moderátora.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerMinigame, unregisterMinigame } from '../minigames/registry.js';
import { makeTimedButtonModule } from '../minigames/testModule.js';
import { apply, shiftTimes, type Action, type Actor } from './engine.js';
import { seededRng } from './random.js';
import { isTippingGhost } from './rules.js';
import type { GameState } from './state.js';
import { as, lobby, MOD, must, rejected, startedWith } from './testing.js';
import { viewForPlayer, viewForScreen } from './views.js';

/** Skutečný čas (kvůli posunu odpočtů po pauze se posouvají jen časy po roce 2001). */
const T = 1_800_000_000_000;

const at = (s: GameState, actor: Actor, action: Action, now: number) => {
  const r = apply(s, actor, action, seededRng(3), now);
  if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
  return r.state;
};

describe('Pauza', () => {
  it('zastaví hru: hráči ani moderátor nic neposunou, telefon i obrazovka vidí pauzu', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    s = must(s, MOD, { type: 'pause' });
    expect(viewForPlayer(s, 'p2')!.paused).toBe(true);
    expect(viewForScreen(s, null).paused).toBe(true);
    expect(rejected(s, as('p2'), { type: 'vote', targetId: 'p3' })).toBe('Hra je pozastavená.');
    rejected(s, MOD, { type: 'closeVote' });
    rejected(s, MOD, { type: 'pause' });
    // Ztlumení obrazovky jde i během pauzy.
    s = must(s, MOD, { type: 'setScreenMuted', muted: true });
    s = must(s, MOD, { type: 'resume' });
    expect(viewForPlayer(s, 'p2')!.paused).toBe(false);
    s = must(s, as('p2'), { type: 'vote', targetId: 'p3' });
    rejected(s, MOD, { type: 'resume' });
  });

  it('v lobby ani po konci hry pauza nejde; pauzu smí jen moderátor', () => {
    rejected(lobby(['A', 'B', 'C', 'D']), MOD, { type: 'pause' });
    rejected(startedWith(5, ['p1']), as('p1'), { type: 'pause' });
  });

  it('odpočty miniher po pokračování běží dál od stejného místa', () => {
    registerMinigame(makeTimedButtonModule('TIMED'));
    try {
      let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
      s = at(s, MOD, { type: 'confirmMinigame' }, T);
      s = at(s, MOD, { type: 'startMinigame' }, T);
      const endsAt = (s.minigame!.state as { endsAt: number }).endsAt;
      expect(endsAt).toBeGreaterThan(T);
      s = at(s, MOD, { type: 'pause' }, T + 1_000);
      // Během pauzy časovač neběží (tik se odmítne).
      expect(apply(s, { kind: 'system' }, { type: 'tick', now: endsAt + 5_000 }, seededRng(1), endsAt + 5_000).ok).toBe(false);
      s = at(s, MOD, { type: 'resume' }, T + 11_000);
      expect((s.minigame!.state as { endsAt: number }).endsAt).toBe(endsAt + 10_000);
    } finally {
      unregisterMinigame('TIMED');
    }
  });

  it('posun časů se týká jen časových údajů, ne počtů a bodů', () => {
    expect(shiftTimes({ endsAt: T, pot: 1000, digits: [1, 2], nested: [{ at: T + 5 }] }, 500)).toEqual({
      endsAt: T + 500,
      pot: 1000,
      digits: [1, 2],
      nested: [{ at: T + 505 }],
    });
  });
});

describe('Zásahy moderátora', () => {
  it('vynulovat hlasy: jen během hlasování', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    s = must(s, as('p2'), { type: 'vote', targetId: 'p3' });
    s = must(s, MOD, { type: 'resetVotes' });
    expect(s.votes).toEqual({});
    rejected(startedWith(5, ['p1']), MOD, { type: 'resetVotes' });
  });

  it('vyřadit hráče: stav „odešel“, role zůstane tajná, Věrný se stane duchem, hlasy pro něj se zruší', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    s = must(s, as('p3'), { type: 'vote', targetId: 'p2' });
    s = must(s, as('p2'), { type: 'vote', targetId: 'p4' });
    s = must(s, MOD, { type: 'removePlayer', playerId: 'p2' });
    const p2 = s.players.find((p) => p.id === 'p2')!;
    expect(p2.status).toBe('LEFT');
    expect(isTippingGhost(p2)).toBe(true);
    expect(s.votes).toEqual({});
    expect(viewForPlayer(s, 'p3')!.players.find((p) => p.id === 'p2')!.revealedRole).toBeUndefined();
    expect(s.phase).toBe('VOTE');
    rejected(s, MOD, { type: 'removePlayer', playerId: 'p2' });
  });

  it('vyřazení posledního Zrádce ukončí hru výhrou Věrných; během minihry ani v lobby nejde', () => {
    const s = must(startedWith(5, ['p1']), MOD, { type: 'removePlayer', playerId: 'p1' });
    expect(s).toMatchObject({ phase: 'ENDED', winner: 'LOYAL' });
    rejected(lobby(['A', 'B', 'C', 'D']), MOD, { type: 'removePlayer', playerId: 'p1' });
    registerMinigame(makeTimedButtonModule('TIMED'));
    try {
      const m = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
      rejected(m, MOD, { type: 'removePlayer', playerId: 'p2' });
    } finally {
      unregisterMinigame('TIMED');
    }
  });

  it('nový telefon: hráč dostane nový token, jen moderátor', () => {
    const s = startedWith(5, ['p1']);
    const next = must(s, MOD, { type: 'newPhone', playerId: 'p2', token: 'novy-token' });
    expect(next.players.find((p) => p.id === 'p2')!.token).toBe('novy-token');
    rejected(s, as('p2'), { type: 'newPhone', playerId: 'p2', token: 'x' });
    rejected(s, MOD, { type: 'newPhone', playerId: 'nikdo', token: 'x' });
  });
});

describe('Pauza během minihry s předáním štítu', () => {
  beforeEach(() => registerMinigame(makeTimedButtonModule('TIMED')));
  afterEach(() => unregisterMinigame('TIMED'));

  it('posune i konec předání štítu', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' }, T);
    s = at(s, MOD, { type: 'startMinigame' }, T);
    for (const p of s.players) s = at(s, as(p.id), { type: 'minigameInput', payload: 'press' }, T + 100);
    s = at(s, MOD, { type: 'showClue' }, T + 200);
    s = at(s, MOD, { type: 'afterClue' }, T + 300);
    const handoffEnds = s.minigame!.handoff!.endsAt;
    s = at(s, MOD, { type: 'pause' }, T + 400);
    s = at(s, MOD, { type: 'resume' }, T + 5_400);
    expect(s.minigame!.handoff!.endsAt).toBe(handoffEnds + 5_000);
  });
});
