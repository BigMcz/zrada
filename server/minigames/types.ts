import type { Clue, MinigameId, Role } from '../../shared/types.js';
import type { Rng } from '../game/random.js';

/** Co modul o hře ví při startu. Role dostává, aby mohl Zrádcům dát výhodu. */
export interface MinigameContext {
  players: { id: string; role: Role; alive: boolean }[];
  /** Duchové, kteří v minihrách tipují (vyřazení Věrní). */
  ghosts: string[];
  pot: number;
  round: number;
  /** Paměť modulu z dřívějších dnů této hry. */
  memory: unknown;
}

export interface MinigameResult {
  /** Kdo vyhrál štít (před předáním), nebo nikdo. */
  shieldWinnerId: string | null;
  potDelta: number;
  /** Jedna věta pro výsledek, např. „Nejvyšší nabídku dala Jana“. */
  summary: string;
  clues: Clue[];
  /** Osobní body živých hráčů za tuto minihru (kromě +2 pro vítěze, ty přičte rámec). */
  playerPoints: Record<string, number>;
  /** Body duchů za tuto minihru; jen z veřejných výsledků. */
  ghostScores: Record<string, number>;
  /** Nová paměť modulu pro další dny. */
  memory?: unknown;
}

/**
 * Rozhraní minihry. Modul je čistý: nedělá síť ani časovače, čas dostává jako `now`.
 * Neplatná akce vrátí `null` (rámec ji odmítne) – nikdy nevyhazuje výjimku kvůli vstupu klienta.
 */
export interface MinigameModule<S = any> {
  id: MinigameId;
  meta: {
    name: string;
    minPlayers: number;
    rules: string[];
    /** Veřejné pravidlo o výhodě Zrádců. */
    traitorRule: string;
    /** Co v minihře dělají duchové (prázdné = jen sledují). */
    ghostRule?: string;
    /** Losuje se jen se zapnutým nastavením Fyzická mise v osudí. */
    optIn?: boolean;
  };
  /** Další podmínka losu (např. aukce potřebuje poklad aspoň 200). */
  canRun?(ctx: MinigameContext): boolean;

  init(ctx: MinigameContext, rng: Rng, now: number): S;
  /** Tajná karta; stejný počet řádků pro Věrného i Zrádce. */
  secretCard(state: S, playerId: string): string[];
  /** Spuštění hry po pravidlech (krok PLAY začíná). */
  start(state: S, now: number, rng: Rng): S;
  apply(state: S, playerId: string, input: unknown, now: number, rng: Rng): S | null;
  applyModerator?(state: S, input: unknown, now: number, rng: Rng): S | null;
  applyGhost?(state: S, ghostId: string, input: unknown, now: number): S | null;
  /** Posun časovačů. `connected` = připojení hráči (když ho server zná). */
  tick(state: S, now: number, rng: Rng, connected?: ReadonlySet<string>): S;
  isFinished(state: S): boolean;
  result(state: S): MinigameResult;
  /** Konec aktuálního odpočtu (pro telefon), nebo null. */
  endsAt(state: S): number | null;

  /** Pohled hráče: stejná pole pro Věrného i Zrádce. */
  viewForPlayer(state: S, playerId: string): unknown;
  viewForGhost?(state: S, ghostId: string): unknown;
  viewForModerator(state: S): unknown;
}
