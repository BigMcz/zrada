// Obnova po pádu serveru (DOC/SPEC.md, Rozšíření 10): celý stav hry v jednom souboru.
// Ukládá se stav, ne přehrávání akcí – los v jádru je náhodný a přehrát by nešel.
import fs from 'node:fs';
import path from 'node:path';
import { createGame, type GameState } from './game/state.js';

const VERSION = 1;

export interface SavedGame {
  moderatorKey: string;
  state: GameState;
}

interface SaveFile {
  version: number;
  savedAt: string;
  moderatorKey: string;
  state: GameState;
}

/**
 * Uloží stav přes dočasný soubor a přejmenování, aby se při pádu uprostřed zápisu
 * nepoškodil poslední dobrý stav.
 */
export function saveGame(file: string, game: SavedGame): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data: SaveFile = { version: VERSION, savedAt: new Date().toISOString(), moderatorKey: game.moderatorKey, state: game.state };
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

/**
 * Načte uložený stav, nebo null (soubor chybí nebo je poškozený). Poškozený soubor se
 * přejmenuje na .bad, aby ho šlo prozkoumat a nový start ho nepřepsal.
 */
export function loadGame(file: string): SavedGame | null {
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<SaveFile>;
    const s = data.state as GameState | undefined;
    if (data.version !== VERSION || typeof data.moderatorKey !== 'string' || !s || typeof s.phase !== 'string' || !Array.isArray(s.players)) {
      throw new Error('neznámý formát');
    }
    // Nastavení přidaná v novějších verzích doplní výchozí hodnoty.
    const state: GameState = { ...createGame(), ...s, settings: { ...createGame().settings, ...s.settings } };
    return { moderatorKey: data.moderatorKey, state };
  } catch (e) {
    const bad = `${file}.bad`;
    try {
      fs.renameSync(file, bad);
    } catch {
      // nevadí, soubor se při dalším uložení přepíše
    }
    console.warn(`  Uložený stav hry nejde načíst (${(e as Error).message}), přesunut do ${bad}. Začíná nová hra.`);
    return null;
  }
}
