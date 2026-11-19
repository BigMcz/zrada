import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  MAX_PLAYERS,
  type ClientToServerEvents,
  type GuestView,
  type Intent,
  type Result,
  type ServerToClientEvents,
  type View,
} from '../shared/types.js';
import { apply, type Action, type Actor } from './game/engine.js';
import { cryptoRng, type Rng } from './game/random.js';
import { createGame, type GameState } from './game/state.js';
import { viewForModerator, viewForPlayer } from './game/views.js';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Kdo je na druhém konci připojení. Určuje ho server, nikdy ne obsah zprávy. */
type Session = { as: 'guest' } | { as: 'player'; playerId: string } | { as: 'moderator' };

export interface HubOptions {
  moderatorKey: string;
  /** Adresa pro hráče, kterou moderátor ukáže jako QR kód. */
  joinUrl: string;
  rng?: Rng;
}

const PLAYER_INTENTS = new Set(['ackRole', 'vote', 'nightPick', 'ghostTip']);
const MODERATOR_INTENTS = new Set(['kick', 'startGame', 'startVote', 'closeVote', 'startNight', 'endNight', 'newGame']);

/** Zpráva od klienta je nedůvěryhodná: propustí jen známé typy se správnými poli. */
export function parseIntent(raw: unknown): Intent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
  switch (r.type) {
    case 'ackRole':
    case 'startVote':
    case 'closeVote':
    case 'startNight':
    case 'endNight':
    case 'newGame':
      return { type: r.type };
    case 'vote':
    case 'nightPick':
    case 'ghostTip':
      return isId(r.targetId) ? { type: r.type, targetId: r.targetId } : null;
    case 'kick':
      return isId(r.playerId) ? { type: 'kick', playerId: r.playerId } : null;
    case 'startGame':
      return typeof r.traitorCount === 'number' ? { type: 'startGame', traitorCount: r.traitorCount } : null;
    default:
      return null;
  }
}

function keysMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Bezpečné zavolání odpovědi: klient ji nemusí poslat. */
function respond<T>(reply: unknown, value: T): void {
  if (typeof reply === 'function') reply(value);
}

export function attachGame(io: GameServer, options: HubOptions) {
  const rng = options.rng ?? cryptoRng;
  let state: GameState = createGame();
  const sessions = new Map<string, Session>();

  const connectedPlayerIds = () =>
    new Set([...sessions.values()].flatMap((s) => (s.as === 'player' ? [s.playerId] : [])));

  const guestView = (): GuestView => ({
    kind: 'guest',
    joinOpen: state.phase === 'LOBBY' && state.players.length < MAX_PLAYERS,
  });

  function viewFor(session: Session): View {
    if (session.as === 'moderator') {
      return { ...viewForModerator(state, connectedPlayerIds()), joinUrl: options.joinUrl };
    }
    if (session.as === 'player') return viewForPlayer(state, session.playerId) ?? guestView();
    return guestView();
  }

  /** Po každé změně dostane každé připojení svůj vlastní pohled. */
  function broadcast() {
    for (const socket of io.sockets.sockets.values()) {
      socket.emit('view', viewFor(sessions.get(socket.id) ?? { as: 'guest' }));
    }
  }

  function run(actor: Actor, action: Action): Result {
    const result = apply(state, actor, action, rng);
    if (!result.ok) return result;
    state = result.state;
    // Odebraní hráči se stávají hosty.
    for (const [id, s] of sessions) {
      if (s.as === 'player' && !state.players.some((p) => p.id === s.playerId)) sessions.set(id, { as: 'guest' });
    }
    broadcast();
    return { ok: true };
  }

  function newPlayerId(): string {
    let id: string;
    do id = randomBytes(4).toString('hex');
    while (state.players.some((p) => p.id === id));
    return id;
  }

  io.on('connection', (socket: GameSocket) => {
    sessions.set(socket.id, { as: 'guest' });
    socket.emit('view', guestView());

    socket.on('hello', (req, reply) => {
      const moderatorKey = typeof req?.moderatorKey === 'string' ? req.moderatorKey : undefined;
      const token = typeof req?.token === 'string' ? req.token : undefined;

      if (moderatorKey !== undefined) {
        if (keysMatch(moderatorKey, options.moderatorKey)) {
          sessions.set(socket.id, { as: 'moderator' });
          respond(reply, { as: 'moderator' });
        } else {
          sessions.set(socket.id, { as: 'guest' });
          respond(reply, { as: 'guest', forgetToken: false, error: 'Neplatný klíč moderátora.' });
        }
      } else if (token !== undefined) {
        const player = state.players.find((p) => p.token === token);
        if (player) {
          sessions.set(socket.id, { as: 'player', playerId: player.id });
          respond(reply, { as: 'player', playerId: player.id });
        } else {
          sessions.set(socket.id, { as: 'guest' });
          respond(reply, { as: 'guest', forgetToken: true });
        }
      } else {
        sessions.set(socket.id, { as: 'guest' });
        respond(reply, { as: 'guest', forgetToken: false });
      }
      broadcast();
    });

    socket.on('join', (name, reply) => {
      if (sessions.get(socket.id)?.as !== 'guest') {
        respond(reply, { ok: false, error: 'Už jsi ve hře.' });
        return;
      }
      if (typeof name !== 'string') {
        respond(reply, { ok: false, error: 'Zadej jméno.' });
        return;
      }
      const playerId = newPlayerId();
      const token = randomBytes(18).toString('base64url');
      const result = apply(state, { kind: 'guest' }, { type: 'join', name, playerId, token }, rng);
      if (!result.ok) {
        respond(reply, result);
        return;
      }
      state = result.state;
      sessions.set(socket.id, { as: 'player', playerId });
      // Nejdřív odpověď s tokenem, pak nový pohled; Socket.IO zachová pořadí.
      respond(reply, { ok: true, token, playerId });
      broadcast();
    });

    socket.on('intent', (raw, reply) => {
      const intent = parseIntent(raw);
      const session = sessions.get(socket.id) ?? { as: 'guest' };
      if (!intent) {
        respond(reply, { ok: false, error: 'Neplatný požadavek.' });
        return;
      }
      let actor: Actor;
      if (session.as === 'moderator' && MODERATOR_INTENTS.has(intent.type)) actor = { kind: 'moderator' };
      else if (session.as === 'player' && PLAYER_INTENTS.has(intent.type)) {
        actor = { kind: 'player', playerId: session.playerId };
      } else {
        respond(reply, { ok: false, error: 'Na tohle nemáš oprávnění.' });
        return;
      }
      respond(reply, run(actor, intent));
    });

    socket.on('disconnect', () => {
      sessions.delete(socket.id);
      broadcast();
    });
  });

  return {
    /** Jen pro testy a ladění. */
    getState: () => state,
  };
}
