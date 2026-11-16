import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, Intent, JoinResult, Result, ServerToClientEvents, View } from '../shared/types';

// Stejná adresa a port, ze kterých přišla stránka.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const params = new URLSearchParams(location.search);

export const isModeratorPage = location.pathname.replace(/\/+$/, '') === '/moderator';
const moderatorKey = params.get('key') ?? '';

// ?hrac=3 uloží token pod jiným klíčem, aby šlo v jednom prohlížeči testovat víc hráčů v kartách.
const slot = params.get('hrac');
const TOKEN_KEY = slot ? `zrada-token-${slot}` : 'zrada-token';

function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Bez úložiště hra funguje, jen se po zavření prohlížeče nevrátí.
  }
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

socket.on('connect', () => {
  update({ connected: true });
  // Po každém (znovu)připojení se server dozví, kdo jsme.
  const req = isModeratorPage ? { moderatorKey } : { token: readToken() };
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

export function send(intent: Intent): Promise<Result> {
  return socket.emitWithAck('intent', intent);
}
