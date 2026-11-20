// Testovací minihra „Tlačítko“ – jen pro testy rámce, do hry se nikdy neregistruje.
import type { MinigameModule } from './types.js';

export interface ButtonState {
  players: string[];
  traitors: string[];
  presses: string[];
  endsAt: number;
  ghostGuesses: Record<string, string>;
}

export const TEST_DURATION_MS = 30_000;

export function makeButtonModule(id = 'TEST', minPlayers = 3): MinigameModule<ButtonState> {
  return {
    id,
    meta: {
      name: `Tlačítko ${id}`,
      minPlayers,
      rules: ['Kdo zmáčkne první, vyhraje štít.'],
      traitorRule: 'Zrádci nemají žádnou výhodu.',
    },
    init(ctx) {
      return {
        players: ctx.players.filter((p) => p.alive).map((p) => p.id),
        traitors: ctx.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id),
        presses: [],
        endsAt: 0,
        ghostGuesses: {},
      };
    },
    secretCard(state, playerId) {
      return state.traitors.includes(playerId)
        ? ['Jsi Zrádce, mačkej pomalu.', 'Nikdo to nesmí poznat.']
        : ['Jsi Věrný, mačkej rychle.', 'Hodně štěstí.'];
    },
    start(state, now) {
      return { ...state, endsAt: now + TEST_DURATION_MS };
    },
    apply(state, playerId, input) {
      if (input !== 'press' || state.presses.includes(playerId) || !state.players.includes(playerId)) return null;
      return { ...state, presses: [...state.presses, playerId] };
    },
    // Moderátor ukončí hru dřív: kdo nezmáčkl, už nehraje.
    applyModerator(state, input) {
      return input === 'end' ? { ...state, players: [...state.presses] } : null;
    },
    tick(state) {
      return state;
    },
    isFinished(state) {
      return state.presses.length === state.players.length;
    },
    result(state) {
      return {
        shieldWinnerId: state.presses[0] ?? null,
        potDelta: 100,
        summary: state.presses.length > 0 ? 'Někdo zmáčkl první.' : 'Nikdo nezmáčkl.',
        clues: [{ kind: 'list', title: 'Pořadí', rows: state.presses.map((id, i) => ({ playerId: id, label: `${i + 1}.`, value: id })) }],
        playerPoints: {},
        ghostScores: {},
      };
    },
    endsAt(state) {
      return state.endsAt || null;
    },
    viewForPlayer(state, playerId) {
      return { pressed: state.presses.includes(playerId), count: state.presses.length };
    },
    viewForModerator(state) {
      return { presses: [...state.presses] };
    },
  };
}

/** Varianta, která končí vypršením času (pro test časovačů). */
export function makeTimedButtonModule(id = 'TIMED'): MinigameModule<ButtonState & { timedOut: boolean }> {
  const base = makeButtonModule(id) as unknown as MinigameModule<ButtonState & { timedOut: boolean }>;
  return {
    ...base,
    init: (ctx, rng, now) => ({ ...(base.init(ctx, rng, now) as ButtonState), timedOut: false }),
    tick: (state, now) => (state.endsAt > 0 && now >= state.endsAt ? { ...state, timedOut: true } : state),
    isFinished: (state) => state.timedOut || state.presses.length === state.players.length,
  };
}
