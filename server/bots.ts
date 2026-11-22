// Boti na doplnění hráčů (DOC/SPEC.md, Rozšíření 13). Bot je běžný hráč, za kterého tahy volí server.
// Rozhodování je čistá funkce: ze stavu hry řekne, co má bot teď udělat (nebo nic).
import { GHOST_TIP_PHASES } from '../shared/types.js';
import type { Action } from './game/engine.js';
import { pick, type Rng } from './game/random.js';
import { isTippingGhost } from './game/rules.js';
import type { GameState, Player } from './game/state.js';
import { getMinigame } from './minigames/registry.js';

/** Prodleva bota před tahem (ms), aby hrál „lidsky“ a nebyl poznat podle rychlosti. */
export const BOT_DELAY_MS: [number, number] = [1_000, 3_000];

export const BOT_NAME_PREFIX = 'Bot';

/** Jména botů; bot dostane náhodné volné. Je jich tolik, kolik je nejvíc hráčů. */
export const BOT_NAMES = [
  'Leo', 'Rupert', 'Rumi', 'Bolt', 'Jerry', 'Vayena', 'Mickey', 'Rubble', 'Cheis',
  'Marschal', 'Bob', 'Bobek', 'Fík', 'Labrador', 'Sky', 'Edward', 'Pepek', 'Oliva',
];

/** Náhodné volné jméno ze seznamu; když jsou všechna obsazená (hráč si jedno vzal), nejnižší volné „Bot N“. */
export function nextBotName(state: GameState, rng: Rng): string {
  const taken = new Set(state.players.map((p) => p.name.toLocaleLowerCase('cs')));
  const free = BOT_NAMES.filter((n) => !taken.has(n.toLocaleLowerCase('cs')));
  if (free.length > 0) return pick(rng, free);
  for (let n = 1; ; n++) {
    const name = `${BOT_NAME_PREFIX} ${n}`;
    if (!taken.has(name.toLocaleLowerCase('cs'))) return name;
  }
}

const aliveOthers = (state: GameState, me: Player) => state.players.filter((p) => p.status === 'ALIVE' && p.id !== me.id);

/** Tah bota v aktuálním stavu, nebo null (nemá co dělat / už to udělal). */
export function botAction(state: GameState, botId: string, rng: Rng, now: number): Action | null {
  const me = state.players.find((p) => p.id === botId);
  if (!me?.bot || state.paused || state.phase === 'LOBBY' || state.phase === 'ENDED') return null;
  const alive = me.status === 'ALIVE';
  const others = aliveOthers(state, me);

  // Duch-bot tipuje Zrádce.
  if (!alive) {
    if (isTippingGhost(me) && GHOST_TIP_PHASES.includes(state.phase) && !(me.id in state.ghostTips)) {
      const targets = state.players.filter((p) => p.status === 'ALIVE');
      return targets.length > 0 ? { type: 'ghostTip', targetId: pick(rng, targets).id } : null;
    }
    const mg = state.minigame;
    if (mg?.step === 'PLAY' && mg.id && isTippingGhost(me)) {
      const input = getMinigame(mg.id)?.ghostBot?.(mg.state, me.id, rng, now);
      return input === undefined || input === null ? null : { type: 'minigameInput', payload: input };
    }
    return null;
  }

  switch (state.phase) {
    case 'ROLES':
      return me.sawRole ? null : { type: 'ackRole' };
    case 'VOTE':
      return me.id in state.votes || others.length === 0 ? null : { type: 'vote', targetId: pick(rng, others).id };
    case 'NIGHT': {
      if (me.role === 'TRAITOR') {
        if (me.id in state.nightPicks) return null;
        const loyal = others.filter((p) => p.role === 'LOYAL');
        return loyal.length > 0 ? { type: 'nightPick', targetId: pick(rng, loyal).id } : null;
      }
      return me.id in state.nightTips || others.length === 0 ? null : { type: 'nightPick', targetId: pick(rng, others).id };
    }
    case 'FINAL_VOTE':
      if (me.id in state.finalVotes) return null;
      // Zrádce chce hru ukončit, Věrný napůl.
      return { type: 'finalVote', choice: me.role === 'TRAITOR' || rng.int(2) === 0 ? 'END' : 'CONTINUE' };
    case 'MINIGAME': {
      const mg = state.minigame;
      if (!mg) return null;
      if ((mg.step === 'INTRO' || mg.step === 'PLAY') && !mg.secretCardSeen[me.id]) return { type: 'ackSecretCard' };
      if (mg.step === 'HANDOFF' && mg.handoff && !(me.id in mg.handoff.picks)) return { type: 'handoffPick', targetId: null };
      if (mg.step === 'PLAY' && mg.id) {
        const input = getMinigame(mg.id)?.bot?.(mg.state, me.id, rng, now);
        return input === undefined || input === null ? null : { type: 'minigameInput', payload: input };
      }
      return null;
    }
    default:
      return null;
  }
}
