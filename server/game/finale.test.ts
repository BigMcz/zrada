// Rozšíření 11, krok K1: finálové hlasování a dělení pokladu.
import { describe, expect, it } from 'vitest';
import type { GameState } from './state.js';
import { as, MOD, must, rejected, startedWith } from './testing.js';
import { viewForModerator, viewForPlayer, viewForScreen } from './views.js';

/** Ráno se 4 živými: p1 Zrádce, p2–p4 Věrní (p6 zemřel v noci, p5 odešel). */
function morningWithFour(): GameState {
  let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
  s = must(s, MOD, { type: 'closeVote' });
  s = must(s, MOD, { type: 'startNight' });
  s = must(s, as('p1'), { type: 'nightPick', targetId: 'p6' });
  s = must(s, MOD, { type: 'endNight' });
  s = must(s, MOD, { type: 'removePlayer', playerId: 'p5' });
  expect(s.phase).toBe('MORNING');
  return s;
}

const vote = (s: GameState, choices: Record<string, 'END' | 'CONTINUE'>) => {
  for (const [id, choice] of Object.entries(choices)) s = must(s, as(id), { type: 'finalVote', choice });
  return s;
};

describe('Finálové hlasování', () => {
  it('jde spustit jen ráno při 4 a méně živých', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    s = must(s, MOD, { type: 'closeVote' });
    s = must(s, MOD, { type: 'startNight' });
    s = must(s, MOD, { type: 'endNight' });
    expect(viewForModerator(s, new Set()).finalAvailable).toBe(false); // 5 živých
    rejected(s, MOD, { type: 'startFinal' });
    const four = morningWithFour();
    expect(viewForModerator(four, new Set()).finalAvailable).toBe(true);
    rejected(four, as('p2'), { type: 'startFinal' });
    const f = must(four, MOD, { type: 'startFinal' });
    expect(f).toMatchObject({ phase: 'FINAL_VOTE', finale: true, round: four.round + 1 });
  });

  it('jednomyslné „Ukončit“ se Zrádcem ve hře: vyhrávají Zrádci a berou celý poklad', () => {
    let s = must(morningWithFour(), MOD, { type: 'startFinal' });
    s = vote(s, { p1: 'END', p2: 'END', p3: 'END', p4: 'END' });
    s = must(s, MOD, { type: 'closeFinalVote' });
    expect(s).toMatchObject({ phase: 'ENDED', winner: 'TRAITOR', potShare: { winners: ['p1'], each: 1000 } });
    expect(s.points.filter((p) => p.reason === 'POT')).toEqual([{ playerId: 'p1', amount: 1000, reason: 'POT', round: s.round, visible: 'NOW' }]);
    expect(viewForPlayer(s, 'p2')!.potShare).toEqual({ winners: ['p1'], each: 1000 });
  });

  it('kdo nehlasoval nebo chce pokračovat: kulatý stůl bez noci a pak znovu finále', () => {
    let s = must(morningWithFour(), MOD, { type: 'startFinal' });
    s = vote(s, { p1: 'END', p2: 'END', p3: 'END' }); // p4 nehlasoval
    s = must(s, MOD, { type: 'closeFinalVote' });
    expect(s.phase).toBe('VOTE');
    expect(viewForScreen(s, null).inFinale).toBe(true);
    s = must(s, as('p2'), { type: 'vote', targetId: 'p3' });
    s = must(s, as('p4'), { type: 'vote', targetId: 'p3' });
    s = must(s, MOD, { type: 'closeVote' });
    expect(s.phase).toBe('VOTE_RESULT');
    rejected(s, MOD, { type: 'startNight' });
    const again = must(s, MOD, { type: 'startFinal' });
    expect(again).toMatchObject({ phase: 'FINAL_VOTE', finalVotes: {} });
  });

  it('vyhnání posledního Zrádce ve finále: výhra Věrných, poklad rovným dílem zaokrouhleně dolů', () => {
    let s = must(morningWithFour(), MOD, { type: 'startFinal' });
    s = { ...s, pot: 1000 };
    s = vote(s, { p2: 'CONTINUE' });
    s = must(s, MOD, { type: 'closeFinalVote' });
    for (const id of ['p2', 'p3', 'p4']) s = must(s, as(id), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    expect(s).toMatchObject({ phase: 'ENDED', winner: 'LOYAL', potShare: { winners: ['p2', 'p3', 'p4'], each: 333 } });
  });

  it('volby ve finále vidí jen moderátor; telefon jen svou, obrazovka jen počet', () => {
    let s = must(morningWithFour(), MOD, { type: 'startFinal' });
    s = vote(s, { p1: 'END', p2: 'CONTINUE' });
    expect(viewForPlayer(s, 'p1')!.myFinalChoice).toBe('END');
    expect(viewForPlayer(s, 'p3')!.myFinalChoice).toBeNull();
    expect(JSON.stringify(viewForPlayer(s, 'p3'))).not.toContain('finalVotes');
    const screen = viewForScreen(s, null);
    expect(screen).toMatchObject({ finalVotesCast: 2, finalVoters: 4 });
    expect(JSON.stringify(screen)).not.toContain('CONTINUE');
    expect(viewForModerator(s, new Set()).finalVotes).toEqual({ p1: 'END', p2: 'CONTINUE' });
    rejected(s, as('p5'), { type: 'finalVote', choice: 'END' }); // odešel
  });

  it('automatický konec bez finále dělí poklad stejně, když byl poklad ve hře', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    s = { ...s, minigamesPlayed: ['AUCTION'] };
    for (const id of ['p2', 'p3', 'p4']) s = must(s, as(id), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    expect(s).toMatchObject({ phase: 'ENDED', winner: 'LOYAL', potShare: { winners: ['p2', 'p3', 'p4', 'p5'], each: 250 } });
  });

  it('bez miniher a bez finále se poklad nedělí (hráči ho ani neviděli)', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    for (const id of ['p2', 'p3', 'p4']) s = must(s, as(id), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    expect(s).toMatchObject({ phase: 'ENDED', winner: 'LOYAL', potShare: null });
    expect(s.points.some((p) => p.reason === 'POT')).toBe(false);
  });
});
