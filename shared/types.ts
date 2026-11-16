// Zprávy mezi serverem a klienty. Herní typy přibudou v kroku 2.

export interface ServerStats {
  connected: number;
}

export interface ServerToClientEvents {
  stats: (stats: ServerStats) => void;
}

export interface ClientToServerEvents {
  ping: (reply: (serverTime: number) => void) => void;
}
