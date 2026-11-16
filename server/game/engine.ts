import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, type Intent } from '../../shared/types.js';
import type { Rng } from './random.js';
import { assignRoles, checkWinner, isValidTraitorCount, resolveNight, tallyVotes } from './rules.js';
import type { GameState, Player } from './state.js';

/** Kdo akci posílá. Ověření (token, klíč moderátora) dělá server, ne jádro. */
export type Actor = { kind: 'moderator' } | { kind: 'player'; playerId: string } | { kind: 'guest' };

/**
 * Úmysly klientů a připojení nového hráče. Jádro je ověří a teprve pak změní stav.
 * U `join` vygeneruje id a token server, aby jádro zůstalo bez vedlejších efektů.
 */
export type Action = Intent | { type: 'join'; name: string; playerId: string; token: string };

export type ApplyResult = { ok: true; state: GameState } | { ok: false; error: string };

// Jedna hláška pro každý nepovolený cíl, aby chyba neprozradila, proč (např. že jde o spoluzrádce).
const INVALID_TARGET = 'Tohoto hráče nelze vybrat.';
const WRONG_PHASE = 'Teď to nejde.';
const NOT_ALLOWED = 'Na tohle nemáš oprávnění.';

class RuleError extends Error {}

function fail(message: string): never {
  throw new RuleError(message);
}

function requireModerator(actor: Actor): void {
  if (actor.kind !== 'moderator') fail(NOT_ALLOWED);
}

function requirePlayer(state: GameState, actor: Actor): Player {
  if (actor.kind !== 'player') fail(NOT_ALLOWED);
  const player = state.players.find((p) => p.id === actor.playerId);
  if (!player) fail(NOT_ALLOWED);
  return player;
}

function requireAlivePlayer(state: GameState, actor: Actor): Player {
  const player = requirePlayer(state, actor);
  if (player.status !== 'ALIVE') fail('Už nejsi ve hře.');
  return player;
}

function requirePhase(state: GameState, ...phases: GameState['phase'][]): void {
  if (!phases.includes(state.phase)) fail(WRONG_PHASE);
}

function aliveOther(state: GameState, self: Player, targetId: string): Player {
  const target = state.players.find((p) => p.id === targetId);
  if (!target || target.status !== 'ALIVE' || target.id === self.id) fail(INVALID_TARGET);
  return target;
}

function currentRound(state: GameState) {
  let entry = state.history.find((h) => h.round === state.round);
  if (!entry) {
    entry = { round: state.round, banishedId: null, murderedId: null };
    state.history.push(entry);
  }
  return entry;
}

/** Po každém vyřazení: buď konec hry, nebo pokračovat do `next`. */
function finishOr(state: GameState, next: GameState['phase']): void {
  const winner = checkWinner(state);
  if (winner) {
    state.winner = winner;
    state.phase = 'ENDED';
  } else {
    state.phase = next;
  }
}

/**
 * Jediný vstup do herní logiky. Nemění předaný stav; vrátí nový, nebo chybu pro odesílatele.
 */
export function apply(prev: GameState, actor: Actor, action: Action, rng: Rng): ApplyResult {
  const state = structuredClone(prev);
  try {
    reduce(state, actor, action, rng);
    return { ok: true, state };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

function reduce(state: GameState, actor: Actor, action: Action, rng: Rng): void {
  switch (action.type) {
    case 'join': {
      if (actor.kind !== 'guest') fail(NOT_ALLOWED);
      requirePhase(state, 'LOBBY');
      const name = action.name.trim().replace(/\s+/g, ' ');
      if (name.length === 0) fail('Zadej jméno.');
      if (name.length > MAX_NAME_LENGTH) fail(`Jméno může mít nejvýš ${MAX_NAME_LENGTH} znaků.`);
      if (state.players.some((p) => p.name.toLocaleLowerCase('cs') === name.toLocaleLowerCase('cs'))) {
        fail('Tohle jméno už ve hře někdo má.');
      }
      if (state.players.length >= MAX_PLAYERS) fail(`Hra je plná (nejvýš ${MAX_PLAYERS} hráčů).`);
      state.players.push({
        id: action.playerId,
        token: action.token,
        name,
        status: 'ALIVE',
        sawRole: false,
      });
      return;
    }

    case 'kick': {
      requireModerator(actor);
      requirePhase(state, 'LOBBY');
      state.players = state.players.filter((p) => p.id !== action.playerId);
      return;
    }

    case 'startGame': {
      requireModerator(actor);
      requirePhase(state, 'LOBBY');
      const n = state.players.length;
      if (n < MIN_PLAYERS) fail(`Ke hře jsou potřeba aspoň ${MIN_PLAYERS} hráči.`);
      if (!isValidTraitorCount(n, action.traitorCount)) {
        fail('Zrádců musí být aspoň jeden a méně než Věrných.');
      }
      state.traitorCount = action.traitorCount;
      assignRoles(state.players, action.traitorCount, rng);
      state.round = 1;
      state.phase = 'ROLES';
      return;
    }

    case 'ackRole': {
      const player = requirePlayer(state, actor);
      if (state.phase === 'LOBBY') fail(WRONG_PHASE);
      player.sawRole = true;
      return;
    }

    case 'startVote': {
      requireModerator(actor);
      requirePhase(state, 'ROLES', 'MORNING');
      if (state.phase === 'MORNING') state.round += 1;
      state.votes = {};
      state.phase = 'VOTE';
      return;
    }

    case 'vote': {
      requirePhase(state, 'VOTE');
      const voter = requireAlivePlayer(state, actor);
      const target = aliveOther(state, voter, action.targetId);
      state.votes[voter.id] = target.id;
      return;
    }

    case 'closeVote': {
      requireModerator(actor);
      requirePhase(state, 'VOTE');
      const banishedId = tallyVotes(state, rng);
      currentRound(state).banishedId = banishedId;
      if (banishedId) {
        state.players.find((p) => p.id === banishedId)!.status = 'BANISHED';
      }
      finishOr(state, 'VOTE_RESULT');
      return;
    }

    case 'startNight': {
      requireModerator(actor);
      requirePhase(state, 'VOTE_RESULT');
      state.nightPicks = {};
      state.nightTips = {};
      state.phase = 'NIGHT';
      return;
    }

    case 'nightPick': {
      requirePhase(state, 'NIGHT');
      const player = requireAlivePlayer(state, actor);
      const target = aliveOther(state, player, action.targetId);
      if (player.role === 'TRAITOR') {
        if (target.role === 'TRAITOR') fail(INVALID_TARGET);
        state.nightPicks[player.id] = target.id;
      } else {
        state.nightTips[player.id] = target.id;
      }
      return;
    }

    case 'endNight': {
      requireModerator(actor);
      requirePhase(state, 'NIGHT');
      const murderedId = resolveNight(state, rng);
      currentRound(state).murderedId = murderedId;
      if (murderedId) {
        state.players.find((p) => p.id === murderedId)!.status = 'MURDERED';
      }
      finishOr(state, 'MORNING');
      return;
    }

    case 'newGame': {
      requireModerator(actor);
      requirePhase(state, 'ENDED');
      for (const p of state.players) {
        delete p.role;
        p.status = 'ALIVE';
        p.sawRole = false;
      }
      state.phase = 'LOBBY';
      state.round = 0;
      state.traitorCount = 0;
      state.votes = {};
      state.nightPicks = {};
      state.nightTips = {};
      state.history = [];
      delete state.winner;
      return;
    }
  }
}
