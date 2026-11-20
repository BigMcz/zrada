import type { ModeratorMinigameView, PlayerMinigameView } from '../../shared/types.js';
import { isTippingGhost } from '../game/rules.js';
import type { GameState, Player } from '../game/state.js';
import { manualChoices } from './framework.js';
import { getMinigame } from './registry.js';

/** Kroky, ve kterých už existuje stav modulu a dá se ukázat průběh hry. */
const GAME_STEPS = new Set(['PLAY', 'RESULT', 'CLUE', 'HANDOFF', 'DONE']);
const CLUE_STEPS = new Set(['CLUE', 'HANDOFF', 'DONE']);

function publicResult(state: GameState): PlayerMinigameView['result'] {
  const active = state.minigame!;
  const r = active.result;
  if (!r || active.step === 'PLAY') return null;
  const record = state.history.find((h) => h.round === state.round)?.minigame;
  return {
    summary: r.summary,
    shieldWinnerId: r.shieldWinnerId,
    potDelta: r.potDelta,
    ghostWinnerIds: record ? [...record.ghostWinnerIds] : [],
  };
}

/**
 * Minihra v pohledu hráče. Pro Věrného i Zrádce stejná pole; výhoda Zrádců je jen v textu
 * tajné karty a v hodnotách, které modul vrací ve stejně pojmenovaných polích.
 */
export function playerMinigameView(state: GameState, me: Player): PlayerMinigameView | undefined {
  const active = state.minigame;
  if (state.phase !== 'MINIGAME' || !active) return undefined;
  const module = active.id ? getMinigame(active.id) : undefined;
  const alive = me.status === 'ALIVE';
  const hasState = active.state !== null && active.state !== undefined;

  let game: unknown = null;
  if (module && hasState && GAME_STEPS.has(active.step)) {
    if (alive) game = module.viewForPlayer(active.state, me.id);
    else if (isTippingGhost(me) && module.viewForGhost) game = module.viewForGhost(active.state, me.id);
  }

  let endsAt: number | null = null;
  if (module && hasState && active.step === 'PLAY') endsAt = module.endsAt(active.state);
  if (active.step === 'HANDOFF' && active.handoff) endsAt = active.handoff.endsAt;

  return {
    id: module ? module.id : null,
    name: module ? module.meta.name : '',
    step: active.step,
    rules: module ? [...module.meta.rules] : [],
    traitorRule: module ? module.meta.traitorRule : '',
    secretCard: alive && module && hasState ? module.secretCard(active.state, me.id) : null,
    cardSeen: active.secretCardSeen[me.id] === true,
    game,
    endsAt,
    result: publicResult(state),
    clues: active.result && CLUE_STEPS.has(active.step) ? structuredClone(active.result.clues) : null,
    handoff:
      active.step === 'HANDOFF' && active.handoff && alive
        ? {
            isWinner: active.handoff.winnerId === me.id,
            myPick: active.handoff.picks[me.id] ?? null,
            endsAt: active.handoff.endsAt,
          }
        : null,
  };
}

/** Moderátor vidí všechno včetně skrytých údajů modulu a komu byl štít darován. */
export function moderatorMinigameView(state: GameState): ModeratorMinigameView | undefined {
  const active = state.minigame;
  if (state.phase !== 'MINIGAME' || !active) return undefined;
  const module = active.id ? getMinigame(active.id) : undefined;
  const hasState = active.state !== null && active.state !== undefined;

  let endsAt: number | null = null;
  if (module && hasState && active.step === 'PLAY') endsAt = module.endsAt(active.state);
  if (active.step === 'HANDOFF' && active.handoff) endsAt = active.handoff.endsAt;

  return {
    id: module ? module.id : null,
    name: module ? module.meta.name : '',
    step: active.step,
    rerollsLeft: active.rerollsLeft,
    choices: active.step === 'DRAW' ? manualChoices(state).map((m) => ({ id: m.id, name: m.meta.name })) : [],
    secretCardSeen: { ...active.secretCardSeen },
    game: module && hasState && active.step !== 'DRAW' ? module.viewForModerator(active.state) : null,
    endsAt,
    result: publicResult(state),
    clues: active.result ? structuredClone(active.result.clues) : null,
    handoff: active.handoff
      ? { winnerId: active.handoff.winnerId, picks: { ...active.handoff.picks }, endsAt: active.handoff.endsAt }
      : null,
  };
}
