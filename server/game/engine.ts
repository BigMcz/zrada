import { GHOST_TIP_PHASES, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, type Intent } from '../../shared/types.js';
import type { Rng } from './random.js';
import {
  assignRoles,
  currentRound,
  awardGhostTips,
  checkWinner,
  isTippingGhost,
  isValidTraitorCount,
  resolveNight,
  tallyVotes,
} from './rules.js';
import { fail, INVALID_TARGET, NOT_ALLOWED, RuleError, WRONG_PHASE } from './errors.js';
import { reduceMinigame, startNextDay } from '../minigames/framework.js';
import { STARTING_POT, type GameState, type Player } from './state.js';

/** Kdo akci posílá. Ověření (token, klíč moderátora) dělá server, ne jádro. */
export type Actor =
  | { kind: 'moderator' }
  | { kind: 'player'; playerId: string }
  | { kind: 'guest' }
  /** Server sám (časovače miniher). */
  | { kind: 'system' };

/** Akce, které jdou i během pauzy: pokračovat a zásahy, které hru neposouvají. */
const ALLOWED_WHILE_PAUSED = new Set<Action['type']>(['resume', 'setScreenMuted', 'setPhysicalMission', 'newPhone', 'removePlayer']);

/** Časy v ms od roku 1970 (> rok 2001); jen ty se při pokračování po pauze posunou. */
const TIMESTAMP_MIN = 1e12;

/** Posune všechny časové údaje (odpočty, doby, ťuknutí) o `ms` – po pauze běží odpočty dál od stejného místa. */
export function shiftTimes<T>(value: T, ms: number): T {
  if (typeof value === 'number') return (value >= TIMESTAMP_MIN ? value + ms : value) as T;
  if (Array.isArray(value)) return value.map((v) => shiftTimes(v, ms)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shiftTimes(v, ms)])) as T;
  }
  return value;
}

/**
 * Úmysly klientů a připojení nového hráče. Jádro je ověří a teprve pak změní stav.
 * U `join` vygeneruje id a token server, aby jádro zůstalo bez vedlejších efektů.
 */
export type Action =
  | Intent
  | { type: 'join'; name: string; playerId: string; token: string }
  /** Posun časovačů miniher; posílá jen server. */
  | { type: 'tick'; now: number; connected?: string[] }
  /** Nový telefon hráče: token vygeneruje server (Rozšíření 10). */
  | { type: 'newPhone'; playerId: string; token: string };

export type ApplyResult = { ok: true; state: GameState } | { ok: false; error: string };


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

/** Po každém vyřazení: buď konec hry, nebo pokračovat do `next`. */
function finishOr(state: GameState, next: GameState['phase']): void {
  const winner = checkWinner(state);
  if (winner) {
    state.winner = winner;
    state.phase = 'ENDED';
    // Hra skončila uprostřed kola: tipy duchů z tohoto kola se vyhodnotí hned.
    awardGhostTips(state);
  } else {
    state.phase = next;
  }
}

/**
 * Jediný vstup do herní logiky. Nemění předaný stav; vrátí nový, nebo chybu pro odesílatele.
 */
export function apply(prev: GameState, actor: Actor, action: Action, rng: Rng, now: number = Date.now()): ApplyResult {
  const state = structuredClone(prev);
  try {
    if (state.paused && !ALLOWED_WHILE_PAUSED.has(action.type)) fail('Hra je pozastavená.');
    if (!reduceMinigame(state, actor, action, rng, now)) reduce(state, actor, action, rng, now);
    return { ok: true, state };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

function reduce(state: GameState, actor: Actor, action: Action, rng: Rng, now: number): void {
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

    case 'pause': {
      requireModerator(actor);
      if (state.phase === 'LOBBY' || state.phase === 'ENDED' || state.paused) fail(WRONG_PHASE);
      state.paused = { since: now };
      return;
    }

    case 'resume': {
      requireModerator(actor);
      if (!state.paused) fail(WRONG_PHASE);
      // Odpočty miniher a předání štítu se posunou o délku pauzy.
      state.minigame = shiftTimes(state.minigame, Math.max(0, now - state.paused.since));
      state.paused = null;
      return;
    }

    case 'resetVotes': {
      requireModerator(actor);
      requirePhase(state, 'VOTE');
      state.votes = {};
      return;
    }

    case 'removePlayer': {
      // Hráč odešel: počítá se jako mrtvý, role zůstane tajná, stane se duchem.
      requireModerator(actor);
      requirePhase(state, 'ROLES', 'VOTE', 'VOTE_RESULT', 'NIGHT', 'MORNING');
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.status !== 'ALIVE') fail(INVALID_TARGET);
      player.status = 'LEFT';
      if (state.shieldHolderId === player.id) state.shieldHolderId = null;
      delete state.votes[player.id];
      for (const [voter, target] of Object.entries(state.votes)) if (target === player.id) delete state.votes[voter];
      delete state.nightPicks[player.id];
      delete state.nightTips[player.id];
      for (const [id, target] of Object.entries(state.nightPicks)) if (target === player.id) delete state.nightPicks[id];
      finishOr(state, state.phase);
      // Konec hry vyřazením: pauza už nemá smysl.
      if (state.phase === 'ENDED') state.paused = null;
      return;
    }

    case 'newPhone': {
      requireModerator(actor);
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) fail(INVALID_TARGET);
      player.token = action.token;
      return;
    }

    case 'setScreenMuted': {
      // Ztlumení velké obrazovky jde přepnout kdykoli.
      requireModerator(actor);
      state.settings.screenMuted = action.muted === true;
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
      requirePhase(state, 'ROLES', 'MORNING', 'MINIGAME');
      if (state.phase === 'MINIGAME') {
        if (state.minigame?.step !== 'DONE') fail(WRONG_PHASE);
        state.minigame = null;
      }
      // Přeskočení minihry ráno = nový den rovnou u kulatého stolu.
      if (state.phase === 'MORNING') startNextDay(state);
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

    case 'ghostTip': {
      if (!GHOST_TIP_PHASES.includes(state.phase)) fail(WRONG_PHASE);
      const ghost = requirePlayer(state, actor);
      if (!isTippingGhost(ghost)) fail(NOT_ALLOWED);
      const target = state.players.find((p) => p.id === action.targetId);
      if (!target || target.status !== 'ALIVE') fail(INVALID_TARGET);
      state.ghostTips[ghost.id] = target.id;
      return;
    }

    case 'endNight': {
      requireModerator(actor);
      requirePhase(state, 'NIGHT');
      let murderedId = resolveNight(state, rng);
      // Štít: vybraný hráč přežije a nikdo nezemře. Zrádci se nedozví víc než ostatní.
      if (murderedId && murderedId === state.shieldHolderId) {
        currentRound(state).shieldSaved = true;
        murderedId = null;
      }
      currentRound(state).murderedId = murderedId;
      // Štít platil jen pro tuto noc.
      state.shieldHolderId = null;
      if (murderedId) {
        state.players.find((p) => p.id === murderedId)!.status = 'MURDERED';
      }
      // Kolo končí: tipy duchů se vyhodnotí (tip platí podle role, i když tipovaný mezitím vypadl).
      awardGhostTips(state);
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
      state.ghostTips = {};
      state.ghostTipLog = [];
      state.points = [];
      state.minigame = null;
      state.minigamesPlayed = [];
      state.minigameMemory = {};
      state.shieldHolderId = null;
      state.pot = STARTING_POT;
      delete state.winner;
      state.paused = null;
      return;
    }
  }
}
