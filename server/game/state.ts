import type {
  FinalChoice,
  PotShare,
  MinigameId,
  MinigameStep,
  Phase,
  PlayerStatus,
  PointReason,
  PublicMinigameRecord,
  Role,
  Winner,
} from '../../shared/types.js';
import type { MinigameResult } from '../minigames/types.js';

/**
 * Úplný stav hry. Existuje jen na serveru a nikdy se neposílá klientům celý;
 * klienti dostávají jen pohledy z views.ts (krok 3).
 */
export interface Player {
  /** Veřejné id, používá se pro hlasování a v pohledech ostatních. */
  id: string;
  /** Tajný token, zná ho jen telefon hráče. */
  token: string;
  name: string;
  /** Přidělena při rozdání rolí, v lobby chybí. */
  role?: Role;
  status: PlayerStatus;
  sawRole: boolean;
  /** Bot: tahy za něj volí server (Rozšíření 13). */
  bot?: boolean;
}

export interface RoundResult {
  round: number;
  /** Kdo byl u kulatého stolu vyhnán; null = nikdo nehlasoval. */
  banishedId: string | null;
  /** Kdo zemřel v noci; null = noc tohoto kola ještě neproběhla. */
  murderedId: string | null;
  /** Minihra tohoto dne (veřejné údaje). */
  minigame?: PublicMinigameRecord;
  /** Zrádci vybrali hráče se štítem a nikdo nezemřel (jen pro server a moderátora). */
  shieldSaved?: boolean;
}

/** Probíhající minihra. Stav modulu je obyčejný objekt (musí jít zkopírovat přes structuredClone). */
export interface ActiveMinigame {
  id: MinigameId | null;
  step: MinigameStep;
  rerollsLeft: number;
  secretCardSeen: Record<string, boolean>;
  state: unknown;
  result: MinigameResult | null;
  /** Předání štítu: vítěz a volby všech živých (jen vítězova se počítá). */
  handoff: { winnerId: string; picks: Record<string, string | null>; endsAt: number } | null;
}

export interface GameSettings {
  minigamesEnabled: boolean;
  /** Fyzická mise v osudí (Rozšíření 8); výchozí vypnuto. */
  physicalMission: boolean;
  /** Velká obrazovka ztlumená z konzole (Rozšíření 9). */
  screenMuted: boolean;
  /** Veřejné hlasování: obrazovka ukáže, kdo pro koho hlasoval (Rozšíření 12); výchozí vypnuto. */
  publicVotes: boolean;
  /** Sady otázek do kvízu; null = všechny (Rozšíření 13). */
  quizSets: string[] | null;
}

/**
 * Osobní body hráče. Zatím jen za tipy duchů, později i z miniher.
 * `visible: 'END'` = hráč položku uvidí až na konci hry (tipy duchů by jinak prozradily Zrádce).
 */
export interface PointEntry {
  playerId: string;
  amount: number;
  reason: PointReason;
  round: number;
  visible: 'NOW' | 'END';
}

/** Vyhodnocený tip ducha z jednoho kola. */
export interface GhostTipRecord {
  round: number;
  ghostId: string;
  targetId: string;
}

export interface GameState {
  phase: Phase;
  /** 0 v lobby, od rozdání rolí 1, 2, … */
  round: number;
  traitorCount: number;
  players: Player[];
  /** Hlasy u kulatého stolu v aktuálním kole: voterId → targetId. */
  votes: Record<string, string>;
  /** Volby Zrádců v aktuální noci: traitorId → targetId. */
  nightPicks: Record<string, string>;
  /** Tipy Věrných v aktuální noci, nikam se nepočítají: loyalId → targetId. */
  nightTips: Record<string, string>;
  history: RoundResult[];
  /** Tipy duchů v aktuálním kole: ghostId → targetId. */
  ghostTips: Record<string, string>;
  /** Tipy duchů z uzavřených kol (pro počet tipů a kontrolu bodů). */
  ghostTipLog: GhostTipRecord[];
  points: PointEntry[];
  settings: GameSettings;
  /** Probíhající minihra (jen ve fázi MINIGAME). */
  minigame: ActiveMinigame | null;
  /** Minihry odehrané v této hře, v pořadí (kvůli losu bez opakování). */
  minigamesPlayed: MinigameId[];
  /** Paměť modulů napříč dny (např. kdo už byl duelistou). */
  minigameMemory: Record<MinigameId, unknown>;
  /** Kdo drží štít pro noc aktuálního kola. */
  shieldHolderId: string | null;
  /** Společný poklad; nikdy neklesne pod 0. */
  pot: number;
  /** Pauza od moderátora: od kdy (čas serveru), nebo null (Rozšíření 10). */
  paused: { since: number } | null;
  /** Hra je ve finále: místo noci následuje další finálové hlasování (Rozšíření 11). */
  finale: boolean;
  /** Volby v aktuálním finálovém hlasování. */
  finalVotes: Record<string, FinalChoice>;
  /** Rozdělení pokladu na konci hry. */
  potShare: PotShare | null;
  /** Hlasy ze všech uzavřených kulatých stolů; ven jdou jen ceny v rekapitulaci (Rozšíření 11). */
  voteLog: { round: number; voterId: string; targetId: string }[];
  winner?: Winner;
}

export const STARTING_POT = 1000;

export function createGame(): GameState {
  return {
    phase: 'LOBBY',
    round: 0,
    traitorCount: 0,
    players: [],
    votes: {},
    nightPicks: {},
    nightTips: {},
    history: [],
    ghostTips: {},
    ghostTipLog: [],
    points: [],
    settings: { minigamesEnabled: true, physicalMission: false, screenMuted: false, publicVotes: false, quizSets: null },
    minigame: null,
    minigamesPlayed: [],
    minigameMemory: {},
    shieldHolderId: null,
    pot: STARTING_POT,
    paused: null,
    finale: false,
    finalVotes: {},
    potShare: null,
    voteLog: [],
  };
}
