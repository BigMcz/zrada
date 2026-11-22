import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScreenView } from '../../shared/types.js';
import { registerMinigame, unregisterMinigame } from '../minigames/registry.js';
import { makeButtonModule } from '../minigames/testModule.js';
import { seededRng } from './random.js';
import { pointsOf } from './rules.js';
import type { GameState } from './state.js';
import { as, GUEST, lobby, MOD, must, playRandomGame, rejected, startedWith } from './testing.js';
import { viewForModerator, viewForPlayer, viewForScreen } from './views.js';

const URL = 'http://192.168.0.10:3000/';

/** Tajné klíče, které se nikdy nesmí objevit v pohledu obrazovky. */
const FORBIDDEN = ['"token"', '"role"', '"nightPicks"', '"nightTips"', '"ghostTips"', '"secretCard"', '"handoff"', '"shieldHolderId"', '"myVote"', '"picks"', '"allies"'];

/** Kontrola utajení pohledu obrazovky v libovolném stavu hry. */
function checkScreen(state: GameState) {
  const v = viewForScreen(state, URL);
  const json = JSON.stringify(v);
  for (const key of FORBIDDEN) expect(json, `${key} ve fázi ${state.phase}`).not.toContain(key);
  for (const p of state.players) {
    expect(json).not.toContain(p.token);
    const shown = v.players.find((x) => x.id === p.id)!;
    if (p.status !== 'BANISHED' && state.phase !== 'ENDED') expect(shown.revealedRole).toBeUndefined();
  }
  // Sloupce hlasů jen po hlasování a bez hlasujících: jen id cíle a počet.
  if (v.tally) {
    for (const row of v.tally) expect(Object.keys(row).sort()).toEqual(['id', 'votes']);
    expect(v.tally.reduce((s, r) => s + r.votes, 0)).toBe(Object.keys(state.votes).length);
  }
  if (state.phase === 'VOTE') expect(v.tally).toBeNull();
  expect(v.joinUrl).toBe(state.phase === 'LOBBY' ? URL : null);
  // Body duchů za tipy jsou skryté až do konce hry.
  for (const g of v.ghostBoard) expect(g.points).toBe(pointsOf(state, g.id, state.phase === 'ENDED'));
  return v;
}

describe('Velká obrazovka – utajení', () => {
  it('v žádném stavu náhodných her neprozradí role, volby, tokeny ani skryté body', () => {
    for (const [n, seed] of [
      [5, 1],
      [7, 2],
      [9, 3],
      [10, 4],
    ] as const) {
      playRandomGame(n, seededRng(seed), checkScreen);
    }
  });

  it('hlasování: během něj jen počet hlasů, po něm sloupce, vyhnaný a jeho role', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    s = must(s, as('p1'), { type: 'vote', targetId: 'p2' });
    s = must(s, as('p3'), { type: 'vote', targetId: 'p2' });
    let v = checkScreen(s);
    expect(v).toMatchObject({ phase: 'VOTE', votesCast: 2, voters: 5, tally: null, banishedId: null });
    s = must(s, as('p4'), { type: 'vote', targetId: 'p1' });
    s = must(s, MOD, { type: 'closeVote' });
    v = checkScreen(s);
    expect(v.tally).toEqual([
      { id: 'p2', votes: 2 },
      { id: 'p1', votes: 1 },
    ]);
    expect(v.banishedId).toBe('p2');
    expect(v.players.find((p) => p.id === 'p2')!.revealedRole).toBe('LOYAL');
    expect(v.votesCast).toBeNull();
  });

  it('ráno: oběť noci, nebo nikdo', () => {
    let s = must(startedWith(6, ['p1']), MOD, { type: 'startVote' });
    s = must(s, MOD, { type: 'closeVote' });
    s = must(s, MOD, { type: 'startNight' });
    s = must(s, as('p1'), { type: 'nightPick', targetId: 'p3' });
    s = must(s, MOD, { type: 'endNight' });
    expect(checkScreen(s)).toMatchObject({ phase: 'MORNING', murderedId: 'p3' });
  });

  it('lobby: adresa pro QR kód a jména připojených', () => {
    const v = checkScreen(lobby(['Petra', 'Tomáš']));
    expect(v).toMatchObject({ kind: 'screen', phase: 'LOBBY', joinUrl: URL });
    expect(v.players.map((p) => p.name)).toEqual(['Petra', 'Tomáš']);
  });
});

describe('Velká obrazovka – minihry', () => {
  beforeEach(() => registerMinigame(makeButtonModule('TEST')));
  afterEach(() => unregisterMinigame('TEST'));

  it('společné kroky: los s osudím, pravidla, výsledek a stopa; bez tajné karty a předání štítu', () => {
    let s = must(startedWith(5, ['p1']), MOD, { type: 'drawMinigame' });
    let v: ScreenView = checkScreen(s);
    expect(v.minigame).toMatchObject({ step: 'DRAW', name: 'Tlačítko TEST', candidates: ['Tlačítko TEST'] });
    s = must(s, MOD, { type: 'confirmMinigame' });
    v = checkScreen(s);
    expect(v.minigame).toMatchObject({ step: 'INTRO', rules: ['Kdo zmáčkne první, vyhraje štít.'], traitorRule: 'Zrádci nemají žádnou výhodu.' });
    s = must(s, MOD, { type: 'startMinigame' });
    v = checkScreen(s);
    expect(v.minigame!.step).toBe('PLAY');
    expect(v.minigame!.game).toBeNull(); // testovací modul scénu pro obrazovku nemá
    for (const p of s.players) s = must(s, as(p.id), { type: 'minigameInput', payload: 'press' });
    v = checkScreen(s);
    expect(v.minigame!.step).toBe('RESULT');
    expect(v.minigame!.result).toMatchObject({ shieldWinnerId: s.players[0].id });
    s = must(s, MOD, { type: 'showClue' });
    v = checkScreen(s);
    expect(v.minigame!.clues).not.toBeNull();
    s = must(s, MOD, { type: 'afterClue' });
    v = checkScreen(s);
    expect(v.minigame!.step).toBe('HANDOFF');
    expect(JSON.stringify(v)).not.toContain('"winnerId"');
  });
});

describe('Velká obrazovka – ztlumení', () => {
  it('moderátor ztlumí obrazovku kdykoli, hráč ani host ne', () => {
    let s = lobby(['Petra', 'Tomáš']);
    expect(viewForScreen(s, URL).muted).toBe(false);
    rejected(s, as('p1'), { type: 'setScreenMuted', muted: true });
    rejected(s, GUEST, { type: 'setScreenMuted', muted: true });
    s = must(s, MOD, { type: 'setScreenMuted', muted: true });
    expect(viewForScreen(s, URL).muted).toBe(true);
    expect(viewForModerator(s, new Set()).screenMuted).toBe(true);
    let g = must(startedWith(5, ['p1']), MOD, { type: 'startVote' });
    g = must(g, MOD, { type: 'setScreenMuted', muted: true });
    g = must(g, MOD, { type: 'setScreenMuted', muted: false });
    expect(viewForScreen(g, URL).muted).toBe(false);
  });
});

describe('Velká obrazovka – veřejné hlasování (Rozšíření 12)', () => {
  const voted = (publicVotes: boolean) => {
    let s = lobby(['A', 'B', 'C', 'D', 'E']);
    if (publicVotes) s = must(s, MOD, { type: 'setPublicVotes', enabled: true });
    s = must(s, MOD, { type: 'startGame', traitorCount: 1 });
    s = must(s, MOD, { type: 'startVote' });
    s = must(s, as('p1'), { type: 'vote', targetId: 'p2' });
    s = must(s, as('p3'), { type: 'vote', targetId: 'p2' });
    s = must(s, as('p4'), { type: 'vote', targetId: 'p1' });
    return s;
  };

  it('vypnuté (výchozí): obrazovka ukáže jen sloupce, ne kdo pro koho hlasoval', () => {
    const s = must(voted(false), MOD, { type: 'closeVote' });
    const v = viewForScreen(s, URL);
    expect(v.voteCards).toBeNull();
    expect(JSON.stringify(v)).not.toContain('voterId');
  });

  it('zapnuté: po uzavření karty „kdo pro koho“ v pořadí hráčů, během hlasování nic', () => {
    let s = voted(true);
    expect(viewForScreen(s, URL).voteCards).toBeNull();
    expect(viewForPlayer(s, 'p2')!.publicVotes).toBe(true);
    s = must(s, MOD, { type: 'closeVote' });
    expect(viewForScreen(s, URL).voteCards).toEqual([
      { voterId: 'p1', targetId: 'p2' },
      { voterId: 'p3', targetId: 'p2' },
      { voterId: 'p4', targetId: 'p1' },
    ]);
  });

  it('nastavení jde změnit jen v lobby a jen moderátorem', () => {
    rejected(lobby(['A', 'B', 'C', 'D']), as('p1'), { type: 'setPublicVotes', enabled: true });
    rejected(startedWith(5, ['p1']), MOD, { type: 'setPublicVotes', enabled: true });
  });
});
