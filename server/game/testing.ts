// Pomůcky pro testy herního jádra.
import type { Role } from '../../shared/types.js';
import { apply, type Action, type Actor } from './engine.js';
import { seededRng, type Rng } from './random.js';
import { createGame, type GameState } from './state.js';

export const MOD: Actor = { kind: 'moderator' };
export const GUEST: Actor = { kind: 'guest' };
export const as = (playerId: string): Actor => ({ kind: 'player', playerId });

/** Provede akci a selže, pokud ji jádro odmítlo. */
export function must(state: GameState, actor: Actor, action: Action, rng: Rng = seededRng(1)): GameState {
  const result = apply(state, actor, action, rng);
  if (!result.ok) throw new Error(`Akce ${action.type} odmítnuta: ${result.error}`);
  return result.state;
}

/** Vrátí chybovou hlášku; selže, pokud jádro akci přijalo. */
export function rejected(state: GameState, actor: Actor, action: Action, rng: Rng = seededRng(1)): string {
  const result = apply(state, actor, action, rng);
  if (result.ok) throw new Error(`Akce ${action.type} měla být odmítnuta`);
  return result.error;
}

/** Lobby s hráči p1…pN. */
export function lobby(names: string[]): GameState {
  let state = createGame();
  names.forEach((name, i) => {
    state = must(state, GUEST, { type: 'join', name, playerId: `p${i + 1}`, token: `t${i + 1}` });
  });
  return state;
}

/**
 * Hra po rozdání rolí s pevně danými Zrádci (místo losu), aby testy věděly, kdo je kdo.
 */
export function startedWith(playerCount: number, traitorIds: string[]): GameState {
  const names = Array.from({ length: playerCount }, (_, i) => `Hráč ${i + 1}`);
  const state = must(lobby(names), MOD, { type: 'startGame', traitorCount: traitorIds.length });
  for (const p of state.players) p.role = (traitorIds.includes(p.id) ? 'TRAITOR' : 'LOYAL') as Role;
  return state;
}
