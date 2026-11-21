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
  COLLECT_MS,
  JAM_MS,
  JAM_ROUND,
  rhythm,
  RHYTHM_ID,
  roundBeats,
  ROUNDS,
  type RhythmGhostView,
  type RhythmPlayerView,
  type RhythmState,
} from './index.js';
import { calibration, pairTaps, scoreRound } from './scoring.js';

const T0 = 1_000_000;
const rng = () => seededRng(3);
/** a = Zrádce, b–e Věrní. */
const IDS = ['a', 'b', 'c', 'd', 'e'];

const ctx = (ghosts: string[] = [], traitors = ['a']): MinigameContext => ({
  players: IDS.map((id) => ({ id, role: traitors.includes(id) ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts,
  pot: 1000,
  round: 1,
  memory: undefined,
});

const started = (ghosts: string[] = [], traitors = ['a']) => rhythm.start(rhythm.init(ctx(ghosts, traitors), rng(), T0), T0, rng());

const shifted = (beats: number[], ms: number) => beats.map((b) => b + ms);

/**
 * Odehraje aktuální kolo: `tapsFor(id, beats)` vrátí ťuknutí, nebo null (nepošle).
 * Vrátí stav v mezikroku po kole.
 */
function playRound(s: RhythmState, tapsFor: (id: string, beats: number[]) => number[] | null): RhythmState {
  expect(s.stage).toBe('ROUND');
  for (const id of [...s.players, ...s.ghosts]) {
    const taps = tapsFor(id, s.beats);
    if (!taps) continue;
    const next = s.players.includes(id)
      ? rhythm.apply(s, id, { round: s.round, taps }, s.endsAt, rng())
      : rhythm.applyGhost!(s, id, { round: s.round, taps }, s.endsAt);
    if (!next) throw new Error(`ťuknutí ${id} odmítnuta`);
    s = next;
  }
  s = rhythm.tick(s, s.endsAt, rng());
  if (s.stage === 'COLLECT') s = rhythm.tick(s, s.endsAt, rng());
  expect(s.stage).toBe('PAUSE');
  return s;
}

/** Celý rytmus: cvičné kolo přesně (kalibrace 0), v ostrých kolech daná odchylka. */
function playAll(s: RhythmState, err: Record<string, number | null>, beforeJam?: (s: RhythmState) => RhythmState): RhythmState {
  while (s.stage !== 'DONE') {
    if (s.stage === 'VOTE') {
      if (beforeJam) s = beforeJam(s);
      s = rhythm.tick(s, s.endsAt, rng());
      continue;
    }
    s = playRound(s, (id, beats) => (err[id] === null || err[id] === undefined ? null : shifted(beats, s.round === 0 ? 0 : err[id]!)));
    s = rhythm.tick(s, s.endsAt, rng());
  }
  return s;
}

describe('Rytmus – hodnocení ťuknutí', () => {
  const beats = roundBeats(1, 0);

  it('přesně = 100 %, o 100 ms vedle = 60 %, nic = 0 %', () => {
    expect(scoreRound(beats, beats)).toEqual({ accuracy: 100, worst: 0 });
    expect(scoreRound(shifted(beats, 100), beats)).toEqual({ accuracy: 60, worst: 100 });
    expect(scoreRound(shifted(beats, -100), beats).accuracy).toBe(60);
    expect(scoreRound([], beats)).toEqual({ accuracy: 0, worst: 250 });
  });

  it('ťuknutí navíc se počítají jako chyba 250 ms; kulomet nepomůže', () => {
    // 16 přesných + 16 navíc daleko od dob → průměr (16 × 0 + 16 × 250) / 32 = 125 ms → 50 %.
    const extra = beats.map((b) => b + 375);
    expect(scoreRound([...beats, ...extra], beats).accuracy).toBe(50);
    const gun: number[] = [];
    for (let t = beats[0] - 200; t < beats[beats.length - 1] + 200; t += 50) gun.push(t);
    expect(scoreRound(gun, beats).accuracy).toBeLessThan(30);
  });

  it('párování: každá doba nejbližší nepoužité ťuknutí do ±250 ms', () => {
    const p = pairTaps([90, 610, 1000], [100, 600]);
    expect(p.offsets.sort((x, y) => x - y)).toEqual([-10, 10]);
    expect(p).toMatchObject({ missed: 0, extra: 1 });
    expect(pairTaps([90, 110], [100, 300]).offsets.sort((x, y) => x - y)).toEqual([-190, -10]);
    expect(pairTaps([400], [100])).toMatchObject({ offsets: [], missed: 1, extra: 1 });
  });

  it('kalibrace: medián odchylek, nejvýš ±150 ms, bez ťuknutí 0', () => {
    const practice = roundBeats(0, 0);
    expect(calibration(shifted(practice, 80), practice)).toBe(80);
    expect(calibration(shifted(practice, -40), practice)).toBe(-40);
    expect(calibration(shifted(practice, 200), practice)).toBe(150);
    expect(calibration([], practice)).toBe(0);
    expect(scoreRound(shifted(beats, 80), beats, 80).accuracy).toBe(100);
  });

  it('doby: tempo 80 / 100 / 120 BPM, v kole 3 každá 4. o půl doby dřív', () => {
    const gaps = (r: number) => {
      const b = roundBeats(r, 0);
      return b.slice(1).map((x, i) => x - b[i]);
    };
    expect(roundBeats(0, 0)).toHaveLength(8);
    expect(new Set(gaps(1))).toEqual(new Set([750]));
    expect(new Set(gaps(2))).toEqual(new Set([600]));
    expect(gaps(3).slice(0, 4)).toEqual([500, 500, 250, 750]);
  });
});

describe('Rytmus – průběh', () => {
  it('cvičné kolo → 3 kola, volba jen před kolem 2, pak konec', () => {
    let s = started();
    const seen: string[] = [];
    let guard = 0;
    while (s.stage !== 'DONE' && guard++ < 50) {
      seen.push(`${s.stage}${s.round}`);
      if (s.stage === 'ROUND') s = playRound(s, (_, beats) => beats);
      else s = rhythm.tick(s, s.endsAt, rng());
    }
    expect(seen).toEqual(['ROUND0', 'PAUSE0', 'ROUND1', 'PAUSE1', 'VOTE1', 'ROUND2', 'PAUSE2', 'ROUND3', 'PAUSE3']);
    expect(s.stage).toBe('DONE');
  });

  it('ťuknutí: jen pro aktuální kolo, jednou, čísla, nejvýš 64', () => {
    const s = started();
    const ok = { round: 0, taps: s.beats };
    expect(rhythm.apply(s, 'b', { round: 1, taps: [] }, T0, rng())).toBeNull();
    expect(rhythm.apply(s, 'b', { round: 0, taps: ['x'] }, T0, rng())).toBeNull();
    expect(rhythm.apply(s, 'b', { round: 0, taps: Array(65).fill(1) }, T0, rng())).toBeNull();
    const once = rhythm.apply(s, 'b', ok, T0, rng())!;
    expect(rhythm.apply(once, 'b', ok, T0, rng())).toBeNull();
    expect(rhythm.apply(s, 'zzz', ok, T0, rng())).toBeNull();
  });

  it('server po kole čeká na připojené nejvýš 2 s; odpojeného nečeká; kdo nepošle, má 0 %', () => {
    let s = started();
    for (const id of ['a', 'b', 'c']) s = rhythm.apply(s, id, { round: 0, taps: s.beats }, s.endsAt, rng())!;
    const online = new Set(['a', 'b', 'c', 'd']); // e je odpojený
    s = rhythm.tick(s, s.endsAt, rng(), online);
    expect(s.stage).toBe('COLLECT');
    const collectEnd = s.endsAt;
    expect(rhythm.tick(s, collectEnd - 1, rng(), online).stage).toBe('COLLECT');
    // d pošle pozdě, ale do 2 s → hned vyhodnoceno, na e se nečeká.
    s = rhythm.apply(s, 'd', { round: 0, taps: s.beats }, collectEnd - COLLECT_MS + 500, rng())!;
    s = rhythm.tick(s, collectEnd - COLLECT_MS + 600, rng(), online);
    expect(s.stage).toBe('PAUSE');
    expect(s.scores[0].d.accuracy).toBe(100);
    expect(s.scores[0].e.accuracy).toBe(0);
  });

  it('kalibrace z cvičného kola se odečítá v ostrých kolech', () => {
    // b ťuká stále o 90 ms později → po kalibraci 100 %; c cvičné kolo vynechá → bez kalibrace 64 %.
    let s = started();
    s = playRound(s, (id, beats) => (id === 'c' ? null : shifted(beats, id === 'b' ? 90 : 0)));
    expect(s.calib.b).toBe(90);
    expect(s.calib.c).toBe(0);
    s = rhythm.tick(s, s.endsAt, rng());
    s = playRound(s, (id, beats) => shifted(beats, id === 'b' || id === 'c' ? 90 : 0));
    expect(s.scores[1].b.accuracy).toBe(100);
    expect(s.scores[1].c.accuracy).toBe(64);
  });

  it('moderátor zkrátí mezikrok a ukončí volbu dřív', () => {
    let s = playRound(started(), (_, beats) => beats);
    s = rhythm.applyModerator!(s, { action: 'next' }, T0 + 20_000, rng())!;
    expect(s).toMatchObject({ stage: 'ROUND', round: 1 });
    expect(rhythm.applyModerator!(s, { action: 'next' }, T0, rng())).toBeNull();
    s = playRound(s, (_, beats) => beats);
    s = rhythm.applyModerator!(s, { action: 'next' }, T0 + 40_000, rng())!;
    expect(s.stage).toBe('VOTE');
    s = rhythm.applyModerator!(s, { action: 'endVote' }, T0 + 41_000, rng())!;
    expect(s).toMatchObject({ stage: 'ROUND', round: JAM_ROUND });
  });
});

describe('Rytmus – rušička', () => {
  const toVote = (s: RhythmState) => {
    while (s.stage !== 'VOTE') s = s.stage === 'ROUND' ? playRound(s, (_, b) => b) : rhythm.tick(s, s.endsAt, rng());
    return s;
  };
  const pick = (s: RhythmState, id: string, target: string) => rhythm.apply(s, id, { pick: target }, T0, rng());

  it('bez ochrany zasáhne cíl: v kole 2 se mu posune zobrazení o 150 ms, ostatním ne', () => {
    let s = toVote(started());
    expect(pick(s, 'a', 'a')).toBeNull();
    expect(pick(s, 'a', 'zzz')).toBeNull();
    s = pick(s, 'a', 'c')!;
    s = pick(s, 'b', 'd')!;
    s = rhythm.tick(s, s.endsAt, rng());
    expect(s.jam).toBe('HIT');
    const off = (id: string) => (rhythm.viewForPlayer(s, id) as RhythmPlayerView).displayOffsetMs;
    expect(off('c')).toBe(JAM_MS);
    for (const id of ['a', 'b', 'd', 'e']) expect(off(id)).toBe(0);

    // Cíl ťuká podle posunutého zobrazení → mimo skutečné doby; po kole 2 je posun pryč.
    s = playRound(s, (id, beats) => shifted(beats, id === 'c' ? JAM_MS : 0));
    expect(s.scores[2].c.accuracy).toBe(40);
    expect(off('c')).toBe(0);
    s = rhythm.tick(s, s.endsAt, rng());
    expect(s.round).toBe(3);
    expect(off('c')).toBe(0);
  });

  it('ochrana Věrného rušičku zablokuje', () => {
    let s = toVote(started());
    s = pick(s, 'a', 'c')!;
    s = pick(s, 'b', 'c')!;
    s = rhythm.tick(s, s.endsAt, rng());
    expect(s.jam).toBe('BLOCKED');
    expect((rhythm.viewForPlayer(s, 'c') as RhythmPlayerView).displayOffsetMs).toBe(0);
  });

  it('dva Zrádci: platí pozdější volba; nikdo nevolí → rušička nepoužita', () => {
    let s = toVote(started([], ['a', 'b']));
    s = pick(s, 'a', 'c')!;
    s = pick(s, 'b', 'd')!;
    s = pick(s, 'e', 'c')!; // ochrana míří na původní cíl, ne na platný
    s = rhythm.tick(s, s.endsAt, rng());
    expect(s).toMatchObject({ jam: 'HIT', jammedId: 'd' });

    const none = rhythm.tick(toVote(started()), T0 + 999_999, rng());
    expect(none.jam).toBe('UNUSED');
  });

  it('duchové nevolí', () => {
    const s = toVote(started(['g']));
    expect(rhythm.applyGhost!(s, 'g', { pick: 'a' }, T0)).toBeNull();
    expect(rhythm.apply(s, 'g', { pick: 'a' }, T0, rng())).toBeNull();
  });
});

describe('Rytmus – vyhodnocení', () => {
  it('štít nejpřesnějšímu; poklad podle synchronizace; stopa po kolech a věta o rušičce', () => {
    const s = playAll(started(), { a: 50, b: 0, c: 25, d: 100, e: 125 });
    const r = rhythm.result(s);
    expect(r.shieldWinnerId).toBe('b');
    // přesnosti 80, 100, 90, 60, 50 → synchronizace 76 → 300 × 26 / 50 = 156 → 160
    expect(r.potDelta).toBe(160);
    expect(r.clues[0].rows[0]).toEqual({ playerId: 'b', label: '', value: '100 % · 100 % · 100 %' });
    expect(r.clues[1].rows[0].label).toBe('Rušička nebyla použita.');
  });

  it('pod 50 % synchronizace poklad beze změny; nikdo neťukal → štít nikdo', () => {
    const low = rhythm.result(playAll(started(), { a: 200, b: 200, c: 200, d: 200, e: 0 }));
    expect(low.potDelta).toBe(0);
    expect(low.shieldWinnerId).toBe('e');
    expect(rhythm.result(playAll(started(), {})).shieldWinnerId).toBeNull();
  });

  it('shoda přesnosti: rozhodne menší nejhorší chyba, úplná shoda = nikdo', () => {
    let s = started();
    // b: všechny doby o 40 ms; c: polovina přesně, polovina o 80 ms → stejný průměr, horší maximum.
    const err = (id: string, beats: number[]) =>
      id === 'b' ? shifted(beats, 40) : id === 'c' ? beats.map((x, i) => x + (i % 2 ? 80 : 0)) : shifted(beats, 200);
    while (s.stage !== 'DONE') s = s.stage === 'ROUND' ? playRound(s, (id, b) => (s.round === 0 ? b : err(id, b))) : rhythm.tick(s, s.endsAt, rng());
    expect(rhythm.result(s).shieldWinnerId).toBe('b');

    const tie = playAll(started(), { a: 200, b: 40, c: 40, d: 200, e: 200 });
    expect(rhythm.result(tie).shieldWinnerId).toBeNull();
  });

  it('rušička ve stopě: zasáhla / zablokovaná, bez jména', () => {
    const hit = playAll(started(), { a: 0, b: 0, c: 0, d: 0, e: 0 }, (s) => rhythm.apply(s, 'a', { pick: 'c' }, T0, rng())!);
    const clue = rhythm.result(hit).clues[1];
    expect(clue.rows[0].label).toBe('Rušička zasáhla jednoho hráče.');
    expect(clue.rows[0].playerId).toBeUndefined();
    const blocked = playAll(started(), { a: 0, b: 0, c: 0, d: 0, e: 0 }, (s) => {
      s = rhythm.apply(s, 'a', { pick: 'c' }, T0, rng())!;
      return rhythm.apply(s, 'd', { pick: 'c' }, T0, rng())!;
    });
    expect(rhythm.result(blocked).clues[1].rows[0].label).toBe('Rušičku někdo zablokoval.');
  });
});

describe('Rytmus – utajení a duchové', () => {
  it('Věrný a Zrádce mají v každém kroku stejný tvar pohledu; nikde volby ostatních ani cizí přesnosti', () => {
    let s = started(['g']);
    const keys = (v: unknown) => Object.keys(v as object).sort().join(',');
    const check = () => {
      for (const id of IDS) {
        const v = rhythm.viewForPlayer(s, id) as RhythmPlayerView;
        expect(keys(v)).toBe(keys(rhythm.viewForPlayer(s, 'a')));
        expect(v.voteTargets).not.toContain(id);
        const json = JSON.stringify(v);
        for (const bad of ['picks', 'jamTarget', 'jammedId', 'traitors', 'standings', 'calib']) expect(json).not.toContain(bad);
      }
      expect(rhythm.viewForGhost!(s, 'g')).not.toHaveProperty('voteTargets');
    };
    let guard = 0;
    while (s.stage !== 'DONE' && guard++ < 50) {
      check();
      if (s.stage === 'VOTE') {
        s = rhythm.apply(s, 'a', { pick: 'c' }, T0, rng())!;
        s = rhythm.apply(s, 'b', { pick: 'd' }, T0, rng())!;
        check();
        expect((rhythm.viewForPlayer(s, 'c') as RhythmPlayerView).myPick).toBeNull();
        s = rhythm.tick(s, s.endsAt, rng());
      } else if (s.stage === 'ROUND') {
        check();
        s = playRound(s, (id, b) => shifted(b, IDS.indexOf(id) * 20));
      } else s = rhythm.tick(s, s.endsAt, rng());
    }
    check();
  });

  it('telefon vidí jen svou přesnost a synchronizaci skupiny', () => {
    let s = playRound(started(), (id, b) => shifted(b, id === 'b' ? 50 : 0));
    let v = rhythm.viewForPlayer(s, 'b') as RhythmPlayerView;
    expect(v.myAccuracy).toBe(80);
    expect(v.groupSync).toBeNull(); // cvičné kolo
    s = rhythm.tick(s, s.endsAt, rng());
    s = playRound(s, (id, b) => shifted(b, id === 'b' ? 140 : 0));
    v = rhythm.viewForPlayer(s, 'c') as RhythmPlayerView;
    expect(v.myAccuracy).toBe(100);
    expect(v.groupSync).toBe(Math.round(((4 * 100 + 64) / 5) * 10) / 10);
  });

  it('tajná karta má pro obě role stejný počet řádků', () => {
    const s = started();
    expect(rhythm.secretCard(s, 'a')).toHaveLength(rhythm.secretCard(s, 'b').length);
  });

  it('duchové hrají mimo soutěž: nejpřesnější 3, druhý 2, třetí 1; do štítu ani synchronizace se nepočítají', () => {
    const s = playAll(started(['g1', 'g2', 'g3', 'g4', 'g5']), {
      a: 100,
      b: 100,
      c: 100,
      d: 100,
      e: 100,
      g1: 0,
      g2: 50,
      g3: 50,
      g4: 200,
      g5: null,
    });
    const r = rhythm.result(s);
    expect(r.ghostScores).toEqual({ g1: 3, g2: 2, g3: 2, g4: 0 });
    expect(r.shieldWinnerId).toBeNull(); // všichni hráči stejně, duchové se nepočítají
    expect(r.potDelta).toBe(60); // synchronizace 60 %
    expect((rhythm.viewForGhost!(s, 'g1') as RhythmGhostView).ghostStandings[0]).toEqual({ id: 'g1', accuracy: 100 });
  });
});

describe('Rytmus ve hře', () => {
  beforeEach(() => registerMinigame(rhythm));
  afterEach(() => unregisterMinigame(RHYTHM_ID));

  const at = (state: GameState, actor: Actor, action: Action, now: number) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celý rytmus přes engine: nejpřesnější dostane štít a +2, poklad roste', () => {
    let now = T0;
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' }, now);
    s = at(s, MOD, { type: 'startMinigame' }, now);
    const ids = s.players.map((p) => p.id);
    const best = ids[3];
    for (let guard = 0; s.minigame!.step === 'PLAY' && guard < 2_000; guard++) {
      const st = s.minigame!.state as RhythmState;
      if (st.stage === 'ROUND' && !st.taps[st.round]?.[best]) {
        for (const id of ids) {
          const v = viewForPlayer(s, id)!.minigame!.game as RhythmPlayerView;
          expect(v.beats).toHaveLength(ROUNDS[st.round].beats);
          const taps = shifted(v.beats, st.round === 0 ? 0 : id === best ? 10 : 60);
          s = at(s, as(id), { type: 'minigameInput', payload: { round: st.round, taps } }, now);
        }
      }
      now += 500;
      s = at(s, { kind: 'system' }, { type: 'tick', now, connected: ids }, now);
    }
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe(best);
    expect(pointsOf(s, best, false)).toBe(2);
    // přesnosti 96, 4× 76 → synchronizace 80 → +180
    expect(s.pot).toBe(1180);
  });
});
