import type { Role, Winner } from '../../shared/types.js';
import { pick, shuffle, type Rng } from './random.js';
import type { GameState, Player } from './state.js';

export function alive(state: GameState): Player[] {
  return state.players.filter((p) => p.status === 'ALIVE');
}

export function aliveWithRole(state: GameState, role: Role): Player[] {
  return alive(state).filter((p) => p.role === role);
}

/** Zrádců musí být aspoň jeden a méně než Věrných, jinak by hra skončila hned na začátku. */
export function isValidTraitorCount(playerCount: number, traitorCount: number): boolean {
  return Number.isInteger(traitorCount) && traitorCount >= 1 && traitorCount < playerCount - traitorCount;
}

/** Náhodně rozdá role: prvních `traitorCount` po zamíchání jsou Zrádci. */
export function assignRoles(players: Player[], traitorCount: number, rng: Rng): void {
  const order = shuffle(rng, players.map((p) => p.id));
  const traitors = new Set(order.slice(0, traitorCount));
  for (const p of players) p.role = traitors.has(p.id) ? 'TRAITOR' : 'LOYAL';
}

/**
 * Vyhodnocení kulatého stolu: nejvíc hlasů = vyhnán, remíza = los mezi remízujícími,
 * žádný hlas = nikdo. Počítají se jen hlasy živých hráčů pro živé hráče.
 */
export function tallyVotes(state: GameState, rng: Rng): string | null {
  const aliveIds = new Set(alive(state).map((p) => p.id));
  const counts = new Map<string, number>();
  for (const [voterId, targetId] of Object.entries(state.votes)) {
    if (!aliveIds.has(voterId) || !aliveIds.has(targetId)) continue;
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const max = Math.max(...counts.values());
  // Pořadí podle seznamu hráčů, aby los nezávisel na pořadí, v jakém hlasy přišly.
  const leaders = state.players.map((p) => p.id).filter((id) => counts.get(id) === max);
  return pick(rng, leaders);
}

/**
 * Vyhodnocení noci: volby živých Zrádců; při neshodě los mezi jejich volbami,
 * bez volby los mezi živými Věrnými.
 */
export function resolveNight(state: GameState, rng: Rng): string | null {
  const traitorIds = new Set(aliveWithRole(state, 'TRAITOR').map((p) => p.id));
  const loyalIds = new Set(aliveWithRole(state, 'LOYAL').map((p) => p.id));

  const picks = state.players
    .map((p) => p.id)
    .filter((id) => traitorIds.has(id))
    .map((id) => state.nightPicks[id])
    .filter((target): target is string => target !== undefined && loyalIds.has(target));

  if (picks.length > 0) return pick(rng, picks);
  const loyal = [...loyalIds];
  return loyal.length > 0 ? pick(rng, loyal) : null;
}

/** 0 živých Zrádců = vyhrávají Věrní; živých Zrádců ≥ živých Věrných = vyhrávají Zrádci. */
export function checkWinner(state: GameState): Winner | undefined {
  const traitors = aliveWithRole(state, 'TRAITOR').length;
  const loyal = aliveWithRole(state, 'LOYAL').length;
  if (traitors === 0) return 'LOYAL';
  if (traitors >= loyal) return 'TRAITOR';
  return undefined;
}
