import type { MinigameId } from '../../shared/types.js';
import type { Action, Actor } from '../game/engine.js';
import { fail, INVALID_TARGET, NOT_ALLOWED, WRONG_PHASE } from '../game/errors.js';
import { pick, type Rng } from '../game/random.js';
import { alive, currentRound, isTippingGhost } from '../game/rules.js';
import type { GameState, Player } from '../game/state.js';
import { allMinigames, getMinigame } from './registry.js';
import type { MinigameContext, MinigameModule, MinigameResult } from './types.js';

/** Délka tajného předání štítu. */
export const HANDOFF_MS = 20_000;
/** Přelosování za den. */
export const REROLLS_PER_DAY = 1;

/** Akce, které obsluhuje rámec miniher (ostatní řeší engine). */
export const MINIGAME_ACTIONS = new Set<Action['type']>([
  'setMinigames',
  'drawMinigame',
  'rerollMinigame',
  'chooseMinigame',
  'confirmMinigame',
  'ackSecretCard',
  'startMinigame',
  'minigameInput',
  'minigameModerator',
  'skipMinigame',
  'showClue',
  'afterClue',
  'handoffPick',
  'tick',
]);

export function minigameContext(state: GameState): MinigameContext {
  return {
    players: state.players
      .filter((p) => p.role)
      .map((p) => ({ id: p.id, role: p.role!, alive: p.status === 'ALIVE' })),
    ghosts: state.players.filter(isTippingGhost).map((p) => p.id),
    pot: state.pot,
    round: state.round,
    memory: undefined,
  };
}

function contextFor(state: GameState, id: MinigameId): MinigameContext {
  return { ...minigameContext(state), memory: state.minigameMemory[id] };
}

/** Minihra se dnes dá hrát: dost živých hráčů a splněná vlastní podmínka. */
function fits(state: GameState, module: MinigameModule): boolean {
  return module.meta.minPlayers <= alive(state).length && (module.canRun?.(contextFor(state, module.id)) ?? true);
}

/** Kandidáti losu: ještě nehrané; když už se hrály všechny, cokoli kromě včerejší. */
export function drawCandidates(state: GameState): MinigameModule[] {
  const ok = allMinigames().filter((m) => fits(state, m));
  const fresh = ok.filter((m) => !state.minigamesPlayed.includes(m.id));
  if (fresh.length > 0) return fresh;
  const last = state.minigamesPlayed.at(-1);
  return ok.filter((m) => m.id !== last);
}

/** Minihry, které může moderátor vybrat ručně (i už hrané). */
export function manualChoices(state: GameState): MinigameModule[] {
  return allMinigames().filter((m) => fits(state, m));
}

/** Začátek nového dne (ráno → další kolo): štít z minulé noci mizí. */
export function startNextDay(state: GameState): void {
  state.round += 1;
  state.shieldHolderId = null;
}

function requireModerator(actor: Actor): void {
  if (actor.kind !== 'moderator') fail(NOT_ALLOWED);
}

function requireStep(state: GameState, ...steps: string[]) {
  if (state.phase !== 'MINIGAME' || !state.minigame || !steps.includes(state.minigame.step)) fail(WRONG_PHASE);
  return state.minigame;
}

function moduleOf(state: GameState): MinigameModule {
  const id = state.minigame?.id;
  const module = id ? getMinigame(id) : undefined;
  if (!module) fail(WRONG_PHASE);
  return module;
}

function playerOf(state: GameState, actor: Actor): Player {
  if (actor.kind !== 'player') fail(NOT_ALLOWED);
  const player = state.players.find((p) => p.id === actor.playerId);
  if (!player) fail(NOT_ALLOWED);
  return player;
}

/** Vítězové mezi duchy: nejvyšší kladné skóre, při shodě všichni. */
export function ghostWinners(result: MinigameResult): string[] {
  const scores = Object.entries(result.ghostScores).filter(([, s]) => s > 0);
  if (scores.length === 0) return [];
  const best = Math.max(...scores.map(([, s]) => s));
  return scores.filter(([, s]) => s === best).map(([id]) => id);
}

/**
 * Hra skončila: uloží výsledek a veřejný záznam do historie.
 * Dopady na poklad a body doplní krok M2 (applyResultEffects).
 */
function finishIfDone(state: GameState): void {
  const active = state.minigame!;
  const module = moduleOf(state);
  if (active.step !== 'PLAY' || !module.isFinished(active.state)) return;

  const result = module.result(active.state);
  active.result = result;
  active.step = 'RESULT';
  state.minigamesPlayed.push(module.id);
  if (result.memory !== undefined) state.minigameMemory[module.id] = result.memory;
  currentRound(state).minigame = {
    id: module.id,
    name: module.meta.name,
    summary: result.summary,
    clues: result.clues,
    potDelta: result.potDelta,
    shieldWinnerId: result.shieldWinnerId,
    ghostWinnerIds: ghostWinners(result),
  };
  applyResultEffects(state, result);
}

/** Dopady výsledku na poklad a body (krok M2). */
export function applyResultEffects(_state: GameState, _result: MinigameResult): void {}

function finishHandoff(state: GameState): void {
  const active = state.minigame!;
  const handoff = active.handoff!;
  const choice = handoff.picks[handoff.winnerId];
  state.shieldHolderId = choice ?? handoff.winnerId;
  active.step = 'DONE';
}

/** Obsluha akcí miniher. Vrací false, pokud akce minihrám nepatří. */
export function reduceMinigame(state: GameState, actor: Actor, action: Action, rng: Rng, now: number): boolean {
  switch (action.type) {
    case 'setMinigames': {
      requireModerator(actor);
      if (state.phase !== 'LOBBY') fail(WRONG_PHASE);
      state.settings.minigamesEnabled = action.enabled === true;
      return true;
    }

    case 'drawMinigame': {
      requireModerator(actor);
      if (state.phase !== 'ROLES' && state.phase !== 'MORNING') fail(WRONG_PHASE);
      if (!state.settings.minigamesEnabled) fail('Minihry jsou vypnuté.');
      if (state.phase === 'MORNING') startNextDay(state);
      const candidates = drawCandidates(state);
      if (candidates.length === 0) fail('Dnes se nedá hrát žádná minihra. Přeskoč ji.');
      state.phase = 'MINIGAME';
      state.minigame = {
        id: pick(rng, candidates).id,
        step: 'DRAW',
        rerollsLeft: REROLLS_PER_DAY,
        secretCardSeen: {},
        state: null,
        result: null,
        handoff: null,
      };
      return true;
    }

    case 'rerollMinigame': {
      requireModerator(actor);
      const active = requireStep(state, 'DRAW');
      if (active.rerollsLeft <= 0) fail('Přelosovat jde jen jednou za den.');
      const others = drawCandidates(state).filter((m) => m.id !== active.id);
      if (others.length === 0) fail('Není z čeho přelosovat.');
      active.id = pick(rng, others).id;
      active.rerollsLeft -= 1;
      return true;
    }

    case 'chooseMinigame': {
      requireModerator(actor);
      const active = requireStep(state, 'DRAW');
      const module = manualChoices(state).find((m) => m.id === action.id);
      if (!module) fail('Tuhle minihru teď nejde hrát.');
      active.id = module.id;
      return true;
    }

    case 'confirmMinigame': {
      requireModerator(actor);
      const active = requireStep(state, 'DRAW');
      const module = moduleOf(state);
      active.state = module.init(contextFor(state, module.id), rng, now);
      active.step = 'INTRO';
      return true;
    }

    case 'ackSecretCard': {
      const active = requireStep(state, 'INTRO', 'PLAY');
      const player = playerOf(state, actor);
      if (player.status !== 'ALIVE') fail(NOT_ALLOWED);
      active.secretCardSeen[player.id] = true;
      return true;
    }

    case 'startMinigame': {
      requireModerator(actor);
      const active = requireStep(state, 'INTRO');
      active.state = moduleOf(state).start(active.state, now, rng);
      active.step = 'PLAY';
      finishIfDone(state);
      return true;
    }

    case 'minigameInput': {
      const active = requireStep(state, 'PLAY');
      const module = moduleOf(state);
      const player = playerOf(state, actor);
      let next: unknown;
      if (player.status === 'ALIVE') {
        next = module.apply(active.state, player.id, action.payload, now, rng);
      } else if (isTippingGhost(player) && module.applyGhost) {
        next = module.applyGhost(active.state, player.id, action.payload, now);
      } else {
        fail(NOT_ALLOWED);
      }
      if (next === null) fail(WRONG_PHASE);
      active.state = next;
      finishIfDone(state);
      return true;
    }

    case 'minigameModerator': {
      requireModerator(actor);
      const active = requireStep(state, 'PLAY');
      const module = moduleOf(state);
      const next = module.applyModerator?.(active.state, action.payload, now, rng) ?? null;
      if (next === null) fail(WRONG_PHASE);
      active.state = next;
      finishIfDone(state);
      return true;
    }

    case 'skipMinigame': {
      requireModerator(actor);
      const active = requireStep(state, 'DRAW', 'INTRO', 'PLAY');
      // Žádný štít, žádné body, minihra se nepočítá jako odehraná.
      active.step = 'DONE';
      active.result = null;
      return true;
    }

    case 'showClue': {
      requireModerator(actor);
      requireStep(state, 'RESULT').step = 'CLUE';
      return true;
    }

    case 'afterClue': {
      requireModerator(actor);
      const active = requireStep(state, 'CLUE');
      const winnerId = active.result?.shieldWinnerId ?? null;
      const winner = state.players.find((p) => p.id === winnerId);
      if (winner && winner.status === 'ALIVE') {
        active.handoff = { winnerId: winner.id, picks: {}, endsAt: now + HANDOFF_MS };
        active.step = 'HANDOFF';
      } else {
        active.step = 'DONE';
      }
      return true;
    }

    case 'handoffPick': {
      const active = requireStep(state, 'HANDOFF');
      const player = playerOf(state, actor);
      if (player.status !== 'ALIVE') fail(NOT_ALLOWED);
      if (action.targetId !== null) {
        const target = state.players.find((p) => p.id === action.targetId);
        if (!target || target.status !== 'ALIVE') fail(INVALID_TARGET);
      }
      // Vítěz, který vybere sám sebe, si štít ponechává.
      active.handoff!.picks[player.id] = action.targetId === player.id ? null : action.targetId;
      return true;
    }

    case 'tick': {
      if (actor.kind !== 'system') fail(NOT_ALLOWED);
      if (state.phase !== 'MINIGAME' || !state.minigame) return true;
      const active = state.minigame;
      if (active.step === 'PLAY') {
        active.state = moduleOf(state).tick(active.state, action.now, rng);
        finishIfDone(state);
      } else if (active.step === 'HANDOFF' && action.now >= active.handoff!.endsAt) {
        finishHandoff(state);
      }
      return true;
    }

    default:
      return false;
  }
}
