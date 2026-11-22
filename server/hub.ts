import { randomBytes, timingSafeEqual } from 'node:crypto';
import { isCrest } from '../shared/crests.js';
import { isTheme } from '../shared/themes.js';
import type { Server, Socket } from 'socket.io';
import {
  MAX_PLAYERS,
  REACTION_COOLDOWN_MS,
  REACTIONS,
  type Reaction,
  type ClientToServerEvents,
  type GuestView,
  type Intent,
  type Result,
  type ServerToClientEvents,
  type View,
} from '../shared/types.js';
import { botAction, BOT_DELAY_MS, nextBotName } from './bots.js';
import { createHallOfFame, hallBoards, type HallOfFame } from './hallOfFame.js';
import { apply, type Action, type Actor } from './game/engine.js';
import { cryptoRng, type Rng } from './game/random.js';
import { createGame, type GameState } from './game/state.js';
import { canReact, viewForModerator, viewForPlayer, viewForScreen } from './game/views.js';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Kdo je na druhém konci připojení. Určuje ho server, nikdy ne obsah zprávy. */
type Session = { as: 'guest' } | { as: 'player'; playerId: string } | { as: 'moderator' } | { as: 'screen' };

export interface HubOptions {
  moderatorKey: string;
  /** Adresa pro hráče, kterou moderátor ukáže jako QR kód. */
  joinUrl: string;
  rng?: Rng;
  /** Prodleva botů před tahem (ms); testy ji zkracují. */
  botDelay?: [number, number];
  /** Stav načtený po restartu serveru (Rozšíření 10); jinak nová hra. */
  initialState?: GameState;
  /** Volá se po každé změně stavu (ukládání do souboru). */
  onChange?: (state: GameState) => void;
  /** Síň slávy (Rozšíření 16); bez ní se nic nezapisuje. */
  hallOfFame?: HallOfFame;
}

const PLAYER_INTENTS = new Set(['ackRole', 'finalVote', 'vote', 'nightPick', 'ghostTip', 'ackSecretCard', 'minigameInput', 'handoffPick', 'setCrest']);
const MODERATOR_INTENTS = new Set([
  'kick',
  'addBot',
  'startGame',
  'startVote',
  'closeVote',
  'startNight',
  'endNight',
  'newGame',
  'setMinigames',
  'setPhysicalMission',
  'setScreenMuted',
  'setPublicVotes',
  'setReactions',
  'setTheme',
  'setQuizSets',
  'pause',
  'resume',
  'resetVotes',
  'removePlayer',
  'startFinal',
  'closeFinalVote',
  'drawMinigame',
  'rerollMinigame',
  'chooseMinigame',
  'confirmMinigame',
  'startMinigame',
  'minigameModerator',
  'skipMinigame',
  'showClue',
  'afterClue',
]);

/** Data minihry od klienta: jen JSON rozumné velikosti (moduly je pak samy ověří). */
function isSmallJson(v: unknown): boolean {
  try {
    const json = JSON.stringify(v);
    return json !== undefined && json.length <= 2000;
  } catch {
    return false;
  }
}

/** Jak často server posouvá časovače miniher. */
const TICK_MS = 200;

/** Zpráva od klienta je nedůvěryhodná: propustí jen známé typy se správnými poli. */
export function parseIntent(raw: unknown): Intent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
  switch (r.type) {
    case 'ackRole':
    case 'ackSecretCard':
    case 'drawMinigame':
    case 'rerollMinigame':
    case 'confirmMinigame':
    case 'startMinigame':
    case 'skipMinigame':
    case 'showClue':
    case 'afterClue':
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
    case 'removePlayer':
      return isId(r.playerId) ? { type: 'removePlayer', playerId: r.playerId } : null;
    case 'addBot':
    case 'pause':
    case 'resume':
    case 'resetVotes':
    case 'startFinal':
    case 'closeFinalVote':
      return { type: r.type };
    case 'finalVote':
      return r.choice === 'END' || r.choice === 'CONTINUE' ? { type: 'finalVote', choice: r.choice } : null;
    case 'minigameInput':
    case 'minigameModerator':
      return 'payload' in r && isSmallJson(r.payload) ? { type: r.type, payload: r.payload } : null;
    case 'handoffPick':
      return r.targetId === null || isId(r.targetId) ? { type: 'handoffPick', targetId: r.targetId as string | null } : null;
    case 'setCrest':
      return isCrest(r.crest) ? { type: 'setCrest', crest: r.crest } : null;
    case 'chooseMinigame':
      return isId(r.id) ? { type: 'chooseMinigame', id: r.id } : null;
    case 'setMinigames':
      return typeof r.enabled === 'boolean' ? { type: 'setMinigames', enabled: r.enabled } : null;
    case 'setPhysicalMission':
      return typeof r.enabled === 'boolean' ? { type: 'setPhysicalMission', enabled: r.enabled } : null;
    case 'setScreenMuted':
      return typeof r.muted === 'boolean' ? { type: 'setScreenMuted', muted: r.muted } : null;
    case 'setQuizSets':
      return r.sets === null || (Array.isArray(r.sets) && r.sets.every((x) => typeof x === 'string')) ? { type: 'setQuizSets', sets: r.sets as string[] | null } : null;
    case 'setTheme':
      return isTheme(r.theme) ? { type: 'setTheme', theme: r.theme } : null;
    case 'setReactions':
      return typeof r.enabled === 'boolean' ? { type: 'setReactions', enabled: r.enabled } : null;
    case 'setPublicVotes':
      return typeof r.enabled === 'boolean' ? { type: 'setPublicVotes', enabled: r.enabled } : null;
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
  let state: GameState = options.initialState ?? createGame();
  /** Nový stav: uložit (obnova po pádu) a pak rozeslat pohledy. */
  const hall = options.hallOfFame ?? createHallOfFame(null);
  const commit = (next: GameState) => {
    // Dohraná hra se zapíše do síně slávy jednou, při přechodu do konce hry.
    if (state.phase !== 'ENDED' && next.phase === 'ENDED') hall.record(next);
    state = next;
    options.onChange?.(state);
  };
  const sessions = new Map<string, Session>();
  const lastReaction = new Map<string, number>();
  let reactionKey = 0;

  // Boti jsou „připojení“ pořád: minihry na ně čekají stejně jako na lidi.
  const connectedPlayerIds = () =>
    new Set([
      ...[...sessions.values()].flatMap((s) => (s.as === 'player' ? [s.playerId] : [])),
      ...state.players.filter((p) => p.bot).map((p) => p.id),
    ]);

  const guestView = (): GuestView => ({
    kind: 'guest',
    joinOpen: state.phase === 'LOBBY' && state.players.length < MAX_PLAYERS,
    theme: state.settings.theme,
  });

  function viewFor(session: Session): View {
    if (session.as === 'moderator') {
      return { ...viewForModerator(state, connectedPlayerIds()), joinUrl: options.joinUrl, hallOfFameSize: Object.keys(hall.entries()).length };
    }
    if (session.as === 'player') return viewForPlayer(state, session.playerId) ?? guestView();
    if (session.as === 'screen') {
      return { ...viewForScreen(state, options.joinUrl), hallOfFame: state.phase === 'LOBBY' ? hallBoards(hall.entries()) : [] };
    }
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
    commit(result.state);
    // Odebraní hráči se stávají hosty.
    for (const [id, s] of sessions) {
      if (s.as === 'player' && !state.players.some((p) => p.id === s.playerId)) sessions.set(id, { as: 'guest' });
    }
    broadcast();
    return { ok: true };
  }

  // Časovače miniher: server posouvá čas a pohledy rozešle, jen když se něco změnilo.
  const timer = setInterval(() => {
    if (state.phase !== 'MINIGAME') return;
    const result = apply(state, { kind: 'system' }, { type: 'tick', now: Date.now(), connected: [...connectedPlayerIds()] }, rng);
    if (!result.ok) return;
    const changed = JSON.stringify(result.state.minigame) !== JSON.stringify(state.minigame);
    // Ukládá se a rozesílá jen skutečná změna, ne každý tik.
    if (changed) {
      commit(result.state);
      broadcast();
    } else {
      state = result.state;
    }
  }, TICK_MS);
  timer.unref();

  // Boti (Rozšíření 13): každý bot má naplánovaný čas dalšího tahu; tah se spočítá až v tu chvíli.
  const botDelay = options.botDelay ?? BOT_DELAY_MS;
  const botDue = new Map<string, number>();
  const botTimer = setInterval(() => {
    const now = Date.now();
    for (const bot of state.players.filter((p) => p.bot)) {
      const action = botAction(state, bot.id, rng, now);
      if (!action) {
        botDue.delete(bot.id);
        continue;
      }
      const due = botDue.get(bot.id);
      if (due === undefined) {
        botDue.set(bot.id, now + botDelay[0] + rng.int(Math.max(1, botDelay[1] - botDelay[0])));
      } else if (now >= due) {
        botDue.delete(bot.id);
        run({ kind: 'player', playerId: bot.id }, action);
      }
    }
  }, 100);
  botTimer.unref();

  /** Přidání bota v lobby: id, token a jméno „Bot N“ vygeneruje server. */
  function addBot(): Result {
    const result = apply(state, { kind: 'guest' }, { type: 'join', name: nextBotName(state), playerId: newPlayerId(), token: randomBytes(18).toString('base64url'), bot: true }, rng);
    if (!result.ok) return result;
    commit(result.state);
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

      if (req?.screen === true) {
        sessions.set(socket.id, { as: 'screen' });
        respond(reply, { as: 'screen' });
      } else if (moderatorKey !== undefined) {
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
      commit(result.state);
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
      respond(reply, intent.type === 'addBot' ? addBot() : run(actor, intent));
    });

    // Reakce (Rozšíření 16): neukládají se, jen se přepošlou velké obrazovce. Kdo je poslal, obrazovka neví.
    socket.on('react', (emoji, reply) => {
      const session = sessions.get(socket.id);
      if (session?.as !== 'player' || !(REACTIONS as readonly unknown[]).includes(emoji)) {
        respond(reply, { ok: false, error: 'Neplatný požadavek.' });
        return;
      }
      if (!canReact(state, session.playerId)) {
        respond(reply, { ok: false, error: 'Teď reagovat nejde.' });
        return;
      }
      const now = Date.now();
      if (now - (lastReaction.get(session.playerId) ?? 0) < REACTION_COOLDOWN_MS) {
        respond(reply, { ok: false, error: 'Chvilku počkej.' });
        return;
      }
      lastReaction.set(session.playerId, now);
      reactionKey++;
      for (const s of io.sockets.sockets.values()) {
        if (sessions.get(s.id)?.as === 'screen') s.emit('reaction', { emoji: emoji as Reaction, key: reactionKey });
      }
      respond(reply, { ok: true });
    });

    socket.on('resetHallOfFame', (reply) => {
      if (sessions.get(socket.id)?.as !== 'moderator') {
        respond(reply, { ok: false, error: 'Na tohle nemáš oprávnění.' });
        return;
      }
      hall.reset();
      respond(reply, { ok: true });
      broadcast();
    });

    socket.on('time', (reply) => respond(reply, Date.now()));

    // Nový telefon hráče: nový token, starý telefon se stane hostem (Rozšíření 10).
    socket.on('newPhone', (playerId, reply) => {
      if (sessions.get(socket.id)?.as !== 'moderator') {
        respond(reply, { ok: false, error: 'Na tohle nemáš oprávnění.' });
        return;
      }
      if (typeof playerId !== 'string') {
        respond(reply, { ok: false, error: 'Neplatný požadavek.' });
        return;
      }
      const token = randomBytes(18).toString('base64url');
      const result = apply(state, { kind: 'moderator' }, { type: 'newPhone', playerId, token }, rng);
      if (!result.ok) {
        respond(reply, result);
        return;
      }
      commit(result.state);
      for (const [id, s] of sessions) if (s.as === 'player' && s.playerId === playerId) sessions.set(id, { as: 'guest' });
      respond(reply, { ok: true, url: `${options.joinUrl}?token=${encodeURIComponent(token)}` });
      broadcast();
    });

    socket.on('disconnect', () => {
      sessions.delete(socket.id);
      broadcast();
    });
  });

  return {
    /** Jen pro testy a ladění. */
    getState: () => state,
    stop: () => {
      clearInterval(timer);
      clearInterval(botTimer);
    },
  };
}
