// Rozšíření 11, krok K2: rekapitulace a ceny na konci hry.
import { describe, expect, it } from 'vitest';
import { seededRng } from './random.js';
import { recapOf } from './recap.js';
import type { GameState } from './state.js';
import { as, MOD, must, playRandomGame, startedWith } from './testing.js';
import { viewForModerator, viewForPlayer, viewForScreen } from './views.js';

/** p1, p2 Zrádci; p3–p8 Věrní. Kolo 1: hlasy proti Věrnému p3, kolo 2: hlasy proti Zrádci p1. */
function playedGame(): GameState {
  let s = must(startedWith(8, ['p1', 'p2']), MOD, { type: 'startVote' });
  for (const [v, t] of [['p1', 'p3'], ['p2', 'p3'], ['p4', 'p3'], ['p5', 'p1'], ['p6', 'p3']]) s = must(s, as(v), { type: 'vote', targetId: t });
  s = must(s, MOD, { type: 'closeVote' }); // vyhnán p3 (Věrný)
  s = must(s, MOD, { type: 'startNight' });
  s = must(s, as('p1'), { type: 'nightPick', targetId: 'p8' });
  s = must(s, MOD, { type: 'endNight' });
  s = must(s, MOD, { type: 'startVote' });
  for (const [v, t] of [['p4', 'p1'], ['p5', 'p1'], ['p6', 'p1'], ['p7', 'p2'], ['p2', 'p4']]) s = must(s, as(v), { type: 'vote', targetId: t });
  s = must(s, MOD, { type: 'closeVote' }); // vyhnán p1 (Zrádce)
  return s;
}

describe('Rekapitulace a ceny', () => {
  it('časová osa kol: vyhnaní, oběti noci', () => {
    const r = recapOf(playedGame());
    expect(r.rounds).toEqual([
      { round: 1, banishedId: 'p3', murderedId: 'p8', minigame: null },
      { round: 2, banishedId: 'p1', murderedId: null, minigame: null },
    ]);
  });

  it('ceny: Detektiv, Mistr klamu, Nejpodezřelejší Věrný (shoda = všichni)', () => {
    const r = recapOf(playedGame());
    const award = (key: string) => r.awards.find((a) => a.key === key);
    // Pro Zrádce hlasovali: p5 dvakrát; p4, p6, p7 jednou.
    expect(award('DETECTIVE')).toMatchObject({ ids: ['p5'], count: 2 });
    // Proti Zrádcům: p1 4×, p2 1× → Mistr klamu p2.
    expect(award('DECEIVER')).toMatchObject({ ids: ['p2'], count: 1 });
    // Proti Věrným: p3 4×.
    expect(award('SUSPECT')).toMatchObject({ ids: ['p3'], count: 4 });
  });

  it('bez hlasů se Detektiv ani Nejpodezřelejší Věrný neudělí', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    s = must(s, MOD, { type: 'closeVote' });
    const r = recapOf(s);
    expect(r.awards.map((a) => a.key)).toEqual(['DECEIVER']);
  });

  it('rekapitulace jen na konci hry a nikde kompletní seznam, kdo pro koho hlasoval', () => {
    for (let seed = 1; seed <= 20; seed++) {
      playRandomGame(4 + (seed % 7), seededRng(seed), (s) => {
        const views = [viewForScreen(s, null), viewForModerator(s, new Set()), ...s.players.map((p) => viewForPlayer(s, p.id)!)];
        for (const v of views) {
          expect(v.recap === null).toBe(s.phase !== 'ENDED');
          expect(JSON.stringify(v)).not.toContain('voteLog');
          expect(JSON.stringify(v)).not.toContain('"voterId"');
        }
      });
    }
  });

  it('nová hra vymaže záznam hlasů', () => {
    let s = playedGame();
    while (s.phase !== 'ENDED') {
      s = must(s, MOD, { type: 'startNight' });
      s = must(s, MOD, { type: 'endNight' });
      if (s.phase === 'ENDED') break;
      s = must(s, MOD, { type: 'startVote' });
      s = must(s, as('p4'), { type: 'vote', targetId: 'p2' });
      s = must(s, MOD, { type: 'closeVote' });
    }
    expect(s.voteLog.length).toBeGreaterThan(0);
    expect(must(s, MOD, { type: 'newGame' }).voteLog).toEqual([]);
  });
});
