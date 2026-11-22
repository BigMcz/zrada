import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHallOfFame, hallBoards, hallKey, recordGame } from './hallOfFame.js';
import type { GameState } from './game/state.js';
import { startedWith } from './game/testing.js';

/** Dohraná hra: p1 je Zrádce, vyhráli zadaní. */
function ended(winner: 'LOYAL' | 'TRAITOR', rename: Record<string, string> = {}): GameState {
  const s = startedWith(5, ['p1']);
  for (const p of s.players) if (rename[p.id]) p.name = rename[p.id];
  s.phase = 'ENDED';
  s.winner = winner;
  return s;
}

describe('síň slávy (Rozšíření 16)', () => {
  it('jméno se pozná bez ohledu na velikost písmen a diakritiku', () => {
    expect(hallKey('  Žofie ')).toBe(hallKey('ZOFIE'));
    expect(hallKey('Anna')).not.toBe(hallKey('Anča'));
  });

  it('připíše hry, výhry, výhry Zrádce; nedohraná hra se nepočítá', () => {
    let e = recordGame({}, ended('TRAITOR'));
    expect(e[hallKey('Hráč 1')]).toMatchObject({ games: 1, wins: 1, traitorWins: 1 });
    expect(e[hallKey('Hráč 2')]).toMatchObject({ games: 1, wins: 0, traitorWins: 0 });
    e = recordGame(e, ended('LOYAL', { p2: 'HRÁČ 2' }));
    expect(e[hallKey('Hráč 2')]).toMatchObject({ name: 'HRÁČ 2', games: 2, wins: 1 });
    const running = startedWith(5, ['p1']);
    expect(recordGame(e, running)).toBe(e);
  });

  it('boti se nepočítají', () => {
    const s = ended('LOYAL');
    s.players[1].bot = true;
    expect(recordGame({}, s)[hallKey('Hráč 2')]).toBeUndefined();
  });

  it('žebříčky: seřazené, nejvýš 5 jmen, prázdné se vynechají', () => {
    let e = {};
    for (let i = 0; i < 3; i++) e = recordGame(e, ended('LOYAL'));
    const boards = hallBoards(e);
    expect(boards.map((b) => b.key)).toEqual(['WINS']);
    expect(boards[0].rows).toHaveLength(4);
    expect(boards[0].rows[0]).toEqual({ name: 'Hráč 2', count: 3 });
    e = recordGame(e, ended('TRAITOR'));
    expect(hallBoards(e).find((b) => b.key === 'TRAITOR')?.rows).toEqual([{ name: 'Hráč 1', count: 1 }]);
  });

  it('přežije restart (soubor) a jde vynulovat', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zrada-sin-'));
    const file = path.join(dir, 'sin.json');
    try {
      createHallOfFame(file).record(ended('LOYAL'));
      const again = createHallOfFame(file);
      expect(again.entries()[hallKey('Hráč 2')]).toMatchObject({ games: 1, wins: 1 });
      again.reset();
      expect(createHallOfFame(file).entries()).toEqual({});
      fs.writeFileSync(file, 'nesmysl');
      expect(createHallOfFame(file).entries()).toEqual({});
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
