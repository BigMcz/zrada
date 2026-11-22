import { describe, expect, it } from 'vitest';
import { seededRng } from './random.js';
import { aliveWithRole } from './rules.js';
import { playRandomGame } from './testing.js';

describe('simulace celé hry s boty', () => {
  it('300 náhodných her se 4–18 hráči vždy správně skončí', () => {
    const winners = { LOYAL: 0, TRAITOR: 0 };

    for (let seed = 1; seed <= 300; seed++) {
      const playerCount = 4 + (seed % 15);
      const state = playRandomGame(playerCount, seededRng(seed));

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
