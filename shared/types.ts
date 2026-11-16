// Typy sdílené serverem a klientem. Pohledy (co klient dostane) přibudou v kroku 3.

export type Phase =
  | 'LOBBY' // hráči se připojují
  | 'ROLES' // hráči si prohlížejí role
  | 'VOTE' // kulatý stůl, hlasování
  | 'VOTE_RESULT' // výsledek hlasování
  | 'NIGHT' // Zrádci vybírají oběť, Věrní tipují
  | 'MORNING' // oznámení oběti
  | 'ENDED'; // konec hry

export type Role = 'LOYAL' | 'TRAITOR';

export type PlayerStatus = 'ALIVE' | 'BANISHED' | 'MURDERED';

export type Winner = Role;

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 10;
export const MAX_NAME_LENGTH = 20;

/** Doporučený počet Zrádců podle SPEC: 1 při 4–7 hráčích, 2 při 8–10. */
export function recommendedTraitors(playerCount: number): number {
  return playerCount >= 8 ? 2 : 1;
}

export interface ServerStats {
  connected: number;
}

export interface ServerToClientEvents {
  stats: (stats: ServerStats) => void;
}

export interface ClientToServerEvents {
  ping: (reply: (serverTime: number) => void) => void;
}
