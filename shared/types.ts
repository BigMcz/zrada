// Typy sdílené serverem a klientem. Pohledy (co klient dostane) přibudou v kroku 3.

export type Phase =
  | 'LOBBY' // hráči se připojují
  | 'ROLES' // hráči si prohlížejí role
  | 'MINIGAME' // minihra na začátku dne (Rozšíření 2)
  | 'VOTE' // kulatý stůl, hlasování
  | 'VOTE_RESULT' // výsledek hlasování
  | 'NIGHT' // Zrádci vybírají oběť, Věrní tipují
  | 'MORNING' // oznámení oběti
  | 'FINAL_VOTE' // finálové hlasování: ukončit hru, nebo vyhnat dalšího (Rozšíření 11)
  | 'ENDED'; // konec hry

export type Role = 'LOYAL' | 'TRAITOR';

/** LEFT = hráč odešel, moderátor ho vyřadil (Rozšíření 10); role se nezveřejní. */
export type PlayerStatus = 'ALIVE' | 'BANISHED' | 'MURDERED' | 'LEFT';

export type Winner = Role;

/** Důvod připsání osobních bodů; minihry přidají další. */
export type PointReason =
  | 'GHOST_TIP' // duch tipl Zrádce (vidět až na konci)
  | 'MINIGAME_WIN' // vítěz minihry, +2
  | 'MINIGAME' // další body hráčů z minihry (např. správná sázka v duelu)
  | 'GHOST_MINIGAME' // úloha ducha v minihře
  | 'POT'; // podíl z pokladu pro vítěze na konci hry (Rozšíření 11)

/** Fáze, ve kterých duch může tipovat Zrádce. */
export const GHOST_TIP_PHASES: readonly Phase[] = ['VOTE', 'VOTE_RESULT', 'NIGHT'];

/** Finále: Ukončit hru (věřím, že zbyli jen Věrní), nebo Vyhnat dalšího. */
export type FinalChoice = 'END' | 'CONTINUE';
/** Finále jde spustit, když zbývá nejvýš tolik živých. */
export const FINAL_MAX_ALIVE = 4;

/** Rozdělení pokladu na konci hry: kdo a kolik dostal. */
export interface PotShare {
  winners: string[];
  each: number;
}

/** Cena v rekapitulaci na konci hry (Rozšíření 11). */
export interface RecapAward {
  key: 'DETECTIVE' | 'DECEIVER' | 'SUSPECT';
  title: string;
  note: string;
  ids: string[];
  count: number;
}

/** Rekapitulace večera: časová osa kol a ceny (jen na konci hry). */
export interface Recap {
  rounds: { round: number; banishedId: string | null; murderedId: string | null; minigame: { name: string; shieldWinnerId: string | null } | null }[];
  awards: RecapAward[];
}

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 10;
export const MAX_NAME_LENGTH = 20;

/** Doporučený počet Zrádců podle SPEC: 1 při 4–7 hráčích, 2 při 8–10. */
export function recommendedTraitors(playerCount: number): number {
  return playerCount >= 8 ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Minihry (Rozšíření 2)
// ---------------------------------------------------------------------------

/** Id minihry; seznam v server/minigames/registry.ts. */
export type MinigameId = string;

/** Společné kroky každé minihry. */
export type MinigameStep = 'DRAW' | 'INTRO' | 'PLAY' | 'RESULT' | 'CLUE' | 'HANDOFF' | 'DONE';

/** Stopa: veřejná data z minihry, o kterých se mluví u kulatého stolu. */
export interface Clue {
  kind: 'table' | 'list';
  title: string;
  rows: { playerId?: string; label: string; value: string }[];
}

/** Veřejný záznam odehrané minihry v historii kola. */
export interface PublicMinigameRecord {
  id: MinigameId;
  name: string;
  summary: string;
  clues: Clue[];
  potDelta: number;
  /** Kdo štít vyhrál (veřejné); kdo ho nakonec drží, veřejné není. */
  shieldWinnerId: string | null;
  ghostWinnerIds: string[];
}

/** Minihra v pohledu hráče. Pro Věrného i Zrádce stejná pole stejných typů. */
export interface PlayerMinigameView {
  id: MinigameId | null;
  name: string;
  step: MinigameStep;
  rules: string[];
  traitorRule: string;
  /** Úloha duchů v této minihře, nebo null. */
  ghostRule: string | null;
  /** Tajná karta (jen živí hráči v krocích INTRO a dál); stejný počet řádků pro obě role. */
  secretCard: string[] | null;
  cardSeen: boolean;
  /** Pohled konkrétního modulu (jen PLAY a dál). */
  game: unknown;
  /** Konec aktuálního odpočtu v čase serveru, nebo null. */
  endsAt: number | null;
  /** Výsledek (RESULT a dál). */
  result: { summary: string; shieldWinnerId: string | null; potDelta: number; ghostWinnerIds: string[] } | null;
  clues: Clue[] | null;
  /** Předání štítu (jen HANDOFF, jen živí hráči). */
  handoff: { isWinner: boolean; myPick: string | null; endsAt: number } | null;
}

export interface ModeratorMinigameView {
  id: MinigameId | null;
  name: string;
  step: MinigameStep;
  rerollsLeft: number;
  /** Zda jde právě přelosovat (zbývá přelosování a je z čeho). */
  canReroll: boolean;
  /** Minihry, které jde právě ručně vybrat. */
  choices: { id: MinigameId; name: string }[];
  secretCardSeen: Record<string, boolean>;
  game: unknown;
  endsAt: number | null;
  result: PlayerMinigameView['result'];
  clues: Clue[] | null;
  handoff: { winnerId: string; picks: Record<string, string | null>; endsAt: number } | null;
}

// ---------------------------------------------------------------------------
// Pohledy: jediné, co klient o hře dostane. Počítá je server v server/game/views.ts.
// ---------------------------------------------------------------------------

/** Výsledek jednoho kola; veřejná informace. */
export interface PublicRoundResult {
  round: number;
  /** Kdo byl vyhnán; null = nikdo nehlasoval. */
  banishedId: string | null;
  /** Kdo zemřel v noci; null = noc ještě neproběhla, nebo nikdo nezemřel (štít). */
  murderedId: string | null;
  /** Minihra tohoto dne, pokud se hrála. */
  minigame?: PublicMinigameRecord;
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

/** Řádek žebříčku duchů. */
export interface GhostRank {
  id: string;
  /** Body za tipy; na telefonech jen na konci hry, moderátor vždy. */
  points: number;
  /** Kolik kol duch tipoval. */
  tipsGiven: number;
  /** false = vyhnaný Zrádce, netipuje. */
  canTip: boolean;
}

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
    /**
     * Štít pro dnešní noc z mého pohledu: mám ho já / má ho někdo jiný / nikdo.
     * Pole má každý hráč, ukazuje se jen na podržení pečeti.
     */
    shield: 'MINE' | 'OTHER' | 'NONE';
  };
  /** Společný poklad. */
  pot: number;
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
  /** Moderátor hru pozastavil (Rozšíření 10). */
  paused: boolean;
  /** Hra je ve finále (Rozšíření 11). */
  inFinale: boolean;
  /** Moje volba ve finálovém hlasování. */
  myFinalChoice: FinalChoice | null;
  /** Rozdělení pokladu (jen na konci hry). */
  potShare: PotShare | null;
  /** Rekapitulace (jen na konci hry). */
  recap: Recap | null;
  /** Moje osobní body, které už smím vidět (body za tipy duchů až na konci hry). */
  myPoints: number;
  /** Jen pro vyřazené hráče (duchy). */
  ghost?: {
    /** false = vyhnaný Zrádce, jen sleduje. */
    canTip: boolean;
    /** Zda se teď dá tipovat (kulatý stůl až noc). */
    tipOpen: boolean;
    /** Můj tip v aktuálním kole. */
    myTip: string | null;
    tipsGiven: number;
  };
  /** Žebříček duchů; jen na konci hry. */
  ghostBoard?: GhostRank[];
  /** Žebříček všech hráčů podle osobních bodů; jen na konci hry, když se hrály minihry nebo padly body. */
  playerBoard?: { id: string; points: number }[];
  /** Jen ve fázi MINIGAME. */
  minigame?: PlayerMinigameView;
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

export interface ModeratorGhost extends GhostRank {
  /** Koho duch tipuje v aktuálním kole. */
  tip: string | null;
  /** Zda tip míří na Zrádce (moderátor role zná). */
  tipOnTraitor: boolean | null;
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
  /** Žebříček duchů s aktuálními tipy; moderátor ho vidí po celou hru. */
  ghosts: ModeratorGhost[];
  pot: number;
  /** Osobní body všech hráčů včetně skrytých (moderátor vidí vše). */
  playerPoints: Record<string, number>;
  /** Kdo drží štít pro dnešní noc. */
  shieldHolderId: string | null;
  /** Zda jsou minihry zapnuté (přepínač v lobby). */
  minigamesEnabled: boolean;
  /** Fyzická mise v osudí (přepínač v konzoli, kdykoli). */
  physicalMission: boolean;
  /** Zvuky velké obrazovky ztlumené. */
  screenMuted: boolean;
  /** Hra je pozastavená. */
  paused: boolean;
  inFinale: boolean;
  /** Ráno při 4 a méně živých: jde spustit finále. */
  finalAvailable: boolean;
  /** Volby ve finálovém hlasování (moderátor vidí vše). */
  finalVotes: Record<string, FinalChoice>;
  potShare: PotShare | null;
  recap: Recap | null;
  /** Minihry, které jde dnes losovat; prázdné = jen Přeskočit. */
  minigameAvailable: boolean;
  /** Jen ve fázi MINIGAME. */
  minigame?: ModeratorMinigameView;
  winner?: Winner;
  /** Adresa pro připojení hráčů (pro QR kód); doplní server. */
  joinUrl?: string;
}

/** Minihra na velké obrazovce: jen veřejné údaje (Rozšíření 9). */
export interface ScreenMinigameView {
  id: MinigameId | null;
  name: string;
  step: MinigameStep;
  rules: string[];
  traitorRule: string;
  ghostRule: string | null;
  /** Názvy her v osudí (pro animaci losu, jen v kroku DRAW). */
  candidates: string[];
  /** Scéna modulu (Rozšíření 9, krok O2); null, když ji modul nemá. */
  game: unknown;
  endsAt: number | null;
  result: PlayerMinigameView['result'];
  clues: Clue[] | null;
}

/** Pohled velké obrazovky: jen veřejné informace, nic se na ní neovládá (Rozšíření 9). */
export interface ScreenView {
  kind: 'screen';
  phase: Phase;
  round: number;
  pot: number;
  /** Hráči bez rolí (kromě vyhnaných a všech na konci hry). */
  players: PublicPlayer[];
  /** Adresa pro připojení (jen v lobby). */
  joinUrl: string | null;
  /** Kulatý stůl: kolik živých už hlasovalo a kolik jich je. */
  votesCast: number | null;
  voters: number | null;
  /** Po hlasování: počty hlasů u jednotlivých hráčů, bez toho, kdo hlasoval. */
  tally: { id: string; votes: number }[] | null;
  /** Vyhnaný v tomto kole (po hlasování), nebo null. */
  banishedId: string | null;
  /** Ráno: oběť noci, nebo null (nikdo nezemřel). */
  murderedId: string | null;
  /** Žebříček duchů jen s viditelnými body (body za tipy až na konci hry). */
  ghostBoard: { id: string; points: number }[];
  minigame: ScreenMinigameView | null;
  winner: Winner | null;
  /** Moderátor obrazovku ztlumil. */
  muted: boolean;
  /** Hra je pozastavená. */
  paused: boolean;
  inFinale: boolean;
  /** Finálové hlasování: kolik živých už hlasovalo a kolik jich je. */
  finalVotesCast: number | null;
  finalVoters: number | null;
  potShare: PotShare | null;
  recap: Recap | null;
}

/** Pohled zařízení, které ještě není ve hře. */
export interface GuestView {
  kind: 'guest';
  /** Zda se dá připojit (jen v lobby a když hra není plná). */
  joinOpen: boolean;
}

export type View = PlayerView | ModeratorView | GuestView | ScreenView;

// ---------------------------------------------------------------------------
// Zprávy mezi klientem a serverem
// ---------------------------------------------------------------------------

/** Úmysly, které klient posílá. Kdo je posílá, určí server podle připojení, ne podle zprávy. */
export type Intent =
  // hráč
  | { type: 'ackRole' }
  | { type: 'vote'; targetId: string }
  | { type: 'nightPick'; targetId: string }
  | { type: 'ghostTip'; targetId: string }
  | { type: 'ackSecretCard' }
  | { type: 'minigameInput'; payload: unknown }
  | { type: 'handoffPick'; targetId: string | null }
  // moderátor
  | { type: 'kick'; playerId: string }
  | { type: 'startGame'; traitorCount: number }
  | { type: 'startVote' }
  | { type: 'closeVote' }
  | { type: 'startNight' }
  | { type: 'endNight' }
  | { type: 'newGame' }
  | { type: 'setMinigames'; enabled: boolean }
  | { type: 'setPhysicalMission'; enabled: boolean }
  | { type: 'setScreenMuted'; muted: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'resetVotes' }
  | { type: 'removePlayer'; playerId: string }
  | { type: 'startFinal' }
  | { type: 'closeFinalVote' }
  | { type: 'finalVote'; choice: FinalChoice }
  | { type: 'drawMinigame' }
  | { type: 'rerollMinigame' }
  | { type: 'chooseMinigame'; id: MinigameId }
  | { type: 'confirmMinigame' }
  | { type: 'startMinigame' }
  | { type: 'minigameModerator'; payload: unknown }
  | { type: 'skipMinigame' }
  | { type: 'showClue' }
  | { type: 'afterClue' };

export type Result = { ok: true } | { ok: false; error: string };

export interface HelloRequest {
  /** Token hráče uložený v prohlížeči. */
  token?: string;
  /** Klíč moderátora z adresy /moderator?key=… */
  moderatorKey?: string;
  /** Velká obrazovka (/obrazovka), bez klíče. */
  screen?: boolean;
}

export type HelloResult =
  | { as: 'player'; playerId: string }
  | { as: 'moderator' }
  | { as: 'screen' }
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
  /** Čas serveru pro odpočty miniher (klient si spočítá rozdíl hodin). */
  time: (reply: (serverNow: number) => void) => void;
  /** Moderátor: nový odkaz pro hráče na jiném telefonu; starý telefon přestane platit (Rozšíření 10). */
  newPhone: (playerId: string, reply: (res: NewPhoneResult) => void) => void;
}

export type NewPhoneResult = { ok: true; url: string } | { ok: false; error: string };
