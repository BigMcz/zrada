// Rozšíření 13, krok B2: každá minihra jde dohrát jen s boty (a moderátorem, který posouvá kroky).
import { describe, expect, it } from 'vitest';
import { seededRng } from '../game/random.js';
import { auction } from './auction/index.js';
import { bomb } from './bomb/index.js';
import { hotPotato } from './hotPotato/index.js';
import { physical } from './physical/index.js';
import { quiz } from './quiz/index.js';
import { rhythm } from './rhythm/index.js';
import { splitSteal } from './splitSteal/index.js';
import type { MinigameContext, MinigameModule } from './types.js';
import { vault } from './vault/index.js';

const IDS = ['a', 'b', 'c', 'd', 'e', 'f'];
const ctx: MinigameContext = {
  players: IDS.map((id) => ({ id, role: id === 'a' || id === 'b' ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts: ['g1', 'g2'],
  pot: 1000,
  round: 1,
  memory: undefined,
};

/** Zásahy moderátora, které posouvají kroky miniher (zkouší se, dokud některý nezabere). */
const NUDGES: unknown[] = [
  { action: 'endStage' },
  { action: 'reveal' },
  { action: 'endVote' },
  { action: 'start' },
  { action: 'next' },
  { action: 'publish', text: 'Postavte věž.' },
  { action: 'result', potDelta: 0, winnerId: null, ghostId: null },
];

function playWithBots<S>(m: MinigameModule<S>, seed: number): { s: S; moves: number } {
  const rng = seededRng(seed);
  let now = 1_000_000;
  let s = m.start(m.init(ctx, rng, now), now, rng);
  const connected = new Set(IDS);
  let moves = 0;
  for (let step = 0; step < 3_000 && !m.isFinished(s); step++) {
    let progressed = false;
    for (const id of IDS) {
      const input = m.bot?.(s, id, rng, now);
      if (input === null || input === undefined) continue;
      const next = m.apply(s, id, input, now, rng);
      expect(next, `${m.id}: tah bota ${id} odmítnut: ${JSON.stringify(input)}`).not.toBeNull();
      s = next!;
      moves++;
      progressed = true;
    }
    for (const g of ctx.ghosts) {
      const input = m.ghostBot?.(s, g, rng, now);
      if (input === null || input === undefined) continue;
      const next = m.applyGhost?.(s, g, input, now);
      expect(next, `${m.id}: tah ducha ${g} odmítnut`).not.toBeNull();
      s = next!;
    }
    now += 500;
    s = m.tick(s, now, rng, connected);
    // Nikdo nehrál: moderátor posune krok (odhalení, konec volby, spuštění odpočtu…).
    if (!progressed && step % 10 === 9) {
      for (const n of NUDGES) {
        const next = m.applyModerator?.(s, n, now, rng);
        if (next) {
          s = next;
          break;
        }
      }
    }
  }
  return { s, moves };
}

describe('Boti v minihrách', () => {
  for (const m of [auction, splitSteal, hotPotato, quiz, vault, rhythm, bomb, physical] as MinigameModule[]) {
    it(`${m.meta.name}: jde dohrát jen s boty`, () => {
      for (const seed of [1, 2, 3]) {
        const { s, moves } = playWithBots(m, seed);
        expect(m.isFinished(s), `${m.id} se s boty nedohrál (semínko ${seed})`).toBe(true);
        expect(() => m.result(s)).not.toThrow();
        if (m.id !== 'PHYSICAL') expect(moves).toBeGreaterThan(0);
      }
    });
  }
});
