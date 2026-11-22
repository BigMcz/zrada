// Síň slávy (DOC/SPEC.md, Rozšíření 16): výsledky napříč večery v jednom lokálním souboru.
// Hráč se pozná podle jména bez ohledu na velikost písmen a diakritiku. Boti se nepočítají.
import fs from 'node:fs';
import path from 'node:path';
import type { HallBoard } from '../shared/types.js';
import { recapOf } from './game/recap.js';
import type { GameState } from './game/state.js';

export interface HallEntry {
  /** Jméno, pod kterým hráč hrál naposledy (pro zobrazení). */
  name: string;
  games: number;
  wins: number;
  traitorWins: number;
  detective: number;
  deceiver: number;
}

export type HallEntries = Record<string, HallEntry>;

const TOP = 5;

/** „Žofie" a „ZOFIE" jsou stejný hráč. */
export function hallKey(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Připíše dohranou hru (čistá funkce; vrací nový záznam). */
export function recordGame(entries: HallEntries, state: GameState): HallEntries {
  if (state.phase !== 'ENDED' || !state.winner) return entries;
  const next: HallEntries = { ...entries };
  const awards = recapOf(state).awards;
  const awarded = (key: string, id: string) => awards.some((a) => a.key === key && a.ids.includes(id));
  for (const p of state.players) {
    if (p.bot || !p.role) continue;
    const key = hallKey(p.name);
    const old = next[key] ?? { name: p.name, games: 0, wins: 0, traitorWins: 0, detective: 0, deceiver: 0 };
    const won = p.role === state.winner;
    next[key] = {
      name: p.name,
      games: old.games + 1,
      wins: old.wins + (won ? 1 : 0),
      traitorWins: old.traitorWins + (won && p.role === 'TRAITOR' ? 1 : 0),
      detective: old.detective + (awarded('DETECTIVE', p.id) ? 1 : 0),
      deceiver: old.deceiver + (awarded('DECEIVER', p.id) ? 1 : 0),
    };
  }
  return next;
}

/** Žebříčky pro čekárnu velké obrazovky; prázdné žebříčky se vynechají. */
export function hallBoards(entries: HallEntries): HallBoard[] {
  const all = Object.values(entries);
  const board = (key: HallBoard['key'], title: string, count: (e: HallEntry) => number): HallBoard => ({
    key,
    title,
    rows: all
      .filter((e) => count(e) > 0)
      .sort((a, b) => count(b) - count(a) || b.games - a.games || a.name.localeCompare(b.name, 'cs'))
      .slice(0, TOP)
      .map((e) => ({ name: e.name, count: count(e) })),
  });
  return [
    board('WINS', 'Nejvíc výher', (e) => e.wins),
    board('TRAITOR', 'Nejlepší Zrádce', (e) => e.traitorWins),
    board('DETECTIVE', 'Nejlepší Detektiv', (e) => e.detective),
  ].filter((b) => b.rows.length > 0);
}

export interface HallOfFame {
  entries(): HallEntries;
  record(state: GameState): void;
  reset(): void;
}

/** Síň slávy v souboru; bez souboru (robot, testy) jen v paměti. Zápis přes dočasný soubor jako u uložené hry. */
export function createHallOfFame(file: string | null): HallOfFame {
  let entries: HallEntries = file ? load(file) : {};
  const save = () => {
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, entries }));
      fs.renameSync(tmp, file);
    } catch (e) {
      console.warn(`  Síň slávy nejde uložit: ${(e as Error).message}`);
    }
  };
  return {
    entries: () => entries,
    record(state) {
      entries = recordGame(entries, state);
      save();
    },
    reset() {
      entries = {};
      save();
    },
  };
}

function load(file: string): HallEntries {
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { version?: number; entries?: HallEntries };
    if (data.version !== 1 || typeof data.entries !== 'object' || data.entries === null) throw new Error('neznámý formát');
    return data.entries;
  } catch (e) {
    console.warn(`  Síň slávy nejde načíst (${(e as Error).message}), začíná prázdná.`);
    return {};
  }
}
