/**
 * Automatická zkouška celé hry přes skutečný server.
 *
 * Spustí server (produkční build), připojí moderátora a hráče přes Socket.IO – stejně jako
 * telefony – a odehraje několik celých her s různým nastavením. Hráči vidí jen svůj pohled
 * a podle něj náhodně hrají (hlasují, vybírají v noci, tipují jako duchové, hrají minihry).
 *
 * Během hry kontroluje, co skutečně odešlo po síti (cizí role, tokeny, skryté údaje miniher,
 * štít, body), a na konci výsledek hry.
 *
 * Spuštění: npm run build && npx tsx scripts/e2e-games.ts
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  Intent,
  ModeratorView,
  PlayerView,
  ServerToClientEvents,
  View,
} from '../shared/types';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Config {
  name: string;
  players: number;
  traitors: number;
  minigames: boolean;
  /** Během hry odpojit a znovu připojit jednoho hráče. */
  reconnect?: boolean;
}

const CONFIGS: Config[] = [
  { name: 'Hra 1: 5 hráčů, 1 Zrádce, minihry', players: 5, traitors: 1, minigames: true },
  { name: 'Hra 2: 8 hráčů, 2 Zrádci, minihry', players: 8, traitors: 2, minigames: true },
  { name: 'Hra 3: 10 hráčů, 2 Zrádci, minihry + návrat hráče', players: 10, traitors: 2, minigames: true, reconnect: true },
  { name: 'Hra 4: 4 hráči, 1 Zrádce, bez miniher', players: 4, traitors: 1, minigames: false },
  { name: 'Hra 5: 7 hráčů, 2 Zrádci, minihry + návrat hráče', players: 7, traitors: 2, minigames: true, reconnect: true },
];

const KEY = 'e2e-klic';
const NAMES = ['Anna', 'Bára', 'Cyril', 'Dan', 'Ema', 'Filip', 'Gita', 'Hugo', 'Ivana', 'Jan'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const chance = (p: number) => Math.random() < p;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function startServer(port: number): Promise<ChildProcess> {
  const proc = spawn('npx', ['tsx', 'server/index.ts', '--prod'], {
    env: { ...process.env, PORT: String(port), MODERATOR_KEY: KEY },
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) return proc;
    } catch {
      // ještě neběží
    }
    await sleep(300);
  }
  throw new Error('Server nenastartoval');
}

function stopServer(proc: ChildProcess) {
  if (process.platform === 'win32' && proc.pid) spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { shell: true });
  else proc.kill();
}

// ---------------------------------------------------------------------------
// Klienti
// ---------------------------------------------------------------------------

class Report {
  violations: string[] = [];
  failedActions: string[] = [];
  violation(msg: string) {
    if (this.violations.length < 30) this.violations.push(msg);
  }
}

class Bot {
  view: View | null = null;
  id = '';
  token = '';
  constructor(
    public socket: ClientSocket,
    public name: string,
  ) {
    socket.on('view', (v) => (this.view = v));
  }
  get pv(): PlayerView | null {
    return this.view?.kind === 'player' ? this.view : null;
  }
}

async function connect(url: string): Promise<ClientSocket> {
  const socket: ClientSocket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', reject);
  });
  return socket;
}

// ---------------------------------------------------------------------------
// Kontroly toho, co přišlo po síti do telefonu
// ---------------------------------------------------------------------------

/** Klíče, které by v pohledu hráče nikdy neměly být (skryté údaje miniher a štítu). */
const FORBIDDEN_KEYS = ['"bids"', '"choices"', '"revealOrder"', '"traitors"', '"ghostGuesses"', '"ghostBets"', '"picks"', '"shieldHolderId"', '"token"', '"explodeAt"', '"fuseMs"', '"ghostTips"', '"hints"', '"hintLog"', '"answers"', '"questions"', '"code"', '"fakes"', '"votes"'];

function checkPlayerView(bot: Bot, all: Bot[], report: Report) {
  const v = bot.pv;
  if (!v) return;
  // Noční nápověda Zrádců („Spojenec volí“) legitimně obsahuje pole picks – tu hlídá views.test.ts.
  const json = JSON.stringify({ ...v, night: undefined });
  for (const other of all) {
    if (other !== bot && other.token && json.includes(other.token)) report.violation(`${bot.name}: v pohledu je token hráče ${other.name}`);
  }
  for (const key of FORBIDDEN_KEYS) {
    if (json.includes(key)) report.violation(`${bot.name}: v pohledu je skrytý údaj ${key} (fáze ${v.phase})`);
  }
  for (const p of v.players) {
    if (p.revealedRole && p.status !== 'BANISHED' && v.phase !== 'ENDED') {
      report.violation(`${bot.name}: vidí roli hráče ${p.name}, který nebyl vyhnán`);
    }
  }
  if (v.me.role === 'LOYAL' && v.allies.length > 0) report.violation(`${bot.name}: Věrný vidí spojence`);
  const game = v.minigame?.game as { stage?: string; revealed?: unknown } | null | undefined;
  if (v.minigame?.id === 'SPLIT_STEAL' && game && game.stage !== 'DONE' && game.revealed) {
    report.violation(`${bot.name}: vidí volby duelistů před odhalením`);
  }
  checkGhostPotato(bot, report);
  checkQuiz(bot, report);
  checkVault(bot, report);
  if (v.minigame?.id === 'HOT_POTATO' && v.me.status === 'ALIVE' && game) {
    // Horký brambor: Věrný i Zrádce mají stejná pole, ručička je číslo 0–1 a mimo bombu stojí na nule.
    const keys = Object.keys(game).sort().join(',');
    if (keys !== HOT_POTATO_KEYS) report.violation(`${bot.name}: pohled Horkého bramboru má jiná pole: ${keys}`);
    const p = (game as { pressure?: unknown }).pressure;
    if (typeof p !== 'number' || p < 0 || p > 1) report.violation(`${bot.name}: ručička tlaku mimo rozsah: ${String(p)}`);
    if (game.stage !== 'BOMB' && p !== 0) report.violation(`${bot.name}: ručička tlaku mimo bombu není 0`);
  }
}

/** Duch ručičku tlaku nemá. */
function checkGhostPotato(bot: Bot, report: Report) {
  const v = bot.pv;
  if (v?.minigame?.id === 'HOT_POTATO' && v.me.status !== 'ALIVE' && v.minigame.game && 'pressure' in (v.minigame.game as object)) {
    report.violation(`${bot.name}: duch vidí ručičku tlaku`);
  }
}

const HOT_POTATO_KEYS = 'amHolder,amOut,canPassTo,eliminated,holderId,players,pressure,remaining,round,stage';
const QUIZ_KEYS = 'answeredCount,correct,hint,index,myAnswer,question,stage,standings,total';
const VAULT_KEYS = 'attempts,attemptsLeft,digits,isLocksmith,locksmithId,myHints,myVote,revealedCode,stage,voteTargets,votedCount';

/** Trezor: stejná pole pro všechny, kód až po konci, duch bez nápověd. */
function checkVault(bot: Bot, report: Report) {
  const v = bot.pv;
  if (v?.minigame?.id !== 'VAULT' || v.minigame.step !== 'PLAY' || !v.minigame.game) return;
  const game = v.minigame.game as { stage: string; revealedCode?: number[] | null; myHints?: string[] };
  if (v.me.status !== 'ALIVE') {
    if ('myHints' in game) report.violation(`${bot.name}: duch vidí nápovědy trezoru`);
  } else {
    const keys = Object.keys(game).sort().join(',');
    if (keys !== VAULT_KEYS) report.violation(`${bot.name}: pohled trezoru má jiná pole: ${keys}`);
    if (!game.myHints || game.myHints.length < 1 || game.myHints.length > 3) report.violation(`${bot.name}: má ${game.myHints?.length} nápověd`);
  }
  if (game.stage !== 'DONE' && game.revealedCode != null) report.violation(`${bot.name}: vidí kód trezoru před koncem`);
}

/** Kvíz: stejná pole pro všechny, správná odpověď až po konci otázky, duch bez svíčky. */
function checkQuiz(bot: Bot, report: Report) {
  const v = bot.pv;
  if (v?.minigame?.id !== 'QUIZ' || v.minigame.step !== 'PLAY' || !v.minigame.game) return;
  const game = v.minigame.game as { stage: string; correct: number | null; hint?: number | null };
  if (v.me.status !== 'ALIVE') {
    if ('hint' in game) report.violation(`${bot.name}: duch vidí svíčku`);
    return;
  }
  const keys = Object.keys(game).sort().join(',');
  if (keys !== QUIZ_KEYS) report.violation(`${bot.name}: pohled kvízu má jiná pole: ${keys}`);
  if (game.stage === 'QUESTION' && game.correct !== null) report.violation(`${bot.name}: vidí správnou odpověď před koncem otázky`);
  if (game.stage === 'REVEAL' && v.me.role === 'TRAITOR' && game.hint !== game.correct) {
    report.violation(`${bot.name}: Zrádce má svíčku jinde než u správné odpovědi`);
  }
}

/** Kontroly, které potřebují pohled moderátora (pravda) – volají se, když je stav ustálený. */
function checkAgainstModerator(m: ModeratorView, bots: Bot[], report: Report) {
  for (const bot of bots) {
    const v = bot.pv;
    if (!v || v.phase !== m.phase || v.round !== m.round) continue;
    const expected = m.shieldHolderId === null ? 'NONE' : m.shieldHolderId === bot.id ? 'MINE' : 'OTHER';
    if (v.me.shield !== expected) report.violation(`${bot.name}: štít ${v.me.shield}, správně ${expected}`);
    const total = m.playerPoints[bot.id] ?? 0;
    if (m.phase !== 'ENDED' && v.myPoints > total) report.violation(`${bot.name}: vidí víc bodů (${v.myPoints}) než má (${total})`);
    if (m.phase === 'ENDED' && v.myPoints !== total) report.violation(`${bot.name}: na konci vidí ${v.myPoints} bodů, má ${total}`);
  }
  if (m.pot < 0) report.violation(`poklad je záporný: ${m.pot}`);
}

// ---------------------------------------------------------------------------
// Jedna hra
// ---------------------------------------------------------------------------

interface GameSummary {
  name: string;
  ok: boolean;
  winner: string;
  rounds: number;
  minigames: string[];
  shieldSaves: number;
  pot: number;
  topPlayers: string;
  ghosts: string;
  reconnected: string;
  durationS: number;
  violations: string[];
  failedActions: string[];
}

async function playGame(cfg: Config, port: number): Promise<GameSummary> {
  const started = Date.now();
  const url = `http://localhost:${port}`;
  const report = new Report();
  const server = await startServer(port);
  const sockets: ClientSocket[] = [];

  try {
    // Moderátor
    const modSocket = await connect(url);
    sockets.push(modSocket);
    const mod = new Bot(modSocket, 'Moderátor');
    await modSocket.emitWithAck('hello', { moderatorKey: KEY });

    // Hráči
    const bots: Bot[] = [];
    for (let i = 0; i < cfg.players; i++) {
      const s = await connect(url);
      sockets.push(s);
      const bot = new Bot(s, NAMES[i]);
      const res = await s.emitWithAck('join', NAMES[i]);
      if (!res.ok) throw new Error(`Připojení ${NAMES[i]} selhalo: ${res.error}`);
      bot.id = res.playerId;
      bot.token = res.token;
      bots.push(bot);
    }
    for (const bot of bots) bot.socket.on('view', () => checkPlayerView(bot, bots, report));

    const m = () => mod.view as ModeratorView;
    const nameOf = (id: string) => bots.find((b) => b.id === id)?.name ?? id;
    let potatoPlayed = false;
    let quizPlayed = false;
    let vaultPlayed = false;
    const signature = () => {
      const v = m();
      const g = v.minigame?.game as { stage?: string; revealed?: unknown[] | boolean } | null | undefined;
      return JSON.stringify([v.phase, v.round, v.minigame?.step, v.minigame?.id, g?.stage, Array.isArray(g?.revealed) ? g?.revealed.length : g?.revealed]);
    };

    async function act(bot: Bot, intent: Intent) {
      const res = await bot.socket.emitWithAck('intent', intent);
      if (!res.ok) report.failedActions.push(`${bot.name} ${intent.type}: ${res.error}`);
    }
    /** Akce moderátora a čekání, až se stav změní. */
    async function modAct(intent: Intent, waitMs = 5000) {
      const before = signature();
      await act(mod, intent);
      const until = Date.now() + waitMs;
      while (signature() === before && Date.now() < until) await sleep(30);
      await sleep(120); // ať dorazí pohledy i hráčům
    }
    const alive = () => bots.filter((b) => b.pv?.me.status === 'ALIVE');
    const tippingGhosts = () => bots.filter((b) => b.pv?.ghost?.canTip);

    async function ghostsTip() {
      for (const g of tippingGhosts()) {
        if (!g.pv!.ghost!.tipOpen || !chance(0.8)) continue;
        const targets = g.pv!.players.filter((p) => p.status === 'ALIVE');
        await act(g, { type: 'ghostTip', targetId: rand(targets).id });
      }
    }

    let reconnected = 'ne';
    let potatoJump = 'ne';
    let vaultReassign = 'ne';
    async function maybeReconnect() {
      if (!cfg.reconnect || reconnected !== 'ne') return;
      const bot = rand(alive());
      bot.socket.disconnect();
      await sleep(200);
      await rejoin(bot);
      reconnected = `${bot.name} (fáze ${m().phase}, ${m().round}. kolo) – vrátil/a se jako stejný hráč`;
    }

    /** Nové připojení se stejným tokenem; musí to být stejný hráč. */
    async function rejoin(bot: Bot) {
      const oldId = bot.id;
      const s = await connect(url);
      sockets.push(s);
      bot.socket = s;
      bot.view = null;
      s.on('view', (v) => {
        bot.view = v;
        checkPlayerView(bot, bots, report);
      });
      const res = await s.emitWithAck('hello', { token: bot.token });
      await sleep(200);
      if (res.as !== 'player' || res.playerId !== oldId || bot.pv?.me.id !== oldId) {
        report.violation(`${bot.name}: po návratu není stejný hráč`);
      }
    }

    // --- Lobby ---
    await sleep(300);
    if (m().minigamesEnabled !== cfg.minigames) await modAct({ type: 'setMinigames', enabled: cfg.minigames });
    await modAct({ type: 'startGame', traitorCount: cfg.traitors });

    let loops = 0;
    while (m().phase !== 'ENDED') {
      if (++loops > 4000) throw new Error(`Hra se zasekla ve fázi ${m().phase}`);
      checkAgainstModerator(m(), bots, report);
      const v = m();

      switch (v.phase) {
        case 'ROLES': {
          for (const b of bots) if (!b.pv!.me.sawRole) await act(b, { type: 'ackRole' });
          await sleep(150);
          const draw = cfg.minigames && v.minigameAvailable && chance(0.8);
          await modAct(draw ? { type: 'drawMinigame' } : { type: 'startVote' });
          break;
        }
        case 'MORNING': {
          await ghostsTip();
          const draw = cfg.minigames && v.minigameAvailable && chance(0.7);
          await modAct(draw ? { type: 'drawMinigame' } : { type: 'startVote' });
          break;
        }
        case 'VOTE': {
          await maybeReconnect();
          await ghostsTip();
          for (const b of alive()) {
            if (!chance(0.85)) continue;
            const targets = b.pv!.players.filter((p) => p.status === 'ALIVE' && p.id !== b.id);
            await act(b, { type: 'vote', targetId: rand(targets).id });
          }
          await sleep(100);
          await modAct({ type: 'closeVote' });
          break;
        }
        case 'VOTE_RESULT':
          await ghostsTip();
          await modAct({ type: 'startNight' });
          break;
        case 'NIGHT': {
          await ghostsTip();
          for (const b of alive()) {
            const night = b.pv!.night;
            if (!night || !chance(0.85)) continue;
            const grid = b.pv!.players.filter((p) => p.status === 'ALIVE' && p.id !== b.id && !night.blocked.includes(p.id));
            if (grid.length > 0) await act(b, { type: 'nightPick', targetId: rand(grid).id });
          }
          await sleep(100);
          await modAct({ type: 'endNight' });
          break;
        }
        case 'MINIGAME':
          await playMinigameStep();
          break;
        default:
          await sleep(100);
      }
    }

    async function playMinigameStep() {
      const mg = m().minigame!;
      switch (mg.step) {
        case 'DRAW':
          // Nové minihry robot volí častěji, aby se v každém běhu odehrály.
          const wanted = [!potatoPlayed && 'HOT_POTATO', !quizPlayed && 'QUIZ', !vaultPlayed && 'VAULT'].filter(
            (id): id is string => !!id && id !== mg.id && mg.choices.some((c) => c.id === id),
          );
          if (wanted.length > 0 && chance(0.6)) {
            await modAct({ type: 'chooseMinigame', id: rand(wanted) });
          } else if (mg.canReroll && chance(0.3)) await modAct({ type: 'rerollMinigame' });
          else if (mg.choices.length > 1 && chance(0.3)) await modAct({ type: 'chooseMinigame', id: rand(mg.choices).id });
          else await modAct({ type: 'confirmMinigame' });
          if (m().minigame?.step === 'DRAW') await modAct({ type: 'confirmMinigame' });
          return;
        case 'INTRO': {
          const cards = alive().map((b) => b.pv!.minigame!.secretCard?.length ?? -1);
          if (new Set(cards).size > 1) report.violation(`tajné karty mají různý počet řádků: ${cards.join(',')}`);
          for (const b of alive()) await act(b, { type: 'ackSecretCard' });
          await sleep(100);
          if (chance(0.05)) await modAct({ type: 'skipMinigame' });
          else await modAct({ type: 'startMinigame' });
          return;
        }
        case 'PLAY':
          if (mg.id === 'HOT_POTATO') return playHotPotato();
          if (mg.id === 'QUIZ') return playQuiz();
          if (mg.id === 'VAULT') return playVault();
          return mg.id === 'AUCTION' ? playAuction() : playDuel();
        case 'RESULT':
          await modAct({ type: 'showClue' });
          return;
        case 'CLUE':
          await modAct({ type: 'afterClue' });
          return;
        case 'HANDOFF': {
          const winnerId = mg.handoff!.winnerId;
          let winnerPick: string | null = null;
          for (const b of alive()) {
            const others = b.pv!.players.filter((p) => p.status === 'ALIVE' && p.id !== b.id);
            const target = chance(0.5) ? null : rand(others).id;
            if (b.id === winnerId) winnerPick = target;
            // Telefon vítěze i ostatních musí mít v pohledu předání stejný tvar.
            if (!b.pv!.minigame?.handoff) report.violation(`${b.name}: při předání štítu nemá kartu předání`);
            await act(b, { type: 'handoffPick', targetId: target });
          }
          // Předání trvá 20 s, pak ho server dokončí sám.
          const until = Date.now() + 25_000;
          while (m().minigame?.step === 'HANDOFF' && Date.now() < until) await sleep(200);
          await sleep(150);
          if (m().minigame?.step !== 'DONE') report.violation('předání štítu se po 20 s nedokončilo');
          const expected = winnerPick ?? winnerId;
          if (m().shieldHolderId !== expected) {
            report.violation(`štít drží ${nameOf(m().shieldHolderId ?? '')}, má ${nameOf(expected)}`);
          }
          return;
        }
        case 'DONE':
          await modAct({ type: 'startVote' });
          return;
      }
    }

    async function playAuction() {
      const game = m().minigame!.game as { stage: string; revealed: unknown[]; total: number };
      if (game.stage === 'TALK') {
        for (const g of tippingGhosts()) await act(g, { type: 'minigameInput', payload: { guess: Math.floor(Math.random() * 10 * game.total) } });
        await modAct({ type: 'minigameModerator', payload: { action: 'endStage' } });
      } else if (game.stage === 'BID') {
        for (const b of alive()) if (chance(0.85)) await act(b, { type: 'minigameInput', payload: { bid: Math.floor(Math.random() * 6) } });
        await sleep(100);
        await modAct({ type: 'minigameModerator', payload: { action: 'endStage' } });
      } else if (game.stage === 'REVEAL') {
        await modAct({ type: 'minigameModerator', payload: { action: 'reveal' } });
      } else {
        await sleep(100);
      }
    }

    async function playDuel() {
      const game = m().minigame!.game as { stage: string; duelists: [string, string] };
      const ghostBet = () => rand(['BOTH_SPLIT', 'A_STEALS', 'B_STEALS', 'BOTH_STEAL']);
      if (game.stage === 'TALK') {
        for (const g of tippingGhosts()) await act(g, { type: 'minigameInput', payload: { ghostBet: ghostBet() } });
        await modAct({ type: 'minigameModerator', payload: { action: 'endStage' } });
      } else if (game.stage === 'CHOOSE') {
        for (const b of alive()) {
          if (game.duelists.includes(b.id)) {
            if (chance(0.9)) await act(b, { type: 'minigameInput', payload: { choice: chance(0.6) ? 'SPLIT' : 'STEAL' } });
          } else if (chance(0.85)) {
            await act(b, { type: 'minigameInput', payload: { bet: rand(['BOTH_SPLIT', 'ONE_STEALS', 'BOTH_STEAL']) } });
          }
        }
        for (const g of tippingGhosts()) if (chance(0.5)) await act(g, { type: 'minigameInput', payload: { ghostBet: ghostBet() } });
        await sleep(100);
        await modAct({ type: 'minigameModerator', payload: { action: 'endStage' } });
      } else if (game.stage === 'REVEAL') {
        await modAct({ type: 'minigameModerator', payload: { action: 'reveal' } });
      } else {
        await sleep(100);
      }
    }

    async function playQuiz() {
      quizPlayed = true;
      const game = m().minigame!.game as { stage: string; index: number; correct: number };
      if (game.stage === 'QUESTION') {
        // Hráči odpovídají postupně (Věrný správně s 60 %, Zrádce se řídí svíčkou), duchové náhodně.
        await sleep(200 + Math.random() * 1_500);
        for (const b of [...alive(), ...tippingGhosts()]) {
          const g = b.pv?.minigame?.game as { stage: string; index: number; myAnswer: number | null; hint?: number | null } | null;
          if (!g || g.stage !== 'QUESTION' || g.index !== game.index || g.myAnswer !== null || !chance(0.9)) continue;
          let option = Math.floor(Math.random() * 4);
          if (b.pv!.me.status === 'ALIVE' && b.pv!.me.role === 'TRAITOR' && g.hint != null && chance(0.7)) option = g.hint;
          else if (b.pv!.me.status === 'ALIVE' && b.pv!.me.role === 'LOYAL' && chance(0.6)) option = game.correct;
          const res = await b.socket.emitWithAck('intent', { type: 'minigameInput', payload: { option } });
          // Otázka mohla mezitím skončit – to není chyba.
          const now = m().minigame?.game as { stage?: string; index?: number } | null;
          if (!res.ok && now?.stage === 'QUESTION' && now.index === game.index) {
            report.failedActions.push(`${b.name} odpověď v kvízu: ${res.error}`);
          }
        }
        // Čekání, až otázka skončí (po odpovědi všech nebo po 15 s).
        const until = Date.now() + 17_000;
        while (Date.now() < until) {
          const g = m().minigame?.game as { stage?: string; index?: number } | null;
          if (!g || g.stage !== 'QUESTION' || g.index !== game.index) break;
          await sleep(100);
        }
        return;
      }
      if (game.stage === 'REVEAL') {
        await sleep(300);
        // Moderátor občas mezikrok zkrátí (jen když ještě chvíli běží, ať se netrefí do automatického konce).
        const endsAt = m().minigame?.endsAt ?? 0;
        if (chance(0.5) && endsAt - Date.now() > 1_500) await modAct({ type: 'minigameModerator', payload: { action: 'next' } });
        else await sleep(200);
        return;
      }
      await sleep(100);
    }

    async function playVault() {
      vaultPlayed = true;
      type VaultMod = {
        stage: string;
        code: number[];
        digits: number;
        locksmithId: string | null;
        attemptsLeft: number;
        hints: Record<string, { text: string }[]>;
        reassignable: boolean;
      };
      const game = m().minigame!.game as VaultMod;
      const vaultGame = () => m().minigame?.game as Partial<VaultMod> | null | undefined;
      if (game.stage === 'VOTE') {
        // Nápovědy na telefonu musí sedět s konzolí (falešná tak, jak ji Zrádce vidí).
        for (const b of alive()) {
          const mine = (b.pv?.minigame?.game as { myHints?: string[] } | undefined)?.myHints ?? [];
          const expected = (game.hints[b.id] ?? []).map((h) => h.text);
          if (mine.join('|') !== expected.join('|')) report.violation(`${b.name}: nápovědy trezoru nesedí s konzolí`);
        }
        for (const g of tippingGhosts()) await act(g, { type: 'minigameInput', payload: { tip: 1 + Math.floor(Math.random() * 4) } });
        for (const b of alive()) {
          const targets = (b.pv?.minigame?.game as { voteTargets?: string[] } | undefined)?.voteTargets ?? [];
          if (targets.includes(b.id)) report.violation(`${b.name}: může volit sám sebe za zámečníka`);
          if (targets.length > 0 && chance(0.85)) await act(b, { type: 'minigameInput', payload: { vote: rand(targets) } });
        }
        await sleep(100);
        await modAct({ type: 'minigameModerator', payload: { action: 'endVote' } });
        return;
      }
      if (game.stage !== 'CRACK' || !game.locksmithId) {
        await sleep(100);
        return;
      }
      const locksmith = bots.find((b) => b.id === game.locksmithId)!;

      // Jednou za hru (s návratem hráče): zámečník se odpojí, po 20 s ho moderátor přidělí znovu.
      if (cfg.reconnect && vaultReassign === 'ne' && game.attemptsLeft > 1) {
        locksmith.socket.disconnect();
        const until = Date.now() + 25_000;
        while (Date.now() < until && !vaultGame()?.reassignable) await sleep(200);
        if (!vaultGame()?.reassignable) report.violation(`po odpojení zámečníka ${locksmith.name} nejde přidělit znovu`);
        else await modAct({ type: 'minigameModerator', payload: { action: 'reassign' } });
        const now = vaultGame();
        if (now?.locksmithId === locksmith.id) report.violation('nový zámečník je stejný jako odpojený');
        await rejoin(locksmith);
        vaultReassign = `zámečník ${locksmith.name} se odpojil/a, nový zámečník ${nameOf(now?.locksmithId ?? '')}`;
        return;
      }

      const lv = locksmith.pv?.minigame?.game as { isLocksmith?: boolean } | undefined;
      if (!lv?.isLocksmith) {
        await sleep(100);
        return;
      }
      if (chance(0.05)) {
        await modAct({ type: 'minigameModerator', payload: { action: 'end' } });
        return;
      }
      await sleep(300 + Math.random() * 1_200);
      // Věrný zámečník trefí kód s 50 %, Zrádce s 30 %; jinak část číslic správně.
      const right = chance(locksmith.pv!.me.role === 'TRAITOR' ? 0.3 : 0.5);
      const guess = game.code.map((d) => (right || chance(0.4) ? d : (d + 1 + Math.floor(Math.random() * 9)) % 10));
      const before = game.attemptsLeft;
      await act(locksmith, { type: 'minigameInput', payload: { guess } });
      const until = Date.now() + 3_000;
      while (Date.now() < until && vaultGame()?.stage === 'CRACK' && vaultGame()?.attemptsLeft === before) await sleep(50);
      await sleep(150);
      // Telefony ukazují pokus a správný počet číslic na místě.
      const hits = guess.filter((d, i) => d === game.code[i]).length;
      for (const b of alive()) {
        const attempts = (b.pv?.minigame?.game as { attempts?: { guess: number[]; hits: number }[] } | undefined)?.attempts;
        const last = attempts?.[attempts.length - 1];
        if (b.pv?.minigame?.step === 'PLAY' && (!last || last.hits !== hits || last.guess.join('') !== guess.join(''))) {
          report.violation(`${b.name}: na telefonu nesedí pokus zámečníka`);
        }
      }
    }

    async function playHotPotato() {
      potatoPlayed = true;
      const game = m().minigame!.game as {
        stage: string;
        holderId: string | null;
        players: string[];
        round: number;
        explodeAt: number | null;
      };
      if (game.stage === 'READY') {
        for (const g of tippingGhosts()) {
          const ids = game.players;
          await act(g, { type: 'minigameInput', payload: { survivorId: rand(ids), firstId: rand(ids) } });
        }
        await modAct({ type: 'minigameModerator', payload: { action: 'endStage' } });
        return;
      }
      if (game.stage !== 'BOMB' || !game.holderId) {
        await sleep(150);
        return;
      }
      const holder = bots.find((b) => b.id === game.holderId)!;

      // Jednou za hru (s návratem hráče): držitel se odpojí, bomba musí po 3 s přeskočit.
      if (cfg.reconnect && potatoJump === 'ne' && game.explodeAt && game.explodeAt - Date.now() > 5_000) {
        holder.socket.disconnect();
        const round = game.round;
        await sleep(3_800);
        const now = m().minigame?.game as { holderId: string | null; round: number; stage: string } | null;
        if (now && now.stage === 'BOMB' && now.round === round && now.holderId === holder.id) {
          report.violation(`bomba u odpojeného ${holder.name} po 3 s nepřeskočila`);
        }
        await rejoin(holder);
        potatoJump = `${holder.name} se odpojil/a s bombou, bomba přeskočila na ${nameOf(now?.holderId ?? '')}`;
        return;
      }

      // Držitel bombu chvíli drží (Zrádce dokud ručička není vysoko), pak ji pošle dál.
      const v = holder.pv?.minigame?.game as { amHolder: boolean; canPassTo: string[]; pressure: number } | undefined;
      if (!v || !v.amHolder) {
        await sleep(100);
        return;
      }
      const isTraitor = holder.pv!.me.role === 'TRAITOR';
      if (v.canPassTo.length === 0) report.violation(`${holder.name}: drží bombu, ale nemá komu ji poslat`);
      const wait = isTraitor && v.pressure < 0.8 ? 300 : 300 + Math.random() * 2_500;
      await sleep(wait);
      const still = holder.pv?.minigame?.game as { amHolder: boolean; canPassTo: string[]; pressure: number } | undefined;
      if (!still?.amHolder || (isTraitor && still.pressure < 0.8 && chance(0.7))) return;
      const res = await holder.socket.emitWithAck('intent', {
        type: 'minigameInput',
        payload: { targetId: rand(still.canPassTo) },
      });
      // Bomba mohla mezitím bouchnout – to není chyba.
      if (!res.ok && (m().minigame?.game as { holderId?: string } | null)?.holderId === holder.id) {
        report.failedActions.push(`${holder.name} poslání bomby: ${res.error}`);
      }
    }

    // --- Konec hry: kontroly ---
    await sleep(400);
    const end = m();
    checkAgainstModerator(end, bots, report);
    const aliveTraitors = end.players.filter((p) => p.status === 'ALIVE' && p.role === 'TRAITOR').length;
    const aliveLoyal = end.players.filter((p) => p.status === 'ALIVE' && p.role === 'LOYAL').length;
    const expected = aliveTraitors === 0 ? 'LOYAL' : aliveTraitors >= aliveLoyal ? 'TRAITOR' : '?';
    if (end.winner !== expected) report.violation(`vítěz ${end.winner}, podle živých rolí má být ${expected}`);
    for (const b of bots) {
      const v = b.pv!;
      if (v.phase !== 'ENDED' || v.winner !== end.winner) report.violation(`${b.name}: konec hry nevidí správně`);
      if (v.players.some((p) => !p.revealedRole)) report.violation(`${b.name}: na konci nevidí všechny role`);
      if (v.playerBoard) {
        for (const row of v.playerBoard) {
          if (row.points !== (end.playerPoints[row.id] ?? 0)) report.violation(`${b.name}: žebříček hráčů nesedí u ${nameOf(row.id)}`);
        }
      }
    }
    const usedMinigames = end.history.filter((h) => h.minigame).map((h) => `${h.round}. den ${h.minigame!.name}`);
    if (!cfg.minigames && usedMinigames.length > 0) report.violation('minihra se hrála, i když byly vypnuté');

    const top = Object.entries(end.playerPoints)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => `${nameOf(id)} ${n}`)
      .join(', ');

    return {
      name: cfg.name,
      ok: report.violations.length === 0 && report.failedActions.length === 0,
      winner: end.winner === 'LOYAL' ? 'Věrní' : 'Zrádci',
      rounds: end.round,
      minigames: usedMinigames,
      // Kola s nocí, ve kterých nikdo nezemřel = štít zachránil.
      shieldSaves: end.history.filter((h) => h.murderedId === null && h.round < end.round).length,
      pot: end.pot,
      topPlayers: top || '—',
      ghosts: end.ghosts.map((g) => `${nameOf(g.id)} ${g.canTip ? g.points : 'netipuje'}`).join(', ') || '—',
      reconnected: [reconnected, potatoJump, vaultReassign].filter((x, i) => i === 0 || x !== 'ne').join('; '),
      durationS: Math.round((Date.now() - started) / 1000),
      violations: report.violations,
      failedActions: report.failedActions,
    };
  } finally {
    for (const s of sockets) s.disconnect();
    stopServer(server);
    await sleep(500);
  }
}

// ---------------------------------------------------------------------------

const results: GameSummary[] = [];
for (const [i, cfg] of CONFIGS.entries()) {
  try {
    const r = await playGame(cfg, 3300 + i);
    results.push(r);
    console.log(`\n${r.ok ? 'OK ' : 'CHYBA'} ${r.name} (${r.durationS} s)`);
    console.log(`  vítěz: ${r.winner}, kol: ${r.rounds}, poklad: ${r.pot}`);
    console.log(`  minihry: ${r.minigames.join('; ') || 'žádné'}`);
    console.log(`  záchrany štítem: ${r.shieldSaves}`);
    console.log(`  body hráčů (top 3): ${r.topPlayers}`);
    console.log(`  duchové: ${r.ghosts}`);
    console.log(`  návrat hráče: ${r.reconnected}`);
    for (const v of r.violations) console.log(`  ! ${v}`);
    for (const f of r.failedActions) console.log(`  ! odmítnutá akce: ${f}`);
  } catch (e) {
    console.log(`\nCHYBA ${cfg.name}: ${(e as Error).message}`);
    results.push({ name: cfg.name, ok: false } as GameSummary);
  }
}
const okCount = results.filter((r) => r.ok).length;
console.log(`\nVýsledek: ${okCount} z ${results.length} her bez chyby.`);
process.exit(okCount === results.length ? 0 : 1);
