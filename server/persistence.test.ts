import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MOD, must, startedWith } from './game/testing.js';
import { loadGame, saveGame } from './persistence.js';

let dir: string;
let file: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zrada-'));
  file = path.join(dir, 'data', 'zrada-stav.json');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('Obnova po pádu – soubor se stavem', () => {
  it('uložený stav se načte beze ztrát, i s klíčem moderátora', () => {
    const state = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    saveGame(file, { moderatorKey: 'abc123', state });
    const loaded = loadGame(file);
    expect(loaded).toEqual({ moderatorKey: 'abc123', state });
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
  });

  it('chybějící soubor = nová hra', () => {
    expect(loadGame(file)).toBeNull();
  });

  it('poškozený soubor se odloží jako .bad a začne nová hra', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ tohle není JSON');
    expect(loadGame(file)).toBeNull();
    expect(fs.existsSync(`${file}.bad`)).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('starší soubor bez novějších nastavení dostane výchozí hodnoty', () => {
    const state = startedWith(5, ['p1']);
    const old = { ...state, settings: { minigamesEnabled: false } };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1, savedAt: '', moderatorKey: 'k', state: old }));
    const loaded = loadGame(file)!;
    expect(loaded.state.settings).toEqual({ minigamesEnabled: false, physicalMission: false, screenMuted: false, publicVotes: false, quizSets: null, reactions: true });
    expect(loaded.state.players).toEqual(state.players);
  });
});
