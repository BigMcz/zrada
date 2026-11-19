// Pomůcky pro testy herního jádra.
import { recommendedTraitors, type Role } from '../../shared/types.js';
import { apply, type Action, type Actor } from './engine.js';
import { pick, seededRng, type Rng } from './random.js';
import { alive, aliveWithRole, isTippingGhost } from './rules.js';
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

/**
 * Celá hra s boty: všichni hrají náhodně, část hráčů občas nehlasuje nebo v noci nevybere.
 * `onState` dostane stav po každé akci (pro testy utajení). Vrací konečný stav.
 */
export function playRandomGame(playerCount: number, rng: Rng, onState: (s: GameState) => void = () => {}): GameState {
  const names = Array.from({ length: playerCount }, (_, i) => `Bot ${i + 1}`);
  let state = lobby(names);
  const step = (actor: Actor, action: Action) => {
    state = must(state, actor, action, rng);
    onState(state);
  };

  onState(state);
  step(MOD, { type: 'startGame', traitorCount: recommendedTraitors(playerCount) });
  for (const p of state.players) step(as(p.id), { type: 'ackRole' });
  step(MOD, { type: 'startVote' });

  // Duchové (vyřazení Věrní) občas tipnou náhodného živého hráče.
  const ghostsTip = () => {
    for (const g of state.players.filter(isTippingGhost)) {
      if (rng.int(3) === 0) continue;
      step(as(g.id), { type: 'ghostTip', targetId: pick(rng, alive(state)).id });
    }
  };

  let phases = 0;
  while (state.phase !== 'ENDED') {
    if (++phases > 200) throw new Error('Hra se zasekla');

    switch (state.phase) {
      case 'VOTE': {
        ghostsTip();
        for (const voter of alive(state)) {
          if (rng.int(5) === 0) continue;
          const targets = alive(state).filter((p) => p.id !== voter.id);
          step(as(voter.id), { type: 'vote', targetId: pick(rng, targets).id });
        }
        step(MOD, { type: 'closeVote' });
        break;
      }
      case 'VOTE_RESULT':
        step(MOD, { type: 'startNight' });
        break;
      case 'NIGHT': {
        ghostsTip();
        for (const p of alive(state)) {
          if (rng.int(4) === 0) continue;
          const targets =
            p.role === 'TRAITOR' ? aliveWithRole(state, 'LOYAL') : alive(state).filter((o) => o.id !== p.id);
          step(as(p.id), { type: 'nightPick', targetId: pick(rng, targets).id });
        }
        step(MOD, { type: 'endNight' });
        break;
      }
      case 'MORNING':
        step(MOD, { type: 'startVote' });
        break;
      default:
        throw new Error(`Nečekaná fáze ${state.phase}`);
    }
  }
  return state;
}
