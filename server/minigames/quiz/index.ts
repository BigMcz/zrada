// Insider kvíz (DOC/SPEC.md, Rozšíření 4; podrobně DOC/minihry-analyza.md, kap. 6).
import type { Clue } from '../../../shared/types.js';
import { shuffle, type Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';
import generalSet from './questions/obecne.cs.json' with { type: 'json' };

export const QUIZ_ID = 'QUIZ';
export const QUESTION_COUNT = 7;
export const QUESTION_MS = 15_000;
/** Svíčka se rozsvítí 3 s po zobrazení otázky. */
export const HINT_AFTER_MS = 3_000;
export const REVEAL_MS = 4_000;
/** „Rychlá odpověď po svíčce“ pro stopu: do 1,5 s od rozsvícení. */
export const FAST_AFTER_HINT_MS = 1_500;
export const CORRECT_POINTS = 100;
export const SPEED_BONUS = 50;
export const POT_MAX = 300;

/** Otázka v sadě (formát nezávislý na Zradě). */
export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  difficulty?: number;
}

export interface QuizSet {
  set: string;
  name: string;
  lang: string;
  questions: QuizQuestion[];
}

export const QUESTION_SETS: QuizSet[] = [generalSet as QuizSet];

export type QuizStage = 'QUESTION' | 'REVEAL' | 'DONE';

export interface QuizAnswer {
  option: number;
  /** Čas od zobrazení otázky (ms). */
  ms: number;
}

export interface QuizState {
  players: string[];
  traitors: string[];
  ghosts: string[];
  /** Otázky této hry s promíchanými možnostmi. */
  questions: QuizQuestion[];
  index: number;
  stage: QuizStage;
  startedAt: number;
  endsAt: number;
  hintOn: boolean;
  /** Svíčka každého hráče u aktuální otázky (Zrádce správná, Věrný náhodná). */
  hints: Record<string, number>;
  /** Odpovědi hráčů a duchů po otázkách. */
  answers: Record<string, QuizAnswer>[];
  /** Svíčky po otázkách (pro stopu a moderátora). */
  hintLog: Record<string, number>[];
  /** Otázky použité v dřívějších dnech této hry. */
  usedIds: string[];
}

export interface QuizRow {
  id: string;
  points: number;
}

export interface QuizPublicQuestion {
  text: string;
  options: string[];
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce. */
export interface QuizPlayerView {
  stage: QuizStage;
  index: number;
  total: number;
  question: QuizPublicQuestion;
  /** Svíčka; null do 3 s od zobrazení otázky. */
  hint: number | null;
  myAnswer: number | null;
  /** Správná odpověď; jen po skončení otázky. */
  correct: number | null;
  answeredCount: number;
  /** Pořadí z již ukončených otázek. */
  standings: QuizRow[];
}

/** Duch: stejný kvíz bez svíčky, vlastní pořadí duchů. */
export interface QuizGhostView {
  stage: QuizStage;
  index: number;
  total: number;
  question: QuizPublicQuestion;
  myAnswer: number | null;
  correct: number | null;
  standings: QuizRow[];
  ghostStandings: QuizRow[];
}

export interface QuizModeratorView {
  stage: QuizStage;
  index: number;
  total: number;
  question: QuizPublicQuestion;
  correct: number;
  hintOn: boolean;
  hints: Record<string, number>;
  traitors: string[];
  answers: Record<string, QuizAnswer>;
  standings: QuizRow[];
  ghostStandings: QuizRow[];
}

export function questionPoints(answer: QuizAnswer | undefined, correct: number): number {
  if (!answer || answer.option !== correct) return 0;
  const left = Math.min(1, Math.max(0, 1 - answer.ms / QUESTION_MS));
  return CORRECT_POINTS + Math.round(SPEED_BONUS * left);
}

/** Výběr otázek: bez těch, co už v této hře padly; možnosti se promíchají. */
export function pickQuestions(bank: QuizQuestion[], used: string[], rng: Rng): QuizQuestion[] {
  let pool = bank.filter((q) => !used.includes(q.id));
  if (pool.length < QUESTION_COUNT) pool = bank;
  return shuffle(rng, pool)
    .slice(0, QUESTION_COUNT)
    .map((q) => {
      const order = shuffle(rng, q.options.map((_, i) => i));
      return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) };
    });
}

/** Body z otázek 0..`upTo` (včetně). */
function totals(s: QuizState, ids: string[], upTo: number): QuizRow[] {
  return ids
    .map((id) => {
      let points = 0;
      for (let i = 0; i <= upTo && i < s.questions.length; i++) points += questionPoints(s.answers[i]?.[id], s.questions[i].correct);
      return { id, points };
    })
    .sort((a, b) => b.points - a.points);
}

/** Poslední otázka, jejíž výsledek je veřejný. */
const lastClosed = (s: QuizState) => (s.stage === 'QUESTION' ? s.index - 1 : s.index);

/** Součet časů odpovědí; bez odpovědi se počítá celý čas otázky. */
function totalTime(s: QuizState, id: string): number {
  return s.questions.reduce((sum, _, i) => sum + (s.answers[i]?.[id]?.ms ?? QUESTION_MS), 0);
}

/** Místa s ohledem na shodu bodů (1, 1, 3, …). */
function places(rows: QuizRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  rows.forEach((r, i) => {
    out[r.id] = i > 0 && rows[i - 1].points === r.points ? out[rows[i - 1].id] : i + 1;
  });
  return out;
}

function startQuestion(s: QuizState, index: number, now: number, rng: Rng): QuizState {
  const q = s.questions[index];
  const hints = Object.fromEntries(
    s.players.map((id) => [id, s.traitors.includes(id) ? q.correct : rng.int(q.options.length)]),
  );
  return {
    ...s,
    index,
    stage: 'QUESTION',
    startedAt: now,
    endsAt: now + QUESTION_MS,
    hintOn: false,
    hints,
    hintLog: [...s.hintLog.slice(0, index), hints],
    answers: [...s.answers.slice(0, index), {}],
  };
}

function closeQuestion(s: QuizState, now: number): QuizState {
  return { ...s, stage: 'REVEAL', endsAt: now + REVEAL_MS, hintOn: true };
}

function nextAfterReveal(s: QuizState, now: number, rng: Rng): QuizState {
  if (s.index + 1 >= s.questions.length) return { ...s, stage: 'DONE' };
  return startQuestion(s, s.index + 1, now, rng);
}

function answer(s: QuizState, id: string, input: unknown, now: number): QuizState | null {
  if (s.stage !== 'QUESTION') return null;
  const option = (input as { option?: unknown } | null)?.option;
  if (typeof option !== 'number' || !Number.isInteger(option) || option < 0 || option >= s.questions[s.index].options.length) {
    return null;
  }
  const current = s.answers[s.index] ?? {};
  if (current[id]) return null; // odpověď nejde změnit
  const ms = Math.min(QUESTION_MS, Math.max(0, now - s.startedAt));
  const answers = [...s.answers];
  answers[s.index] = { ...current, [id]: { option, ms } };
  return { ...s, answers };
}

const publicQuestion = (s: QuizState): QuizPublicQuestion => ({
  text: s.questions[s.index].text,
  options: [...s.questions[s.index].options],
});

export const quiz: MinigameModule<QuizState> = {
  id: QUIZ_ID,
  meta: {
    name: 'Insider kvíz',
    minPlayers: 3,
    rules: [
      `${QUESTION_COUNT} otázek, na každou 15 s. Odpověď nejde změnit.`,
      'Po 3 s se u jedné možnosti rozsvítí svíčka – nápověda.',
      'Správně 100 bodů a až 50 navíc za rychlost.',
      'Štít získá nejlepší hráč. Poklad dostane až +300 podle toho, kolik odpovědí bylo správně.',
    ],
    traitorRule: 'Nápověda ukazuje Zrádcům správnou odpověď. Věrným ukazuje náhodnou.',
    ghostRule: 'Duchové hrají stejný kvíz bez svíčky. Nejlepší duch 3 body, druhý 2, třetí 1.',
  },

  init(ctx, rng, now) {
    const used = (ctx.memory as { usedIds?: string[] } | undefined)?.usedIds ?? [];
    const bank = QUESTION_SETS.flatMap((set) => set.questions);
    return {
      players: ctx.players.filter((p) => p.alive).map((p) => p.id),
      traitors: ctx.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id),
      ghosts: [...ctx.ghosts],
      questions: pickQuestions(bank, used, rng),
      index: 0,
      stage: 'QUESTION',
      startedAt: now,
      endsAt: now + QUESTION_MS,
      hintOn: false,
      hints: {},
      answers: [],
      hintLog: [],
      usedIds: used,
    };
  },

  secretCard(state, playerId) {
    return state.traitors.includes(playerId)
      ? ['Tvoje nápověda je vždy správná.', 'Nebuď ale až moc dobrý.']
      : ['Tvoje nápověda je náhodná.', 'Spoléhej na sebe.'];
  },

  start(state, now, rng) {
    return startQuestion(state, 0, now, rng);
  },

  apply(state, playerId, input, now) {
    if (!state.players.includes(playerId)) return null;
    return answer(state, playerId, input, now);
  },

  applyGhost(state, ghostId, input, now) {
    return answer(state, ghostId, input, now);
  },

  applyModerator(state, input, now, rng) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'next' && state.stage === 'REVEAL') return nextAfterReveal(state, now, rng);
    return null;
  },

  tick(state, now, rng, connected) {
    let s = state;
    if (s.stage === 'QUESTION') {
      if (!s.hintOn && now >= s.startedAt + HINT_AFTER_MS) s = { ...s, hintOn: true };
      const answered = s.answers[s.index] ?? {};
      const waiting = s.players.filter((id) => (!connected || connected.has(id)) && !answered[id]);
      if (now >= s.endsAt || waiting.length === 0) s = closeQuestion(s, now);
    } else if (s.stage === 'REVEAL' && now >= s.endsAt) {
      s = nextAfterReveal(s, now, rng);
    }
    return s;
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const last = state.questions.length - 1;
    const rows = totals(state, state.players, last);
    const top = rows[0];
    const leaders = rows.filter((r) => r.points === top.points);
    let winner: string | null = null;
    if (top.points > 0) {
      const times = leaders.map((r) => ({ id: r.id, t: totalTime(state, r.id) })).sort((a, b) => a.t - b.t);
      if (times.length === 1 || times[0].t < times[1].t) winner = times[0].id;
    }

    let correctCount = 0;
    state.questions.forEach((q, i) => {
      for (const id of state.players) if (state.answers[i]?.[id]?.option === q.correct) correctCount++;
    });
    const share = correctCount / (state.players.length * state.questions.length);
    const potDelta = Math.round((POT_MAX * share) / 10) * 10;

    const fastRows = state.players.map((id) => {
      let fast = 0;
      let fastCorrect = 0;
      state.questions.forEach((q, i) => {
        const a = state.answers[i]?.[id];
        if (a && a.ms >= HINT_AFTER_MS && a.ms <= HINT_AFTER_MS + FAST_AFTER_HINT_MS) {
          fast++;
          if (a.option === q.correct) fastCorrect++;
        }
      });
      return { id, fast, fastCorrect };
    });

    const clues: Clue[] = [
      {
        kind: 'table',
        title: 'Konečné pořadí kvízu',
        rows: rows.map((r) => ({ playerId: r.id, label: '', value: `${r.points} b.` })),
      },
      {
        kind: 'table',
        title: 'Odpověděl/a do 1,5 s po svíčce · z toho správně',
        rows: fastRows
          .sort((a, b) => b.fastCorrect - a.fastCorrect || b.fast - a.fast)
          .map((r) => ({ playerId: r.id, label: '', value: `${r.fast}× · správně ${r.fastCorrect}×` })),
      },
    ];

    // Duchové: kdo aspoň jednou odpověděl; nejlepší 3, druhý 2, třetí 1 (shoda = stejné místo).
    const ghostRows = totals(state, state.ghosts, last).filter((r) =>
      state.answers.some((a) => a?.[r.id] !== undefined),
    );
    const ghostPlaces = places(ghostRows);
    const ghostScores = Object.fromEntries(
      ghostRows.map((r) => [r.id, r.points > 0 ? Math.max(0, 4 - ghostPlaces[r.id]) : 0]),
    );

    return {
      shieldWinnerId: winner,
      potDelta,
      summary: winner
        ? `Správně bylo ${correctCount} z ${state.players.length * state.questions.length} odpovědí. Štít získává nejlepší hráč kvízu.`
        : `Správně bylo ${correctCount} z ${state.players.length * state.questions.length} odpovědí. O první místo se dělí víc hráčů, štít zůstává v trezoru.`,
      clues,
      playerPoints: {},
      ghostScores,
      memory: { usedIds: [...state.usedIds, ...state.questions.map((q) => q.id)] },
    };
  },

  endsAt: (state) => (state.stage === 'DONE' ? null : state.endsAt),

  viewForPlayer(state, playerId): QuizPlayerView {
    const closed = state.stage !== 'QUESTION';
    return {
      stage: state.stage,
      index: state.index,
      total: state.questions.length,
      question: publicQuestion(state),
      hint: state.hintOn ? (state.hints[playerId] ?? 0) : null,
      myAnswer: state.answers[state.index]?.[playerId]?.option ?? null,
      correct: closed ? state.questions[state.index].correct : null,
      answeredCount: state.players.filter((id) => state.answers[state.index]?.[id]).length,
      standings: totals(state, state.players, lastClosed(state)),
    };
  },

  viewForGhost(state, ghostId): QuizGhostView {
    const closed = state.stage !== 'QUESTION';
    return {
      stage: state.stage,
      index: state.index,
      total: state.questions.length,
      question: publicQuestion(state),
      myAnswer: state.answers[state.index]?.[ghostId]?.option ?? null,
      correct: closed ? state.questions[state.index].correct : null,
      standings: totals(state, state.players, lastClosed(state)),
      ghostStandings: totals(state, state.ghosts, lastClosed(state)),
    };
  },

  viewForModerator(state): QuizModeratorView {
    return {
      stage: state.stage,
      index: state.index,
      total: state.questions.length,
      question: publicQuestion(state),
      correct: state.questions[state.index].correct,
      hintOn: state.hintOn,
      hints: { ...state.hints },
      traitors: [...state.traitors],
      answers: { ...(state.answers[state.index] ?? {}) },
      standings: totals(state, state.players, lastClosed(state)),
      ghostStandings: totals(state, state.ghosts, lastClosed(state)),
    };
  },
};
