import type { Phase, PlayerStatus, PointReason, Role, Winner } from '../../shared/types.js';

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
}

export interface RoundResult {
  round: number;
  /** Kdo byl u kulatého stolu vyhnán; null = nikdo nehlasoval. */
  banishedId: string | null;
  /** Kdo zemřel v noci; null = noc tohoto kola ještě neproběhla. */
  murderedId: string | null;
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
  winner?: Winner;
}

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
  };
}
