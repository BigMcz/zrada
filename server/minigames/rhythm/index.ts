// Rytmus (DOC/SPEC.md, Rozšíření 6; podrobně DOC/minihry-analyza.md, kap. 3).
import type { Clue } from '../../../shared/types.js';
import type { Rng } from '../../game/random.js';
import type { MinigameModule } from '../types.js';
import { calibration, scoreRound, TOLERANCE_MS, type RoundScore } from './scoring.js';

export const RHYTHM_ID = 'RHYTHM';
/** Odpočet 3–2–1 před první dobou kola. */
export const COUNTDOWN_MS = 3_000;
/** Kolo končí chvíli po poslední době (tolerance ťuknutí + rezerva). */
export const ROUND_TAIL_MS = 600;
/** Jak dlouho server po kole čeká na ťuknutí z telefonů. */
export const COLLECT_MS = 2_000;
export const PAUSE_MS = 4_000;
export const VOTE_MS = 15_000;
/** Posun zobrazení rytmu u zasaženého cíle rušičky. */
export const JAM_MS = 150;
export const POT_MAX = 300;
/** Nejvíc ťuknutí, která server od telefonu za kolo přijme. */
export const MAX_TAPS = 64;

/** Kolo 0 je cvičné. */
export const ROUNDS = [
  { beats: 8, bpm: 80, syncopated: false },
  { beats: 16, bpm: 80, syncopated: false },
  { beats: 16, bpm: 100, syncopated: false },
  { beats: 16, bpm: 120, syncopated: true },
];
/** Kolo, ve kterém působí rušička (volba je před ním). */
export const JAM_ROUND = 2;

export type RhythmStage = 'ROUND' | 'COLLECT' | 'PAUSE' | 'VOTE' | 'DONE';
export type JamOutcome = 'HIT' | 'BLOCKED' | 'UNUSED';

export interface RhythmState {
  players: string[];
  traitors: string[];
  ghosts: string[];
  stage: RhythmStage;
  round: number;
  /** Doby aktuálního kola (čas serveru). */
  beats: number[];
  endsAt: number;
  /** Ťuknutí po kolech: taps[kolo][id]. */
  taps: Record<string, number[]>[];
  scores: Record<string, RoundScore>[];
  calib: Record<string, number>;
  /** Volby před kolem 2: id → koho vybral. */
  picks: Record<string, string>;
  /** Cíl rušičky (poslední volba Zrádce), nebo null. */
  jamTarget: string | null;
  /** Zasažený hráč v kole 2 (jen když rušička zabrala). */
  jammedId: string | null;
  jam: JamOutcome | null;
}

export interface RhythmRow {
  id: string;
  accuracy: number;
}

/** Pohled hráče: stejná pole pro Věrného i Zrádce. */
export interface RhythmPlayerView {
  stage: RhythmStage;
  round: number;
  rounds: number;
  bpm: number;
  beats: number[];
  /** Posun zobrazení rytmu (ms); nenulový jen u zasaženého cíle rušičky v kole 2. */
  displayOffsetMs: number;
  submitted: boolean;
  /** Tvoje přesnost v posledním vyhodnoceném kole. */
  myAccuracy: number | null;
  /** Synchronizace skupiny v posledním vyhodnoceném ostrém kole. */
  groupSync: number | null;
  voteTargets: string[];
  myPick: string | null;
}

export interface RhythmGhostView {
  stage: RhythmStage;
  round: number;
  rounds: number;
  bpm: number;
  beats: number[];
  submitted: boolean;
  myAccuracy: number | null;
  ghostStandings: RhythmRow[];
}

export interface RhythmModeratorView {
  stage: RhythmStage;
  round: number;
  rounds: number;
  bpm: number;
  /** Přesnosti po kolech: accuracy[kolo][id]. */
  accuracy: Record<string, number>[];
  calib: Record<string, number>;
  submitted: string[];
  picks: Record<string, string>;
  traitors: string[];
  jamTarget: string | null;
  jam: JamOutcome | null;
  standings: RhythmRow[];
  ghostStandings: RhythmRow[];
}

/** Doby kola od `start`: odpočet, pak doba po době; se synkopou každá 4. o půl doby dřív. */
export function roundBeats(round: number, start: number): number[] {
  const r = ROUNDS[round];
  const interval = 60_000 / r.bpm;
  const first = start + COUNTDOWN_MS;
  return Array.from({ length: r.beats }, (_, i) => {
    const shift = r.syncopated && (i + 1) % 4 === 0 ? -interval / 2 : 0;
    return Math.round(first + i * interval + shift);
  });
}

const participants = (s: RhythmState) => [...s.players, ...s.ghosts];
const lastRound = ROUNDS.length - 1;

function startRound(s: RhythmState, round: number, now: number): RhythmState {
  const beats = roundBeats(round, now);
  return {
    ...s,
    stage: 'ROUND',
    round,
    beats,
    endsAt: beats[beats.length - 1] + ROUND_TAIL_MS,
    taps: [...s.taps.slice(0, round), {}],
  };
}

/** Vyhodnotí aktuální kolo; kdo neposlal ťuknutí, má kolo vynechané. */
function scoreCurrent(s: RhythmState, now: number): RhythmState {
  const taps = s.taps[s.round] ?? {};
  const scores: Record<string, RoundScore> = {};
  let calib = s.calib;
  if (s.round === 0) {
    calib = Object.fromEntries(participants(s).map((id) => [id, calibration(taps[id] ?? [], s.beats)]));
  }
  for (const id of participants(s)) {
    scores[id] = scoreRound(taps[id] ?? [], s.beats, s.round === 0 ? 0 : calib[id] ?? 0);
  }
  const all = [...s.scores.slice(0, s.round)];
  all[s.round] = scores;
  return { ...s, stage: 'PAUSE', endsAt: now + PAUSE_MS, scores: all, calib, jammedId: s.round === JAM_ROUND ? null : s.jammedId };
}

function afterPause(s: RhythmState, now: number): RhythmState {
  if (s.round >= lastRound) return { ...s, stage: 'DONE' };
  if (s.round + 1 === JAM_ROUND) return { ...s, stage: 'VOTE', endsAt: now + VOTE_MS };
  return startRound(s, s.round + 1, now);
}

/** Konec volby: rušička zabere, pokud na cíl nemíří ochrana žádného Věrného. */
function closeVote(s: RhythmState, now: number): RhythmState {
  let jam: JamOutcome = 'UNUSED';
  let jammedId: string | null = null;
  if (s.jamTarget) {
    const protectedBy = Object.entries(s.picks).filter(([id, target]) => !s.traitors.includes(id) && target === s.jamTarget);
    if (protectedBy.length > 0) jam = 'BLOCKED';
    else {
      jam = 'HIT';
      jammedId = s.jamTarget;
    }
  }
  return startRound({ ...s, jam, jammedId }, JAM_ROUND, now);
}

function submit(s: RhythmState, id: string, input: unknown): RhythmState | null {
  if (s.stage !== 'ROUND' && s.stage !== 'COLLECT') return null;
  const i = (input ?? {}) as { round?: unknown; taps?: unknown };
  if (i.round !== s.round || !Array.isArray(i.taps) || i.taps.length > MAX_TAPS) return null;
  if (!i.taps.every((t) => typeof t === 'number' && Number.isFinite(t))) return null;
  const current = s.taps[s.round] ?? {};
  if (current[id]) return null;
  const taps = [...s.taps];
  taps[s.round] = { ...current, [id]: [...(i.taps as number[])] };
  return { ...s, taps };
}

/** Průměrná přesnost v ostrých kolech, která už jsou vyhodnocená. */
function totals(s: RhythmState, ids: string[]): RhythmRow[] {
  const done = s.scores.slice(1).filter(Boolean);
  return ids
    .map((id) => ({
      id,
      accuracy: done.length === 0 ? 0 : Math.round((done.reduce((sum, r) => sum + (r[id]?.accuracy ?? 0), 0) / done.length) * 10) / 10,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

const worstOf = (s: RhythmState, id: string) => Math.max(...s.scores.slice(1).map((r) => r?.[id]?.worst ?? TOLERANCE_MS));

/** Synchronizace skupiny v kole: průměr přesností živých hráčů. */
function syncOf(s: RhythmState, round: number): number | null {
  const r = s.scores[round];
  if (!r || round === 0 || s.players.length === 0) return null;
  return Math.round((s.players.reduce((sum, id) => sum + (r[id]?.accuracy ?? 0), 0) / s.players.length) * 10) / 10;
}

/** Poslední vyhodnocené kolo (v PAUSE/VOTE/DONE aktuální, jinak předchozí). */
const lastScored = (s: RhythmState) => (s.stage === 'ROUND' || s.stage === 'COLLECT' ? s.round - 1 : s.round);

const tapped = (s: RhythmState, id: string) => s.taps.slice(1).some((r) => (r?.[id]?.length ?? 0) > 0);

const JAM_SENTENCE: Record<JamOutcome, string> = {
  HIT: 'Rušička zasáhla jednoho hráče.',
  BLOCKED: 'Rušičku někdo zablokoval.',
  UNUSED: 'Rušička nebyla použita.',
};

/** Velká obrazovka: skutečné doby kola (bez rušičky) a synchronizace skupiny po kole. */
export interface RhythmScreenView {
  stage: RhythmStage;
  round: number;
  rounds: number;
  bpm: number;
  beats: number[];
  groupSync: number | null;
}

/** Ťuknutí bota pro aktuální kolo (pošle je hned, server je bere i během kola). */
function rhythmBotTaps(state: RhythmState, id: string, rng: Rng): unknown {
  if ((state.stage !== 'ROUND' && state.stage !== 'COLLECT') || state.taps[state.round]?.[id]) return null;
  const lag = (rng.int(2) === 0 ? 1 : -1) * (20 + rng.int(100));
  const taps = state.beats.filter(() => rng.int(100) < 92).map((t) => t + lag + rng.int(60) - 30);
  return { round: state.round, taps };
}

export const rhythm: MinigameModule<RhythmState> = {
  id: RHYTHM_ID,
  meta: {
    name: 'Rytmus',
    minPlayers: 3,
    rules: [
      'Ťukej kamkoli na obrazovku ve chvíli, kdy se prstenec dotkne kruhu.',
      'Nejdřív cvičné kolo, pak 3 kola, každé rychlejší. Ťuknutí navíc se počítá jako chyba.',
      'Před 2. kolem každý vybere jednoho hráče. Co volba znamená, říká tajná karta.',
      'Štít získá nejpřesnější hráč. Poklad dostane až +300 podle synchronizace skupiny.',
    ],
    traitorRule: 'Zrádci mají rušičku. Jednomu hráči na jedno kolo posunou rytmus.',
    ghostRule: 'Duchové hrají celý rytmus mimo soutěž. Nejpřesnější duch 3 body, druhý 2, třetí 1.',
  },

  init(ctx, _rng, now) {
    const players = ctx.players.filter((p) => p.alive).map((p) => p.id);
    return {
      players,
      traitors: ctx.players.filter((p) => p.alive && p.role === 'TRAITOR').map((p) => p.id),
      ghosts: [...ctx.ghosts],
      stage: 'ROUND',
      round: 0,
      beats: roundBeats(0, now),
      endsAt: now,
      taps: [],
      scores: [],
      calib: {},
      picks: {},
      jamTarget: null,
      jammedId: null,
      jam: null,
    };
  },

  secretCard(state, playerId) {
    return state.traitors.includes(playerId)
      ? ['Před 2. kolem pošlete ozvěnu: vybraný hráč bude ťukat mimo.', 'Věrní ho mohou ochránit.']
      : ['Před 2. kolem můžeš jednoho hráče ochránit před rušičkou.', 'Rušička mu posune rytmus.'];
  },

  start(state, now) {
    return startRound(state, 0, now);
  },

  apply(state, playerId, input) {
    if (!state.players.includes(playerId)) return null;
    const pick = (input as { pick?: unknown } | null)?.pick;
    if (pick !== undefined) {
      if (state.stage !== 'VOTE' || typeof pick !== 'string' || pick === playerId || !state.players.includes(pick)) return null;
      const isTraitor = state.traitors.includes(playerId);
      return { ...state, picks: { ...state.picks, [playerId]: pick }, jamTarget: isTraitor ? pick : state.jamTarget };
    }
    return submit(state, playerId, input);
  },

  applyGhost(state, ghostId, input) {
    if (!state.ghosts.includes(ghostId)) return null;
    return submit(state, ghostId, input);
  },

  applyModerator(state, input, now) {
    const action = (input as { action?: unknown } | null)?.action;
    if (action === 'next' && state.stage === 'PAUSE') return afterPause(state, now);
    if (action === 'endVote' && state.stage === 'VOTE') return closeVote(state, now);
    return null;
  },

  tick(state, now, _rng, connected) {
    let s = state;
    if (s.stage === 'ROUND' && now >= s.endsAt) s = { ...s, stage: 'COLLECT', endsAt: now + COLLECT_MS };
    if (s.stage === 'COLLECT') {
      const sent = s.taps[s.round] ?? {};
      const waiting = participants(s).filter((id) => (!connected || connected.has(id)) && !sent[id]);
      if (waiting.length === 0 || now >= s.endsAt) s = scoreCurrent(s, now);
      return s;
    }
    if (s.stage === 'PAUSE' && now >= s.endsAt) return afterPause(s, now);
    if (s.stage === 'VOTE' && now >= s.endsAt) return closeVote(s, now);
    return s;
  },

  isFinished: (state) => state.stage === 'DONE',

  result(state) {
    const rows = totals(state, state.players);
    const top = rows[0];
    let winner: string | null = null;
    if (top && top.accuracy > 0) {
      const leaders = rows
        .filter((r) => r.accuracy === top.accuracy)
        .map((r) => ({ id: r.id, worst: worstOf(state, r.id) }))
        .sort((a, b) => a.worst - b.worst);
      if (leaders.length === 1 || leaders[0].worst < leaders[1].worst) winner = leaders[0].id;
    }
    const sync = rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length;
    const potDelta = sync > 50 ? Math.round((POT_MAX * (sync - 50)) / 50 / 10) * 10 : 0;
    const pct = (v: number | undefined) => `${Math.round(v ?? 0)} %`;

    const clues: Clue[] = [
      {
        kind: 'table',
        title: 'Přesnost v kolech 1 / 2 / 3',
        rows: rows.map((r) => ({
          playerId: r.id,
          label: '',
          value: [1, 2, 3].map((k) => pct(state.scores[k]?.[r.id]?.accuracy)).join(' · '),
        })),
      },
      { kind: 'list', title: 'Rušička', rows: [{ label: JAM_SENTENCE[state.jam ?? 'UNUSED'], value: '' }] },
    ];

    // Duchové, kteří aspoň jednou ťukali: nejpřesnější 3, druhý 2, třetí 1 (shoda = stejné místo).
    const ghostRows = totals(state, state.ghosts).filter((r) => tapped(state, r.id) && r.accuracy > 0);
    const place: Record<string, number> = {};
    ghostRows.forEach((r, i) => {
      place[r.id] = i > 0 && ghostRows[i - 1].accuracy === r.accuracy ? place[ghostRows[i - 1].id] : i + 1;
    });
    const ghostScores = Object.fromEntries(ghostRows.map((r) => [r.id, Math.max(0, 4 - place[r.id])]));

    return {
      shieldWinnerId: winner,
      potDelta,
      summary: winner
        ? `Synchronizace skupiny ${Math.round(sync)} %. Štít získává nejpřesnější hráč.`
        : `Synchronizace skupiny ${Math.round(sync)} %. O první místo se dělí víc hráčů, štít nezíská nikdo.`,
      clues,
      playerPoints: {},
      ghostScores,
    };
  },

  endsAt: (state) => (state.stage === 'DONE' ? null : state.endsAt),

  viewForPlayer(state, playerId): RhythmPlayerView {
    const scored = lastScored(state);
    const live = state.stage === 'ROUND' || state.stage === 'COLLECT';
    return {
      stage: state.stage,
      round: state.round,
      rounds: lastRound,
      bpm: ROUNDS[state.round].bpm,
      beats: [...state.beats],
      displayOffsetMs: live && state.round === JAM_ROUND && state.jammedId === playerId ? JAM_MS : 0,
      submitted: !!state.taps[state.round]?.[playerId] && live,
      myAccuracy: scored >= 0 ? (state.scores[scored]?.[playerId]?.accuracy ?? null) : null,
      groupSync: scored >= 1 ? syncOf(state, scored) : null,
      voteTargets: state.players.filter((id) => id !== playerId),
      myPick: state.picks[playerId] ?? null,
    };
  },

  viewForGhost(state, ghostId): RhythmGhostView {
    const scored = lastScored(state);
    const live = state.stage === 'ROUND' || state.stage === 'COLLECT';
    return {
      stage: state.stage,
      round: state.round,
      rounds: lastRound,
      bpm: ROUNDS[state.round].bpm,
      beats: [...state.beats],
      submitted: !!state.taps[state.round]?.[ghostId] && live,
      myAccuracy: scored >= 0 ? (state.scores[scored]?.[ghostId]?.accuracy ?? null) : null,
      ghostStandings: totals(state, state.ghosts),
    };
  },

  viewForScreen(state): RhythmScreenView {
    const scored = lastScored(state);
    return {
      stage: state.stage,
      round: state.round,
      rounds: lastRound,
      bpm: ROUNDS[state.round].bpm,
      beats: [...state.beats],
      groupSync: scored >= 1 ? syncOf(state, scored) : null,
    };
  },

  // Bot ťuká s chybou 20–120 ms (občas dobu vynechá) a před 2. kolem vybere náhodného hráče.
  bot(state, botId, rng) {
    if (state.stage === 'VOTE') {
      if (botId in state.picks) return null;
      const others = state.players.filter((id) => id !== botId);
      return { pick: others[rng.int(others.length)] };
    }
    return rhythmBotTaps(state, botId, rng);
  },
  ghostBot(state, ghostId, rng) {
    return rhythmBotTaps(state, ghostId, rng);
  },

  viewForModerator(state): RhythmModeratorView {
    return {
      stage: state.stage,
      round: state.round,
      rounds: lastRound,
      bpm: ROUNDS[state.round].bpm,
      accuracy: state.scores.map((r) => Object.fromEntries(Object.entries(r ?? {}).map(([id, sc]) => [id, sc.accuracy]))),
      calib: { ...state.calib },
      submitted: Object.keys(state.taps[state.round] ?? {}),
      picks: { ...state.picks },
      traitors: [...state.traitors],
      jamTarget: state.jamTarget,
      jam: state.jam,
      standings: totals(state, state.players),
      ghostStandings: totals(state, state.ghosts),
    };
  },
};
