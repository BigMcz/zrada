// Fyzická mise (DOC/SPEC.md, Rozšíření 8): úkol mimo telefony, výsledek zapíše moderátor.
import type { Clue } from '../../../shared/types.js';
import type { MinigameModule } from '../types.js';

export const PHYSICAL_ID = 'PHYSICAL';
export const MAX_TEXT = 300;
export const POT_MIN = -200;
export const POT_MAX = 300;
export const POT_STEP = 50;
export const GHOST_POINTS = 3;

/** Náměty, které konzole nabídne jedním ťuknutím. */
export const SUGGESTIONS = [
  'Postavte z kelímků co nejvyšší věž do 3 minut.',
  'V místnosti jsou schované čtyři lístky s písmeny. Najděte je a složte slovo.',
  'Štafeta: každý donese jeden předmět z druhé strany místnosti, kdo upustí, začíná znovu.',
];

export type PhysicalStage = 'BRIEF' | 'RUN' | 'DONE';

export interface PhysicalOutcome {
  potDelta: number;
  winnerId: string | null;
  ghostId: string | null;
  note: string;
}

export interface PhysicalState {
  players: string[];
  traitors: string[];
  ghosts: string[];
  stage: PhysicalStage;
  /** Zadání; null, dokud ho moderátor nezveřejní. */
  text: string | null;
  outcome: PhysicalOutcome | null;
}

/** Pohled hráče i ducha: stejná pole pro všechny. */
export interface PhysicalPlayerView {
  stage: PhysicalStage;
  text: string | null;
}

export interface PhysicalModeratorView {
  stage: PhysicalStage;
  text: string | null;
  suggestions: string[];
  ghosts: string[];
  traitors: string[];
  outcome: PhysicalOutcome | null;
  potMin: number;
  potMax: number;
  potStep: number;
}

/** Text z konzole: oříznutý, neprázdný (pokud je povinný), nejvýš 300 znaků. */
function cleanText(v: unknown, required: boolean): string | null {
  if (v === undefined || v === null) return required ? null : '';
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  if (t.length > MAX_TEXT || (required && t.length === 0)) return null;
  return t;
}

function parseOutcome(s: PhysicalState, input: Record<string, unknown>): PhysicalOutcome | null {
  const { potDelta, winnerId, ghostId } = input;
  if (typeof potDelta !== 'number' || !Number.isInteger(potDelta) || potDelta % POT_STEP !== 0) return null;
  if (potDelta < POT_MIN || potDelta > POT_MAX) return null;
  if (winnerId !== null && (typeof winnerId !== 'string' || !s.players.includes(winnerId))) return null;
  if (ghostId !== null && (typeof ghostId !== 'string' || !s.ghosts.includes(ghostId))) return null;
  const note = cleanText(input.note, false);
  if (note === null) return null;
  return { potDelta, winnerId: winnerId as string | null, ghostId: ghostId as string | null, note };
}

export const physical: MinigameModule<PhysicalState> = {
  id: PHYSICAL_ID,
  meta: {
    name: 'Fyzická mise',
    minPlayers: 1,
    optIn: true,
    rules: [
      'Moderátor zadá úkol, který plníte mimo telefony.',
      'Odpočet není, konec mise určí moderátor.',
      'Moderátor zapíše výsledek: změnu pokladu a kdo získá štít.',
    ],
    traitorRule: 'Zrádci nemají žádnou výhodu na telefonu. Mohou ale misi nenápadně kazit.',
    ghostRule: 'Moderátor může jednomu duchovi dát 3 body, třeba za nejlepší radu.',
  },

  init(ctx) {
    return {
      players: ctx.players.filter((p) => p.alive).map((p) => p.id),
      traitors: ctx.players.filter((p) => p.alive && p.role === 'TRAITOR').map((p) => p.id),
      ghosts: [...ctx.ghosts],
      stage: 'BRIEF',
      text: null,
      outcome: null,
    };
  },

  secretCard(state, playerId) {
    return state.traitors.includes(playerId)
      ? ['Můžeš misi nenápadně kazit.', 'Nenech se přistihnout.']
      : ['Snaž se, aby mise vyšla.', 'Sleduj, kdo ji kazí.'];
  },

  start: (state) => state,

  // Hráči ani duchové na telefonu nic nezadávají.
  apply: () => null,
  applyGhost: () => null,

  applyModerator(state, input) {
    const i = (input ?? {}) as Record<string, unknown>;
    if (i.action === 'publish' && state.stage === 'BRIEF') {
      const text = cleanText(i.text, true);
      return text === null ? null : { ...state, stage: 'RUN', text };
    }
    if (i.action === 'result' && state.stage === 'RUN') {
      const outcome = parseOutcome(state, i);
      return outcome === null ? null : { ...state, stage: 'DONE', outcome };
    }
    return null;
  },

  tick: (state) => state,
  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const o = state.outcome ?? { potDelta: 0, winnerId: null, ghostId: null, note: '' };
    const rows = [{ label: state.text ?? '', value: '' }];
    if (o.note) rows.push({ label: o.note, value: '' });
    const clues: Clue[] = [{ kind: 'list', title: 'Fyzická mise', rows }];
    const pot = o.potDelta === 0 ? 'Poklad se nemění.' : `Poklad ${o.potDelta > 0 ? '+' : ''}${o.potDelta}.`;
    return {
      shieldWinnerId: o.winnerId,
      potDelta: o.potDelta,
      summary: o.winnerId ? `Mise skončila. ${pot} Štít získává hráč, kterého vybral moderátor.` : `Mise skončila. ${pot} Štít dnes nezíská nikdo.`,
      clues,
      playerPoints: {},
      ghostScores: o.ghostId ? { [o.ghostId]: GHOST_POINTS } : {},
    };
  },

  endsAt: () => null,

  viewForPlayer: (state): PhysicalPlayerView => ({ stage: state.stage, text: state.text }),
  viewForGhost: (state): PhysicalPlayerView => ({ stage: state.stage, text: state.text }),

  viewForScreen: (state): PhysicalPlayerView => ({ stage: state.stage, text: state.text }),

  viewForModerator: (state): PhysicalModeratorView => ({
    stage: state.stage,
    text: state.text,
    suggestions: [...SUGGESTIONS],
    ghosts: [...state.ghosts],
    traitors: [...state.traitors],
    outcome: state.outcome,
    potMin: POT_MIN,
    potMax: POT_MAX,
    potStep: POT_STEP,
  }),
};
