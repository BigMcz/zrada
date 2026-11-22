import express from 'express';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { attachGame } from './hub.js';
import { loadGame, saveGame } from './persistence.js';
import { createHallOfFame } from './hallOfFame.js';
import { registerAllMinigames } from './minigames/modules.js';
import { findLanIp, listLanIps } from './network.js';

const PORT = Number(process.env.PORT ?? 3000);
const PROD = process.argv.includes('--prod');
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const lanIp = findLanIp();
const joinUrl = `http://${lanIp}:${PORT}/`;
// Obnova po pádu (Rozšíření 10): stav hry se ukládá do souboru; STATE_FILE= (prázdné) ukládání vypne.
const stateFile = process.env.STATE_FILE ?? path.join(rootDir, 'data', 'zrada-stav.json');
const saved = stateFile ? loadGame(stateFile) : null;
// Klíč moderátora: z proměnné MODERATOR_KEY, z uložené hry (otevřená konzole funguje dál), jinak nový.
const moderatorKey = process.env.MODERATOR_KEY ?? saved?.moderatorKey ?? randomBytes(4).toString('hex');

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  // Vite HMR používá stejný HTTP server; Socket.IO nesmí jeho upgrade zahodit.
  destroyUpgrade: false,
});
registerAllMinigames();
// Síň slávy vedle uložené hry; s vypnutým ukládáním (STATE_FILE=, robot) se nezapisuje nikam.
const hallFile = process.env.HALL_FILE ?? (stateFile ? path.join(rootDir, 'data', 'zrada-sin-slavy.json') : '');
attachGame(io, {
  moderatorKey,
  joinUrl,
  hallOfFame: createHallOfFame(hallFile || null),
  initialState: saved?.state,
  onChange: stateFile
    ? (state) => {
        try {
          saveGame(stateFile, { moderatorKey, state });
        } catch (e) {
          console.warn(`  Stav hry nejde uložit: ${(e as Error).message}`);
        }
      }
    : undefined,
});

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
  if (saved) console.log(`  Pokračuje uložená hra (fáze ${saved.state.phase}, ${saved.state.players.length} hráčů).`);
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
