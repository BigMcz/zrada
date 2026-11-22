import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { buzz, CONFIRM_BUZZ } from './player/device';
import type { ClientToServerEvents, Intent, Reaction, JoinResult, NewPhoneResult, Result, ServerToClientEvents, View } from '../shared/types';

// Stejná adresa a port, ze kterých přišla stránka.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const params = new URLSearchParams(location.search);

const pagePath = location.pathname.replace(/\/+$/, '');
export const isModeratorPage = pagePath === '/moderator';
/** Velká obrazovka pro projektor (Rozšíření 9). */
export const isScreenPage = pagePath === '/obrazovka';
const moderatorKey = params.get('key') ?? '';

// ?hrac=3 uloží token pod jiným klíčem, aby šlo v jednom prohlížeči testovat víc hráčů v kartách.
const slot = params.get('hrac');
const TOKEN_KEY = slot ? `zrada-token-${slot}` : 'zrada-token';

// Odkaz „Nový telefon“ z konzole nese token v adrese (?token=…): uloží se a z adresy zmizí,
// aby se nedal omylem nasdílet dál (Rozšíření 10).
let urlToken = params.get('token');

function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? urlToken ?? undefined;
  } catch {
    return urlToken ?? undefined;
  }
}

function writeToken(token: string | null) {
  if (!token) urlToken = null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Bez úložiště hra funguje, jen se po zavření prohlížeče nevrátí.
  }
}

if (urlToken) {
  writeToken(urlToken);
  params.delete('token');
  const rest = params.toString();
  history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}`);
}

// ---------------------------------------------------------------------------
// Malé úložiště stavu připojení pro React (useSyncExternalStore)
// ---------------------------------------------------------------------------

export interface Connection {
  connected: boolean;
  view: View | null;
  /** Chyba při přihlášení (např. špatný klíč moderátora). */
  helloError: string | null;
}

let current: Connection = { connected: socket.connected, view: null, helloError: null };
const listeners = new Set<() => void>();

function update(patch: Partial<Connection>) {
  current = { ...current, ...patch };
  for (const l of listeners) l();
}

// ---------------------------------------------------------------------------
// Rozdíl hodin telefonu a serveru (pro odpočty miniher)
// ---------------------------------------------------------------------------

let clockOffset = 0;

/** Místní hodiny s přesností pod milisekundu (stejný základ jako `event.timeStamp`). */
const localNow = () => performance.timeOrigin + performance.now();

/** Odhad času serveru podle hodin telefonu. */
export function serverNow(): number {
  return localNow() + clockOffset;
}

/** Čas serveru pro časovou značku události (`event.timeStamp` z pointerdown). */
export function serverTimeOf(eventTimeStamp: number): number {
  return performance.timeOrigin + eventTimeStamp + clockOffset;
}

/** Několik výměn zpráv (`samples`), vezme se ta s nejkratší cestou (nejpřesnější). */
export async function syncClock(samples = 5) {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < samples; i++) {
    const t0 = localNow();
    const server = await socket.emitWithAck('time');
    const t1 = localNow();
    const sample = { rtt: t1 - t0, offset: server - (t0 + t1) / 2 };
    if (!best || sample.rtt < best.rtt) best = sample;
  }
  if (best) clockOffset = best.offset;
}

socket.on('connect', () => {
  update({ connected: true });
  void syncClock();
  // Po každém (znovu)připojení se server dozví, kdo jsme.
  const req = isScreenPage ? { screen: true } : isModeratorPage ? { moderatorKey } : { token: readToken() };
  socket.emit('hello', req, (res) => {
    if (res.as === 'guest') {
      if (res.forgetToken) writeToken(null);
      update({ helloError: res.error ?? null });
    } else {
      update({ helloError: null });
    }
  });
});
socket.on('disconnect', () => update({ connected: false }));
socket.on('view', (view) => update({ view }));

export function useConnection(): Connection {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

export async function join(name: string): Promise<JoinResult> {
  const res = await socket.emitWithAck('join', name);
  if (res.ok) writeToken(res.token);
  return res;
}

export async function send(intent: Intent): Promise<Result> {
  const res = await socket.emitWithAck('intent', intent);
  // Telefon hráče krátce cukne, když server vlastní volbu přijal (Rozšíření 14).
  if (res.ok && !isModeratorPage && !isScreenPage) buzz(CONFIRM_BUZZ);
  return res;
}

/** Hráč: anonymní reakce na velkou obrazovku (Rozšíření 16). */
export function react(emoji: Reaction): Promise<Result> {
  return socket.emitWithAck('react', emoji);
}

/** Moderátor: vynuluje síň slávy (Rozšíření 16). */
export function resetHallOfFame(): Promise<Result> {
  return socket.emitWithAck('resetHallOfFame');
}

/** Moderátor: nový odkaz pro hráče na jiném telefonu (Rozšíření 10). */
export function requestNewPhone(playerId: string): Promise<NewPhoneResult> {
  return socket.emitWithAck('newPhone', playerId);
}
