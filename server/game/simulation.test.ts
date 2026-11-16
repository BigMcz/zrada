import { describe, expect, it } from 'vitest';
import { recommendedTraitors } from '../../shared/types.js';
import { pick, seededRng, type Rng } from './random.js';
import { alive, aliveWithRole } from './rules.js';
import type { GameState } from './state.js';
import { as, lobby, MOD, must } from './testing.js';

/**
 * Celá hra s boty: všichni hrají náhodně, část hráčů občas nehlasuje.
 * Vrací konečný stav a počet provedených fází.
 */
function playRandomGame(playerCount: number, rng: Rng) {
  const names = Array.from({ length: playerCount }, (_, i) => `Bot ${i + 1}`);
  let state: GameState = must(lobby(names), MOD, { type: 'startGame', traitorCount: recommendedTraitors(playerCount) }, rng);
  for (const p of state.players) state = must(state, as(p.id), { type: 'ackRole' });

  let steps = 0;
  state = must(state, MOD, { type: 'startVote' }, rng);

  while (state.phase !== 'ENDED') {
    if (++steps > 200) throw new Error('Hra se zasekla');

    switch (state.phase) {
      case 'VOTE': {
        for (const voter of alive(state)) {
          if (rng.int(5) === 0) continue; // občas někdo nehlasuje
          const targets = alive(state).filter((p) => p.id !== voter.id);
          state = must(state, as(voter.id), { type: 'vote', targetId: pick(rng, targets).id });
        }
        state = must(state, MOD, { type: 'closeVote' }, rng);
        break;
      }
      case 'VOTE_RESULT':
        state = must(state, MOD, { type: 'startNight' }, rng);
        break;
      case 'NIGHT': {
        for (const p of alive(state)) {
          if (rng.int(4) === 0) continue; // občas někdo nevybere
          const targets =
            p.role === 'TRAITOR'
              ? aliveWithRole(state, 'LOYAL')
              : alive(state).filter((o) => o.id !== p.id);
          state = must(state, as(p.id), { type: 'nightPick', targetId: pick(rng, targets).id });
        }
        state = must(state, MOD, { type: 'endNight' }, rng);
        break;
      }
      case 'MORNING':
        state = must(state, MOD, { type: 'startVote' }, rng);
        break;
      default:
        throw new Error(`Nečekaná fáze ${state.phase}`);
    }
  }
  return state;
}

describe('simulace celé hry s boty', () => {
  it('300 náhodných her se 4–10 hráči vždy správně skončí', () => {
    const winners = { LOYAL: 0, TRAITOR: 0 };

    for (let seed = 1; seed <= 300; seed++) {
      const rng = seededRng(seed);
      const playerCount = 4 + (seed % 7);
      const state = playRandomGame(playerCount, rng);

      const traitors = aliveWithRole(state, 'TRAITOR').length;
      const loyal = aliveWithRole(state, 'LOYAL').length;
      expect(state.winner).toBeDefined();
      if (state.winner === 'LOYAL') expect(traitors).toBe(0);
      if (state.winner === 'TRAITOR') expect(traitors).toBeGreaterThanOrEqual(loyal);
      winners[state.winner!]++;

      // V noci vždy zemře Věrný a každé kolo je v historii jednou.
      for (const h of state.history) {
        if (h.murderedId) {
          expect(state.players.find((p) => p.id === h.murderedId)!.role).toBe('LOYAL');
        }
      }
      expect(state.history.map((h) => h.round)).toEqual(
        Array.from({ length: state.history.length }, (_, i) => i + 1),
      );
      expect(state.history.length).toBeLessThanOrEqual(playerCount);
    }

    // Obě strany musí mít šanci vyhrát.
    expect(winners.LOYAL).toBeGreaterThan(0);
    expect(winners.TRAITOR).toBeGreaterThan(0);
  });
});
