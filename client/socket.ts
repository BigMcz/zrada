import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types';

// Stejná adresa a port, ze kterých přišla stránka.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
