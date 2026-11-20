import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { viewForPlayer } from '../../game/views.js';
import { as, MOD, must, startedWith } from '../../game/testing.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import {
  HINT_AFTER_MS,
  pickQuestions,
  QUESTION_COUNT,
  QUESTION_MS,
  QUESTION_SETS,
  questionPoints,
  quiz,
  QUIZ_ID,
  REVEAL_MS,
  type QuizGhostView,
  type QuizPlayerView,
  type QuizState,
} from './index.js';

const T0 = 1_000_000;
const rng = (seed = 3) => seededRng(seed);
const IDS = ['a', 'b', 'c', 'd'];
const BANK = QUESTION_SETS.flatMap((s) => s.questions);

const ctx = (memory?: unknown, ghosts: string[] = []): MinigameContext => ({
  players: IDS.map((id, i) => ({ id, role: i === 0 ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts,
  pot: 1000,
  round: 1,
  memory,
});

const started = (ghosts: string[] = [], seed = 3) => quiz.start(quiz.init(ctx(undefined, ghosts), rng(seed), T0), T0, rng(seed));

function ans(s: QuizState, id: string, option: number, ms: number): QuizState {
  const next = quiz.apply(s, id, { option }, s.startedAt + ms, rng());
  if (!next) throw new Error(`odpověď ${id} odmítnuta`);
  return next;
}

const correct = (s: QuizState) => s.questions[s.index].correct;
const wrong = (s: QuizState) => (correct(s) + 1) % 4;

/** Odehraje celý kvíz: `pick(s, id)` vrátí [možnost, ms] nebo null (neodpoví). */
function playAll(s: QuizState, pick: (s: QuizState, id: string) => [number, number] | null): QuizState {
  while (s.stage !== 'DONE') {
    for (const id of IDS) {
      const p = pick(s, id);
      if (p) s = ans(s, id, p[0], p[1]);
    }
    s = quiz.tick(s, s.endsAt, rng());
    if (s.stage === 'REVEAL') s = quiz.tick(s, s.endsAt, rng());
  }
  return s;
}

describe('Insider kvíz – banka otázek', () => {
  it('aspoň 60 platných otázek s unikátním id', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(60);
    expect(new Set(BANK.map((q) => q.id)).size).toBe(BANK.length);
    for (const q of BANK) {
      expect(q.text.length).toBeGreaterThan(5);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(4);
    }
  });

  it('výběr: 7 otázek bez opakování, promíchané možnosti se správnou odpovědí na novém místě', () => {
    const qs = pickQuestions(BANK, [], rng());
    expect(qs).toHaveLength(QUESTION_COUNT);
    for (const q of qs) {
      const orig = BANK.find((b) => b.id === q.id)!;
      expect(q.options[q.correct]).toBe(orig.options[orig.correct]);
      expect([...q.options].sort()).toEqual([...orig.options].sort());
    }
    const used = qs.map((q) => q.id);
    const next = pickQuestions(BANK, used, rng(9));
    expect(next.some((q) => used.includes(q.id))).toBe(false);
  });

  it('další den v téže hře se otázky neopakují (paměť modulu)', () => {
    const s = playAll(started(), () => null);
    const memory = quiz.result(s).memory as { usedIds: string[] };
    const day2 = quiz.init(ctx(memory), rng(11), T0);
    expect(day2.questions.some((q) => memory.usedIds.includes(q.id))).toBe(false);
  });
});

describe('Insider kvíz – pravidla', () => {
  it('body: správně 100 + rychlost až 50, špatně 0', () => {
    expect(questionPoints({ option: 1, ms: 0 }, 1)).toBe(150);
    expect(questionPoints({ option: 1, ms: QUESTION_MS / 2 }, 1)).toBe(125);
    expect(questionPoints({ option: 1, ms: QUESTION_MS }, 1)).toBe(100);
    expect(questionPoints({ option: 2, ms: 0 }, 1)).toBe(0);
    expect(questionPoints(undefined, 1)).toBe(0);
  });

  it('odpověď nejde změnit ani dát mimo otázku', () => {
    let s = started();
    s = ans(s, 'b', 0, 1000);
    expect(quiz.apply(s, 'b', { option: 1 }, T0 + 2000, rng())).toBeNull();
    expect(quiz.apply(s, 'c', { option: 4 }, T0, rng())).toBeNull();
    expect(quiz.apply(s, 'c', { option: 'x' }, T0, rng())).toBeNull();
    expect(quiz.apply(s, 'zz', { option: 1 }, T0, rng())).toBeNull();
  });

  it('svíčka po 3 s; otázka končí po 15 s, mezikrok 4 s, pak další otázka', () => {
    let s = started();
    s = quiz.tick(s, T0 + HINT_AFTER_MS - 1, rng());
    expect(s.hintOn).toBe(false);
    s = quiz.tick(s, T0 + HINT_AFTER_MS, rng());
    expect(s.hintOn).toBe(true);
    s = quiz.tick(s, T0 + QUESTION_MS, rng());
    expect(s).toMatchObject({ stage: 'REVEAL', endsAt: T0 + QUESTION_MS + REVEAL_MS });
    expect(quiz.apply(s, 'b', { option: 0 }, T0 + QUESTION_MS + 1, rng())).toBeNull();
    s = quiz.tick(s, s.endsAt, rng());
    expect(s).toMatchObject({ stage: 'QUESTION', index: 1, hintOn: false });
  });

  it('otázka skončí dřív, když odpoví všichni připojení živí', () => {
    let s = started();
    for (const id of ['a', 'b', 'c']) s = ans(s, id, 0, 500);
    expect(quiz.tick(s, T0 + 600, rng()).stage).toBe('QUESTION');
    expect(quiz.tick(s, T0 + 600, rng(), new Set(['a', 'b', 'c'])).stage).toBe('REVEAL');
  });

  it('moderátor zkrátí mezikrok tlačítkem Další otázka', () => {
    let s = quiz.tick(started(), T0 + QUESTION_MS, rng());
    expect(quiz.applyModerator!(started(), { action: 'next' }, T0, rng())).toBeNull();
    s = quiz.applyModerator!(s, { action: 'next' }, T0 + QUESTION_MS + 100, rng())!;
    expect(s).toMatchObject({ stage: 'QUESTION', index: 1 });
  });

  it('štít nejlepšímu, poklad podle podílu správných odpovědí', () => {
    // b vždy správně a rychle, c vždy správně pomalu, a a d špatně.
    const s = playAll(started(), (st, id) =>
      id === 'b' ? [correct(st), 1000] : id === 'c' ? [correct(st), 9000] : [wrong(st), 2000],
    );
    const r = quiz.result(s);
    expect(r.shieldWinnerId).toBe('b');
    // 14 správných z 28 → 150
    expect(r.potDelta).toBe(150);
    expect(r.clues[0].rows[0]).toMatchObject({ playerId: 'b' });
  });

  it('shoda bodů: rozhoduje menší součet časů; úplná shoda = nikdo', () => {
    // b a c mají stejné body i časy → nikdo
    const tie = playAll(started(), (st, id) => (id === 'b' || id === 'c' ? [correct(st), QUESTION_MS] : null));
    expect(quiz.result(tie).shieldWinnerId).toBeNull();
    // b a c stejné body; b u 2. otázky odpoví špatně rychle, c vůbec → b má menší součet časů
    let s = started();
    s = ans(s, 'b', correct(s), QUESTION_MS);
    s = ans(s, 'c', correct(s), QUESTION_MS);
    s = quiz.tick(s, s.endsAt, rng());
    s = quiz.tick(s, s.endsAt, rng());
    s = ans(s, 'b', wrong(s), 1000); // b odpoví špatně, ale rychle
    s = playAll(s, () => null);
    expect(quiz.result(s).shieldWinnerId).toBe('b');
  });

  it('nikdo nic: štít nikdo, poklad 0', () => {
    const r = quiz.result(playAll(started(), () => null));
    expect(r).toMatchObject({ shieldWinnerId: null, potDelta: 0 });
  });

  it('stopa: rychlé odpovědi do 1,5 s po svíčce a kolik z nich správně', () => {
    const s = playAll(started(), (st, id) =>
      id === 'a' ? [correct(st), HINT_AFTER_MS + 500] : id === 'b' ? [wrong(st), HINT_AFTER_MS + 1000] : [correct(st), 8000],
    );
    const rows = quiz.result(s).clues[1].rows;
    expect(rows[0]).toMatchObject({ playerId: 'a', value: '7× · správně 7×' });
    expect(rows.find((r) => r.playerId === 'b')!.value).toBe('7× · správně 0×');
    expect(rows.find((r) => r.playerId === 'c')!.value).toBe('0× · správně 0×');
  });
});

describe('Insider kvíz – utajení', () => {
  it('Zrádce má svíčku vždy u správné odpovědi, Věrný náhodně', () => {
    let s = started();
    let loyalRight = 0;
    let loyalTotal = 0;
    for (let seed = 1; seed <= 40; seed++) {
      s = started([], seed);
      s = quiz.tick(s, T0 + HINT_AFTER_MS, rng());
      const v = (id: string) => quiz.viewForPlayer(s, id) as QuizPlayerView;
      expect(v('a').hint).toBe(correct(s));
      for (const id of ['b', 'c', 'd']) {
        loyalTotal++;
        if (v(id).hint === correct(s)) loyalRight++;
      }
    }
    expect(loyalRight / loyalTotal).toBeLessThan(0.5);
    expect(loyalRight).toBeGreaterThan(0);
  });

  it('před 3 s nemá nápovědu nikdo; správnou odpověď telefon dostane až po konci otázky', () => {
    let s = started(['g']);
    for (const id of IDS) {
      const v = quiz.viewForPlayer(s, id) as QuizPlayerView;
      expect(v.hint).toBeNull();
      expect(v.correct).toBeNull();
    }
    s = quiz.tick(s, T0 + HINT_AFTER_MS, rng());
    expect((quiz.viewForPlayer(s, 'b') as QuizPlayerView).correct).toBeNull();
    expect((quiz.viewForGhost!(s, 'g') as QuizGhostView).correct).toBeNull();
    s = quiz.tick(s, T0 + QUESTION_MS, rng());
    expect((quiz.viewForPlayer(s, 'b') as QuizPlayerView).correct).toBe(correct(s));
  });

  it('Věrný a Zrádce mají v každém kroku stejný tvar pohledu; duch nemá svíčku', () => {
    let s = started(['g']);
    const keys = (v: unknown) => Object.keys(v as object).sort().join(',');
    let now = T0;
    for (let t = 0; s.stage !== 'DONE' && t < 400; t++) {
      for (const id of IDS) expect(keys(quiz.viewForPlayer(s, id))).toBe(keys(quiz.viewForPlayer(s, 'a')));
      expect(quiz.viewForGhost!(s, 'g')).not.toHaveProperty('hint');
      if (s.stage === 'QUESTION' && t % 3 === 0 && !s.answers[s.index]?.b) s = ans(s, 'b', 0, now - s.startedAt);
      now += 1_000;
      s = quiz.tick(s, now, rng());
    }
    expect(s.stage).toBe('DONE');
  });

  it('průběžné pořadí nezahrnuje body aktuální, ještě otevřené otázky', () => {
    let s = started();
    s = ans(s, 'b', correct(s), 0);
    const v = quiz.viewForPlayer(s, 'c') as QuizPlayerView;
    expect(v.standings.every((r) => r.points === 0)).toBe(true);
    s = quiz.tick(s, s.endsAt, rng());
    expect((quiz.viewForPlayer(s, 'c') as QuizPlayerView).standings[0]).toEqual({ id: 'b', points: 150 });
  });

  it('tajná karta má pro obě role stejný počet řádků', () => {
    const s = started();
    expect(quiz.secretCard(s, 'a')).toHaveLength(quiz.secretCard(s, 'b').length);
  });
});

describe('Insider kvíz – duchové', () => {
  it('hrají mimo soutěž: nejlepší 3, druhý 2, třetí 1, shoda stejné místo', () => {
    let s = started(['g1', 'g2', 'g3', 'g4', 'g5']);
    while (s.stage !== 'DONE') {
      const c = correct(s);
      for (const [g, ms] of [['g1', 0], ['g2', 5000], ['g3', 5000], ['g4', 14000]] as const) {
        s = quiz.applyGhost!(s, g, { option: c }, s.startedAt + ms)!;
      }
      s = quiz.tick(s, s.endsAt, rng());
      s = quiz.tick(s, s.endsAt, rng());
    }
    const r = quiz.result(s);
    expect(r.ghostScores).toEqual({ g1: 3, g2: 2, g3: 2, g4: 0 });
    // Duchové se nepočítají do pořadí o štít.
    expect(r.shieldWinnerId).toBeNull();
    expect(r.clues[0].rows.map((x) => x.playerId).sort()).toEqual(IDS);
  });
});

describe('Insider kvíz ve hře', () => {
  beforeEach(() => registerMinigame(quiz));
  afterEach(() => unregisterMinigame(QUIZ_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celý kvíz přes engine: vítěz štít a +2, poklad roste, správná odpověď nejde do telefonu předčasně', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    const ids = s.players.map((p) => p.id);
    const fast = ids[1];
    let now = T0;
    for (let guard = 0; s.minigame!.step === 'PLAY' && guard < 500; guard++) {
      const st = s.minigame!.state as QuizState;
      if (st.stage === 'QUESTION') {
        for (const id of ids) {
          const v = viewForPlayer(s, id)!.minigame!.game as QuizPlayerView;
          expect(v.correct).toBeNull();
        }
        now += 1000;
        for (const id of ids) {
          const option = id === fast ? st.questions[st.index].correct : (st.questions[st.index].correct + 1) % 4;
          s = at(s, as(id), { type: 'minigameInput', payload: { option } }, now);
        }
      }
      now += 300;
      s = at(s, { kind: 'system' }, { type: 'tick', now, connected: ids }, now);
      if ((s.minigame!.state as QuizState | undefined)?.stage === 'REVEAL') {
        s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'next' } }, now);
      }
    }
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe(fast);
    expect(pointsOf(s, fast, false)).toBe(2);
    // 7 správných z 35 → 300 × 0,2 = 60
    expect(s.pot).toBe(1060);
    expect((s.minigameMemory[QUIZ_ID] as { usedIds: string[] }).usedIds).toHaveLength(QUESTION_COUNT);
  });
});
