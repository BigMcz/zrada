import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apply, type Action, type Actor } from '../../game/engine.js';
import { seededRng } from '../../game/random.js';
import { pointsOf } from '../../game/rules.js';
import type { GameState } from '../../game/state.js';
import { viewForPlayer } from '../../game/views.js';
import { as, MOD, must, startedWith } from '../../game/testing.js';
import { registerMinigame, unregisterMinigame } from '../registry.js';
import type { MinigameContext } from '../types.js';
import { dealVault, hintText, holds, positionsOf, solutions, type VaultHint } from './hints.js';
import {
  CRACK_MS,
  ghostPoints,
  REASSIGN_AFTER_MS,
  shownHints,
  vault,
  VAULT_ID,
  VOTE_MS,
  type VaultGhostView,
  type VaultPlayerView,
  type VaultState,
} from './index.js';

const T0 = 1_000_000;
const rng = (seed = 3) => seededRng(seed);
const IDS = ['a', 'b', 'c', 'd', 'e'];

const ctx = (ids = IDS, ghosts: string[] = []): MinigameContext => ({
  players: ids.map((id, i) => ({ id, role: i === 0 ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts,
  pot: 1000,
  round: 1,
  memory: undefined,
});

const started = (ghosts: string[] = [], seed = 3, ids = IDS) =>
  vault.start(vault.init(ctx(ids, ghosts), rng(seed), T0), T0, rng(seed));

function input(s: VaultState, id: string, payload: unknown, now = T0): VaultState {
  const next = vault.apply(s, id, payload, now, rng());
  if (!next) throw new Error(`vstup ${id} odmítnut: ${JSON.stringify(payload)}`);
  return next;
}

/** Volba, ve které všichni hlasují pro `locksmith` (on sám pro někoho jiného). */
function withLocksmith(s: VaultState, locksmith: string): VaultState {
  for (const id of s.players) s = input(s, id, { vote: id === locksmith ? s.players.find((p) => p !== id) : locksmith });
  s = vault.tick(s, T0 + VOTE_MS, rng());
  expect(s.locksmithId).toBe(locksmith);
  return s;
}

const wrongGuess = (s: VaultState) => s.code.map((d) => (d + 1) % 10);

describe('Trezor – generátor nápověd', () => {
  it('pro 4–10 hráčů: z pravdivých nápověd jediný kód, každá číslice od 2 různých hráčů, 1–3 nápovědy na hráče', () => {
    for (const n of [4, 5, 6, 7, 8, 10]) {
      for (let seed = 1; seed <= 25; seed++) {
        const players = Array.from({ length: n }, (_, i) => `p${i}`);
        const traitors = n >= 7 ? ['p0', 'p1'] : ['p0'];
        const digits = n <= 4 ? 3 : 4;
        const deal = dealVault(players, traitors, digits, rng(seed * 31 + n));
        const all = Object.values(deal.hints).flat();

        expect(deal.code).toHaveLength(digits);
        expect(solutions(all, digits)).toEqual([deal.code]);
        for (const id of players) {
          expect(deal.hints[id].length).toBeGreaterThanOrEqual(1);
          expect(deal.hints[id].length).toBeLessThanOrEqual(3);
        }
        for (let pos = 0; pos < digits; pos++) {
          const who = players.filter((id) => deal.hints[id].some((h) => positionsOf(h).includes(pos)));
          expect(who.length).toBeGreaterThanOrEqual(2);
        }
        expect(all.filter((h) => h.kind === 'exact').length).toBeLessThanOrEqual(1);
        expect(new Set(all.map(hintText)).size).toBe(all.length);

        // Falešná: každý Zrádce jednu, stejný typ a číslice, pro kód neplatí.
        expect(Object.keys(deal.fakes).sort()).toEqual([...traitors].sort());
        for (const id of traitors) {
          const { index, hint } = deal.fakes[id];
          const real = deal.hints[id][index];
          expect(hint.kind).toBe(real.kind);
          expect(positionsOf(hint)).toEqual(positionsOf(real));
          expect(holds(hint, deal.code)).toBe(false);
          expect(holds(real, deal.code)).toBe(true);
        }
      }
    }
  });

  it('dva Zrádci mají falešné nápovědy většinou u různých číslic', () => {
    let different = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const players = Array.from({ length: 8 }, (_, i) => `p${i}`);
      const deal = dealVault(players, ['p0', 'p1'], 4, rng(seed));
      const pos = (id: string) => positionsOf(deal.fakes[id].hint);
      if (!pos('p0').some((p) => pos('p1').includes(p))) different++;
    }
    expect(different).toBeGreaterThanOrEqual(24);
  });

  it('texty nápověd', () => {
    const t = (h: VaultHint) => hintText(h);
    expect(t({ kind: 'parity', pos: 0, even: true })).toBe('1. číslice je sudá.');
    expect(t({ kind: 'range', pos: 2, op: 'gt', value: 5 })).toBe('3. číslice je větší než 5.');
    expect(t({ kind: 'exclude', pos: 1, values: [7, 1, 4] })).toBe('2. číslice není 1, 4 ani 7.');
    expect(t({ kind: 'relation', pos: 3, other: 0, diff: -2 })).toBe('4. číslice je o 2 menší než 1. číslice.');
    expect(t({ kind: 'relation', pos: 1, other: 2, diff: 0 })).toBe('2. číslice je stejná jako 3. číslice.');
    expect(t({ kind: 'sum', pos: 1, other: 2, value: 11 })).toBe('Součet 2. a 3. číslice je 11.');
    expect(t({ kind: 'exact', pos: 2, value: 8 })).toBe('3. číslice je 8.');
  });
});

describe('Trezor – pravidla', () => {
  it('4 živí → 3 číslice, 5 živých → 4 číslice', () => {
    expect(started([], 1, ['a', 'b', 'c', 'd']).digits).toBe(3);
    expect(started().digits).toBe(4);
  });

  it('volba zámečníka: sebe volit nejde, nejvíc hlasů vyhrává, po 20 s začne luštění', () => {
    let s = started();
    expect(s.stage).toBe('VOTE');
    expect(vault.apply(s, 'a', { vote: 'a' }, T0, rng())).toBeNull();
    expect(vault.apply(s, 'a', { vote: 'zzz' }, T0, rng())).toBeNull();
    s = input(s, 'a', { vote: 'c' });
    s = input(s, 'b', { vote: 'c' });
    s = input(s, 'c', { vote: 'b' });
    s = input(s, 'a', { vote: 'b' }); // hlas jde změnit
    s = input(s, 'd', { vote: 'c' });
    expect(vault.tick(s, T0 + VOTE_MS - 1, rng()).stage).toBe('VOTE');
    s = vault.tick(s, T0 + VOTE_MS, rng());
    expect(s.stage).toBe('CRACK');
    expect(s.locksmithId).toBe('c');
    expect(s.endsAt).toBe(T0 + VOTE_MS + CRACK_MS);
  });

  it('remíza i žádné hlasy rozhodne los; moderátor může volbu ukončit dřív', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      let s = started([], seed);
      s = input(s, 'a', { vote: 'b' });
      s = input(s, 'b', { vote: 'c' });
      s = vault.applyModerator!(s, { action: 'endVote' }, T0 + 1000, rng(seed))!;
      expect(s.stage).toBe('CRACK');
      expect(['b', 'c']).toContain(s.locksmithId);
      seen.add(s.locksmithId!);
    }
    expect(seen.size).toBe(2);

    const nobody = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) nobody.add(vault.tick(started([], seed), T0 + VOTE_MS, rng(seed)).locksmithId!);
    expect(nobody.size).toBeGreaterThanOrEqual(4);
  });

  it('kód zadává jen zámečník, trezor ukáže počet číslic na správném místě', () => {
    let s = withLocksmith(started(), 'b');
    expect(vault.apply(s, 'c', { guess: s.code }, T0, rng())).toBeNull();
    expect(vault.apply(s, 'b', { guess: [1, 2, 3] }, T0, rng())).toBeNull();
    expect(vault.apply(s, 'b', { guess: [1, 2, 3, 10] }, T0, rng())).toBeNull();
    const guess = [...wrongGuess(s)];
    guess[0] = s.code[0];
    guess[2] = s.code[2];
    s = input(s, 'b', { guess });
    expect(s.attempts).toEqual([{ guess, hits: 2, by: 'b' }]);
    expect(s.stage).toBe('CRACK');
  });

  it('otevřeno na 2. pokus: štít zámečníkovi, poklad +200', () => {
    let s = withLocksmith(started(), 'b');
    s = input(s, 'b', { guess: wrongGuess(s) });
    s = input(s, 'b', { guess: s.code });
    expect(s.stage).toBe('DONE');
    const r = vault.result(s);
    expect(r.shieldWinnerId).toBe('b');
    expect(r.potDelta).toBe(200);
  });

  it('otevřeno na 1. pokus +300, na 3. pokus +100', () => {
    let s = withLocksmith(started(), 'c');
    s = input(s, 'c', { guess: s.code });
    expect(vault.result(s).potDelta).toBe(300);
    s = withLocksmith(started(), 'c');
    s = input(s, 'c', { guess: wrongGuess(s) });
    s = input(s, 'c', { guess: wrongGuess(s) });
    s = input(s, 'c', { guess: s.code });
    expect(vault.result(s).potDelta).toBe(100);
  });

  it('tři špatné pokusy, vypršení času i ukončení moderátorem: bez štítu, poklad 0', () => {
    let s = withLocksmith(started(), 'd');
    for (let i = 0; i < 3; i++) s = input(s, 'd', { guess: wrongGuess(s) });
    expect(s.stage).toBe('DONE');
    expect(s.end).toBe('NO_ATTEMPTS');
    expect(vault.result(s)).toMatchObject({ shieldWinnerId: null, potDelta: 0 });

    s = withLocksmith(started(), 'd');
    s = vault.tick(s, s.endsAt, rng());
    expect(s.end).toBe('TIME');
    expect(vault.result(s).shieldWinnerId).toBeNull();

    s = withLocksmith(started(), 'd');
    s = vault.applyModerator!(s, { action: 'end' }, T0, rng())!;
    expect(s.end).toBe('MODERATOR');
    expect(vault.result(s).potDelta).toBe(0);
  });

  it('odpojený zámečník: po 20 s jde přidělit znovu, nový si nápovědy ponechá', () => {
    let s = withLocksmith(started(), 'b');
    const t = T0 + VOTE_MS;
    const online = new Set(['a', 'c', 'd', 'e']);
    s = vault.tick(s, t + 1000, rng(), online);
    expect(s.disconnectedSince).toBe(t + 1000);
    expect(vault.applyModerator!(s, { action: 'reassign' }, t + 2000, rng())).toBeNull();
    s = vault.tick(s, t + 1000 + REASSIGN_AFTER_MS, rng(), online);
    expect(s.reassignable).toBe(true);

    // Návrat zámečníka nabídku zruší.
    const back = vault.tick(s, t + 1000 + REASSIGN_AFTER_MS + 200, rng(), new Set(IDS));
    expect(back).toMatchObject({ disconnectedSince: null, reassignable: false });

    s = input(s, 'b', { guess: wrongGuess(s) }); // pokus před odpojením se počítá dál
    const hintsBefore = vault.viewForPlayer(s, 'c') as VaultPlayerView;
    const next = vault.applyModerator!(s, { action: 'reassign' }, t + 30_000, rng(5))!;
    expect(next.locksmithId).not.toBe('b');
    expect(next.attempts).toHaveLength(1);
    const v = vault.viewForPlayer(next, next.locksmithId!) as VaultPlayerView;
    expect(v.isLocksmith).toBe(true);
    expect(v.myHints.length).toBeGreaterThan(0);
    expect((vault.viewForPlayer(next, 'c') as VaultPlayerView).myHints).toEqual(hintsBefore.myHints);
  });
});

describe('Trezor – utajení', () => {
  it('Věrný a Zrádce mají stejný tvar pohledu; kód jde do telefonu až po konci', () => {
    let s = started(['g']);
    const keys = (v: unknown) => Object.keys(v as object).sort().join(',');
    const check = () => {
      for (const id of IDS) {
        const v = vault.viewForPlayer(s, id) as VaultPlayerView;
        expect(keys(v)).toBe(keys(vault.viewForPlayer(s, 'a')));
        if (s.stage !== 'DONE') {
          expect(v.revealedCode).toBeNull();
          expect(JSON.stringify(v)).not.toContain('"code"');
        }
      }
    };
    check();
    s = withLocksmith(s, 'a');
    check();
    s = input(s, 'a', { guess: wrongGuess(s) });
    check();
    s = input(s, 'a', { guess: s.code });
    check();
    expect((vault.viewForPlayer(s, 'b') as VaultPlayerView).revealedCode).toEqual(s.code);
  });

  it('telefon dostane jen své nápovědy; Zrádce vidí falešnou, pravou má na tajné kartě', () => {
    const s = started();
    for (const id of IDS) {
      const own = shownHints(s, id).map(hintText);
      expect((vault.viewForPlayer(s, id) as VaultPlayerView).myHints).toEqual(own);
      const json = JSON.stringify(vault.viewForPlayer(s, id));
      for (const other of IDS.filter((o) => o !== id)) {
        for (const text of shownHints(s, other).map(hintText)) if (!own.includes(text)) expect(json).not.toContain(text);
      }
    }
    const fake = s.fakes.a;
    const traitorHints = (vault.viewForPlayer(s, 'a') as VaultPlayerView).myHints;
    expect(traitorHints[fake.index]).toBe(hintText(fake.hint));
    expect(vault.secretCard(s, 'a')[1]).toContain(hintText(s.hints.a[fake.index]));
    expect(vault.secretCard(s, 'a')).toHaveLength(vault.secretCard(s, 'b').length);
  });

  it('duch nápovědy nevidí; stopa ukazuje nápovědy tak, jak byly na telefonech', () => {
    let s = started(['g']);
    const g = vault.viewForGhost!(s, 'g') as VaultGhostView;
    expect(g).not.toHaveProperty('myHints');
    for (const text of IDS.flatMap((id) => shownHints(s, id).map(hintText))) expect(JSON.stringify(g)).not.toContain(text);

    s = withLocksmith(s, 'b');
    s = input(s, 'b', { guess: s.code });
    const clue = vault.result(s).clues[1];
    const fakeText = hintText(s.fakes.a.hint);
    expect(clue.rows.filter((r) => r.playerId === 'a').map((r) => r.value)).toContain(fakeText);
    expect(JSON.stringify(clue)).not.toMatch(/falešn/i);
  });
});

describe('Trezor – duchové', () => {
  it('body za tip: přesně 3, o jeden vedle 1, jinak 0; neotevřeno = 4', () => {
    expect(ghostPoints(2, 2)).toBe(3);
    expect(ghostPoints(3, 2)).toBe(1);
    expect(ghostPoints(4, 3)).toBe(1);
    expect(ghostPoints(1, 4)).toBe(0);
  });

  it('tipují do prvního pokusu, pak už ne', () => {
    let s = started(['g1', 'g2', 'g3']);
    s = vault.applyGhost!(s, 'g1', { tip: 2 }, T0)!;
    expect(vault.applyGhost!(s, 'g1', { tip: 5 }, T0)).toBeNull();
    expect(vault.applyGhost!(s, 'a', { tip: 1 }, T0)).toBeNull();
    s = withLocksmith(s, 'c');
    s = vault.applyGhost!(s, 'g2', { tip: 4 }, T0)!;
    s = vault.applyGhost!(s, 'g3', { tip: 3 }, T0)!;
    s = input(s, 'c', { guess: wrongGuess(s) });
    expect(vault.applyGhost!(s, 'g3', { tip: 2 }, T0)).toBeNull();
    expect((vault.viewForGhost!(s, 'g3') as VaultGhostView).canTip).toBe(false);
    s = input(s, 'c', { guess: s.code });
    expect(vault.result(s).ghostScores).toEqual({ g1: 3, g2: 0, g3: 1 });
  });
});

describe('Trezor ve hře', () => {
  beforeEach(() => registerMinigame(vault));
  afterEach(() => unregisterMinigame(VAULT_ID));

  const at = (state: GameState, actor: Actor, action: Action, now = T0) => {
    const r = apply(state, actor, action, seededRng(7), now);
    if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
    return r.state;
  };

  it('celý trezor přes engine: zámečník otevře na 1. pokus, dostane štít a +2, poklad +300', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    s = at(s, MOD, { type: 'confirmMinigame' });
    s = at(s, MOD, { type: 'startMinigame' });
    const ids = s.players.map((p) => p.id);
    const locksmith = ids[2];
    for (const id of ids) {
      const v = viewForPlayer(s, id)!.minigame!.game as VaultPlayerView;
      expect(v.myHints.length).toBeGreaterThan(0);
      s = at(s, as(id), { type: 'minigameInput', payload: { vote: id === locksmith ? ids[0] : locksmith } });
    }
    s = at(s, MOD, { type: 'minigameModerator', payload: { action: 'endVote' } });
    const st = s.minigame!.state as VaultState;
    expect(st.locksmithId).toBe(locksmith);
    s = at(s, as(locksmith), { type: 'minigameInput', payload: { guess: st.code } });
    s = at(s, { kind: 'system' }, { type: 'tick', now: T0 + 500, connected: ids }, T0 + 500);
    expect(s.minigame!.step).toBe('RESULT');
    expect(s.minigame!.result!.shieldWinnerId).toBe(locksmith);
    expect(pointsOf(s, locksmith, false)).toBe(2);
    expect(s.pot).toBe(1300);
  });
});
