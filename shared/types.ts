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

// ---------------------------------------------------------------------------
// Pohledy: jediné, co klient o hře dostane. Počítá je server v server/game/views.ts.
// ---------------------------------------------------------------------------

/** Výsledek jednoho kola; veřejná informace. */
export interface PublicRoundResult {
  round: number;
  /** Kdo byl vyhnán; null = nikdo nehlasoval. */
  banishedId: string | null;
  /** Kdo zemřel v noci; null = noc ještě neproběhla. */
  murderedId: string | null;
}

/** Hráč tak, jak ho vidí ostatní. */
export interface PublicPlayer {
  id: string;
  name: string;
  status: PlayerStatus;
  /** Jen u vyhnaných hráčů a na konci hry u všech. */
  revealedRole?: Role;
}

/** Řádek pod noční mřížkou; vypadá stejně pro obě role. */
export type NightHint =
  /** Zrádce s živým spojencem: koho volí spojenci. */
  | { kind: 'ALLY'; picks: { allyId: string; targetId: string | null }[] }
  /** Všichni ostatní: vlastní volba. */
  | { kind: 'OWN'; targetId: string | null };

export interface PlayerView {
  kind: 'player';
  phase: Phase;
  round: number;
  me: {
    id: string;
    name: string;
    status: PlayerStatus;
    /** Vlastní role; v lobby chybí. */
    role?: Role;
    sawRole: boolean;
  };
  /** Spoluzrádci; jen pro Zrádce, jinak prázdné. */
  allies: { id: string; name: string }[];
  /** Všichni hráči včetně mě, bez rolí (kromě odhalených). */
  players: PublicPlayer[];
  history: PublicRoundResult[];
  /** Pro koho jsem hlasoval v aktuálním kulatém stole. */
  myVote: string | null;
  /** Jen v noci. Mřížka je pro všechny stejná: živí hráči kromě mě. */
  night?: {
    /** Moje volba (Zrádce) nebo tip (Věrný). */
    myPick: string | null;
    /** Hráči v mřížce, na které klepnutí nic neudělá (spoluzrádci); u Věrného vždy prázdné. */
    blocked: string[];
    hint: NightHint;
  };
  winner?: Winner;
}

export interface ModeratorPlayer {
  id: string;
  name: string;
  role?: Role;
  status: PlayerStatus;
  sawRole: boolean;
  connected: boolean;
  /**
   * Zda hráč v aktuální fázi udělal, co má: v rolích viděl roli, u stolu hlasoval.
   * V noci chybí – moderátor vidí jen, zda už vybrali Zrádci.
   */
  done?: boolean;
}

export interface ModeratorView {
  kind: 'moderator';
  phase: Phase;
  round: number;
  traitorCount: number;
  recommendedTraitors: number;
  players: ModeratorPlayer[];
  history: PublicRoundResult[];
  /** Jen v noci: zda už všichni živí Zrádci vybrali oběť. */
  traitorsDone?: boolean;
  winner?: Winner;
  /** Adresa pro připojení hráčů (pro QR kód); doplní server. */
  joinUrl?: string;
}

/** Pohled zařízení, které ještě není ve hře. */
export interface GuestView {
  kind: 'guest';
  /** Zda se dá připojit (jen v lobby a když hra není plná). */
  joinOpen: boolean;
}

export type View = PlayerView | ModeratorView | GuestView;

// ---------------------------------------------------------------------------
// Zprávy mezi klientem a serverem
// ---------------------------------------------------------------------------

/** Úmysly, které klient posílá. Kdo je posílá, určí server podle připojení, ne podle zprávy. */
export type Intent =
  // hráč
  | { type: 'ackRole' }
  | { type: 'vote'; targetId: string }
  | { type: 'nightPick'; targetId: string }
  // moderátor
  | { type: 'kick'; playerId: string }
  | { type: 'startGame'; traitorCount: number }
  | { type: 'startVote' }
  | { type: 'closeVote' }
  | { type: 'startNight' }
  | { type: 'endNight' }
  | { type: 'newGame' };

export type Result = { ok: true } | { ok: false; error: string };

export interface HelloRequest {
  /** Token hráče uložený v prohlížeči. */
  token?: string;
  /** Klíč moderátora z adresy /moderator?key=… */
  moderatorKey?: string;
}

export type HelloResult =
  | { as: 'player'; playerId: string }
  | { as: 'moderator' }
  /** `forgetToken`: token už neplatí (hráč byl odebrán), klient ho má smazat. */
  | { as: 'guest'; forgetToken: boolean; error?: string };

export type JoinResult = { ok: true; token: string; playerId: string } | { ok: false; error: string };

export interface ServerToClientEvents {
  view: (view: View) => void;
}

export interface ClientToServerEvents {
  hello: (req: HelloRequest, reply: (res: HelloResult) => void) => void;
  join: (name: string, reply: (res: JoinResult) => void) => void;
  intent: (intent: Intent, reply: (res: Result) => void) => void;
}
