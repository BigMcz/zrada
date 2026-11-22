import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ClientToServerEvents,
  ModeratorView,
  PlayerView,
  ServerToClientEvents,
  View,
} from '../shared/types.js';
import { seededRng } from './game/random.js';
import type { GameState } from './game/state.js';
import { attachGame, type HubOptions } from './hub.js';

const KEY = 'tajny-klic';

/** Testovací klient: pamatuje si všechny pohledy, které mu server poslal. */
class Client {
  views: View[] = [];
  constructor(readonly socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>) {
    socket.on('view', (v) => this.views.push(v));
  }
  get view(): View | undefined {
    return this.views.at(-1);
  }
  /** Počká, až poslední pohled splní podmínku. */
  async waitFor<T extends View>(pred: (v: View) => v is T, ms?: number): Promise<T>;
  async waitFor(pred: (v: View) => boolean, ms?: number): Promise<View>;
  async waitFor(pred: (v: View) => boolean, ms = 2000): Promise<View> {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (this.view && pred(this.view)) return this.view;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error(`Nedočkal jsem se pohledu; poslední: ${JSON.stringify(this.view)}`);
  }
}

const isPlayer = (v: View): v is PlayerView => v.kind === 'player';
const isModerator = (v: View): v is ModeratorView => v.kind === 'moderator';

let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

async function startServer(extra: Partial<HubOptions> = {}) {
  const http = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(http);
  const hub = attachGame(io, { moderatorKey: KEY, joinUrl: 'http://192.168.0.10:3000/', rng: seededRng(7), ...extra });
  await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  const clients: Client[] = [];

  const connect = async () => {
    const socket = connectClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    const client = new Client(socket);
    clients.push(client);
    await new Promise<void>((r) => socket.on('connect', () => r()));
    return client;
  };

  const moderator = async () => {
    const c = await connect();
    expect(await c.socket.emitWithAck('hello', { moderatorKey: KEY })).toEqual({ as: 'moderator' });
    await c.waitFor(isModerator);
    return c;
  };

  const player = async (name: string) => {
    const c = await connect();
    const res = await c.socket.emitWithAck('join', name);
    if (!res.ok) throw new Error(res.error);
    await c.waitFor(isPlayer);
    return Object.assign(c, { token: res.token, playerId: res.playerId });
  };

  cleanup = async () => {
    for (const c of clients) c.socket.disconnect();
    await new Promise<void>((r) => io.close(() => r()));
  };
  return { connect, moderator, player, hub };
}

describe('server přes skutečné sockety', () => {
  it('nové zařízení je host a může se připojit', async () => {
    const { connect } = await startServer();
    const c = await connect();
    expect(await c.waitFor((v) => v.kind === 'guest')).toEqual({ kind: 'guest', joinOpen: true });
  });

  it('bez správného klíče nikdo nedostane pohled moderátora', async () => {
    const { connect, player } = await startServer();
    const intruder = await connect();
    const res = await intruder.socket.emitWithAck('hello', { moderatorKey: 'hádám' });
    expect(res).toEqual({ as: 'guest', forgetToken: false, error: 'Neplatný klíč moderátora.' });

    await player('Petra'); // vyvolá rozeslání pohledů
    await player('Tomáš');
    expect(intruder.views.length).toBeGreaterThan(1);
    expect(intruder.views.every((v) => v.kind === 'guest')).toBe(true);

    expect(await intruder.socket.emitWithAck('intent', { type: 'startGame', traitorCount: 1 })).toEqual({
      ok: false,
      error: 'Na tohle nemáš oprávnění.',
    });
  });

  it('moderátor se správným klíčem vidí hráče a adresu pro QR kód', async () => {
    const { moderator, player } = await startServer();
    const mod = await moderator();
    await player('Petra');
    const view = await mod.waitFor((v): v is ModeratorView => isModerator(v) && v.players.length === 1);
    expect(view.joinUrl).toBe('http://192.168.0.10:3000/');
    expect(view.players[0]).toMatchObject({ name: 'Petra', connected: true });
  });

  it('jde odehrát celá hra a po síti nepřijde žádný cizí token', async () => {
    const { moderator, player } = await startServer();
    const mod = await moderator();
    const players = [];
    for (const name of ['Petra', 'Tomáš', 'Jana', 'Karel', 'Eva']) players.push(await player(name));

    // Hráč hru spustit nemůže.
    expect(await players[0].socket.emitWithAck('intent', { type: 'startGame', traitorCount: 1 })).toMatchObject({
      ok: false,
    });

    expect(await mod.socket.emitWithAck('intent', { type: 'startGame', traitorCount: 1 })).toEqual({ ok: true });
    const modView = await mod.waitFor((v): v is ModeratorView => isModerator(v) && v.phase === 'ROLES');
    const traitorId = modView.players.find((p) => p.role === 'TRAITOR')!.id;

    for (const p of players) {
      const v = await p.waitFor((v): v is PlayerView => isPlayer(v) && v.phase === 'ROLES');
      expect(v.me.role).toBe(p.playerId === traitorId ? 'TRAITOR' : 'LOYAL');
      expect(await p.socket.emitWithAck('intent', { type: 'ackRole' })).toEqual({ ok: true });
    }
    await mod.waitFor((v) => isModerator(v) && v.players.every((p) => p.sawRole));

    await mod.socket.emitWithAck('intent', { type: 'startVote' });
    for (const p of players) {
      const target = p.playerId === traitorId ? players.find((o) => o.playerId !== traitorId)! : null;
      const res = await p.socket.emitWithAck('intent', { type: 'vote', targetId: target?.playerId ?? traitorId });
      expect(res).toEqual({ ok: true });
    }
    await mod.socket.emitWithAck('intent', { type: 'closeVote' });

    for (const p of players) {
      const v = await p.waitFor((v): v is PlayerView => isPlayer(v) && v.phase === 'ENDED');
      expect(v.winner).toBe('LOYAL');
    }

    // Kontrola toho, co skutečně odešlo po síti.
    for (const p of players) {
      const wire = JSON.stringify(p.views);
      for (const other of players) {
        if (other !== p) expect(wire).not.toContain(other.token);
      }
    }
  });

  it('hráč se po ztrátě spojení vrátí jako stejný hráč', async () => {
    const { moderator, player, connect } = await startServer();
    const mod = await moderator();
    const petra = await player('Petra');
    await player('Tomáš');

    petra.socket.disconnect();
    await mod.waitFor((v) => isModerator(v) && v.players.find((p) => p.name === 'Petra')?.connected === false);

    const again = await connect();
    expect(await again.socket.emitWithAck('hello', { token: petra.token })).toEqual({
      as: 'player',
      playerId: petra.playerId,
    });
    const v = await again.waitFor(isPlayer);
    expect(v.me).toMatchObject({ id: petra.playerId, name: 'Petra' });
    await mod.waitFor((v) => isModerator(v) && v.players.find((p) => p.name === 'Petra')?.connected === true);
  });

  it('odebraný hráč se stane hostem a jeho token přestane platit', async () => {
    const { moderator, player, connect } = await startServer();
    const mod = await moderator();
    const karel = await player('Karel');

    expect(await mod.socket.emitWithAck('intent', { type: 'kick', playerId: karel.playerId })).toEqual({ ok: true });
    await karel.waitFor((v) => v.kind === 'guest');

    const again = await connect();
    expect(await again.socket.emitWithAck('hello', { token: karel.token })).toEqual({
      as: 'guest',
      forgetToken: true,
    });
  });

  it('nesmyslné zprávy odmítne a běží dál', async () => {
    const { connect, player } = await startServer();
    const c = await connect();
    const s = c.socket as unknown as ClientSocket;
    expect(await s.emitWithAck('intent', { type: 'smazatVse' })).toEqual({ ok: false, error: 'Neplatný požadavek.' });
    expect(await s.emitWithAck('intent', null)).toEqual({ ok: false, error: 'Neplatný požadavek.' });
    expect(await s.emitWithAck('join', { name: 'x' })).toEqual({ ok: false, error: 'Zadej jméno.' });
    expect(await s.emitWithAck('hello', null)).toEqual({ as: 'guest', forgetToken: false });
    s.emit('intent', { type: 'startVote' }); // bez odpovědi
    await player('Petra');
  });

  it('připojený hráč se nemůže připojit podruhé', async () => {
    const { player } = await startServer();
    const petra = await player('Petra');
    expect(await petra.socket.emitWithAck('join', 'Petra 2')).toEqual({ ok: false, error: 'Už jsi ve hře.' });
  });

  it('velká obrazovka dostane veřejný pohled bez klíče, nemůže hrát ani řídit hru', async () => {
    const { connect, player } = await startServer();
    const screen = await connect();
    expect(await screen.socket.emitWithAck('hello', { screen: true })).toEqual({ as: 'screen' });
    const petra = await player('Petra');
    const view = await screen.waitFor((v) => v.kind === 'screen' && v.players.length === 1);
    expect(view).toMatchObject({ kind: 'screen', phase: 'LOBBY', joinUrl: 'http://192.168.0.10:3000/' });
    expect(JSON.stringify(screen.views)).not.toContain(petra.token);
    expect(await screen.socket.emitWithAck('intent', { type: 'startGame', traitorCount: 1 })).toEqual({
      ok: false,
      error: 'Na tohle nemáš oprávnění.',
    });
    expect(await screen.socket.emitWithAck('join', 'Vetřelec')).toEqual({ ok: false, error: 'Už jsi ve hře.' });
  });

  it('obnova po pádu: hra pokračuje z uloženého stavu, hráč se vrátí se starým tokenem, změny se ukládají', async () => {
    // První server: připojí se hráči, rozdají se role; každá změna se „uloží“.
    let saved: GameState | null = null;
    const first = await startServer({ onChange: (s) => (saved = structuredClone(s)) });
    const mod = await first.moderator();
    const players = [];
    for (const name of ['Petra', 'Tomáš', 'Jana', 'Karel', 'Eva']) players.push(await first.player(name));
    expect(await mod.socket.emitWithAck('intent', { type: 'startGame', traitorCount: 1 })).toEqual({ ok: true });
    await mod.waitFor((v): v is ModeratorView => isModerator(v) && v.phase === 'ROLES');
    expect(saved).not.toBeNull();
    const snapshot: GameState = saved!;
    expect(snapshot.phase).toBe('ROLES');
    await cleanup?.();

    // Druhý server po „restartu“ začne z uloženého stavu.
    const changes: string[] = [];
    const second = await startServer({ initialState: snapshot, onChange: (s) => changes.push(s.phase) });
    const petra = await second.connect();
    expect(await petra.socket.emitWithAck('hello', { token: players[0].token })).toEqual({ as: 'player', playerId: players[0].playerId });
    const view = await petra.waitFor(isPlayer);
    expect(view).toMatchObject({ phase: 'ROLES', me: { name: 'Petra' } });
    expect(view.me.role).toBeDefined();
    expect(await petra.socket.emitWithAck('intent', { type: 'ackRole' })).toEqual({ ok: true });
    expect(changes).toEqual(['ROLES']);
  });

  it('nový telefon: moderátor dostane odkaz s novým tokenem, starý telefon se stane hostem', async () => {
    const { connect, moderator, player } = await startServer();
    const mod = await moderator();
    const petra = await player('Petra');
    const res = await mod.socket.emitWithAck('newPhone', petra.playerId);
    if (!res.ok) throw new Error(res.error);
    const token = new URL(res.url).searchParams.get('token')!;
    expect(res.url.startsWith('http://192.168.0.10:3000/?token=')).toBe(true);
    expect(token).not.toBe(petra.token);
    await petra.waitFor((v) => v.kind === 'guest');
    const phone = await connect();
    expect(await phone.socket.emitWithAck('hello', { token })).toEqual({ as: 'player', playerId: petra.playerId });
    const old = await connect();
    expect(await old.socket.emitWithAck('hello', { token: petra.token })).toEqual({ as: 'guest', forgetToken: true });
    // Hráč si nový telefon vyrobit nemůže.
    expect(await phone.socket.emitWithAck('newPhone', petra.playerId)).toEqual({ ok: false, error: 'Na tohle nemáš oprávnění.' });
  });
});
