import express from 'express';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { attachGame } from './hub.js';
import { findLanIp, listLanIps } from './network.js';

const PORT = Number(process.env.PORT ?? 3000);
const PROD = process.argv.includes('--prod');
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const lanIp = findLanIp();
const joinUrl = `http://${lanIp}:${PORT}/`;
// Nový klíč při každém startu, pokud ho nezadá proměnná MODERATOR_KEY.
const moderatorKey = process.env.MODERATOR_KEY ?? randomBytes(4).toString('hex');

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // Vite HMR používá stejný HTTP server; Socket.IO nesmí jeho upgrade zahodit.
  destroyUpgrade: false,
});
attachGame(io, { moderatorKey, joinUrl });

if (PROD) {
  const clientDir = path.join(rootDir, 'dist', 'client');
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    configFile: path.join(rootDir, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const others = listLanIps();
  console.log('');
  console.log(`  Zrada běží (${PROD ? 'produkční build' : 'vývoj'})`);
  console.log('');
  console.log(`  Moderátor (jen tento počítač):  http://localhost:${PORT}/moderator?key=${moderatorKey}`);
  console.log(`  Hráči (telefony):               ${joinUrl}`);
  if (others.length > 1) {
    console.log('');
    console.log('  Další síťové adresy (pokud ta pro hráče nefunguje, nastav HOST_IP):');
    for (const o of others) console.log(`    ${o}`);
  }
  console.log('');
});
