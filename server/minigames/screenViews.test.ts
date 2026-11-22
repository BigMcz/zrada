// Velká obrazovka (Rozšíření 9, krok O2): scény miniher nesmí obsahovat nic tajného.
import { describe, expect, it } from 'vitest';
import { seededRng } from '../game/random.js';
import { auction } from './auction/index.js';
import { bomb, type BombState } from './bomb/index.js';
import { hotPotato, type HotPotatoState } from './hotPotato/index.js';
import { physical, type PhysicalState } from './physical/index.js';
import { quiz, type QuizState } from './quiz/index.js';
import { rhythm, type RhythmState } from './rhythm/index.js';
import { splitSteal } from './splitSteal/index.js';
import type { MinigameContext, MinigameModule } from './types.js';
import { vault, type VaultState } from './vault/index.js';

const T0 = 1_000_000;
const rng = () => seededRng(5);
const IDS = ['a', 'b', 'c', 'd', 'e'];
const ctx: MinigameContext = {
  players: IDS.map((id) => ({ id, role: id === 'a' ? 'TRAITOR' : 'LOYAL', alive: true })),
  ghosts: ['g'],
  pot: 1000,
  round: 1,
  memory: undefined,
};

function started<S>(m: MinigameModule<S>): S {
  return m.start(m.init(ctx, rng(), T0), T0, rng());
}

/** Klíče tajných údajů všech miniher; žádný z nich nesmí být ve scéně obrazovky. */
const SECRET_KEYS = [
  'traitors', 'bids', 'revealOrder', 'choices', 'bets', 'ghostBets', 'ghostGuesses', 'ghostTips',
  'pressure', 'explodeAt', 'fuseMs', 'hint', 'hints', 'hintLog', 'answers', 'questions',
  'code', 'fakes', 'votes', 'picks', 'jamTarget', 'jammedId', 'calib', 'taps', 'scores', 'displayOffsetMs',
  'device', 'wires', 'symbols', 'solution', 'pages', 'outcome',
];

function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  }
  return out;
}

function checkScreen<S>(m: MinigameModule<S>, s: S) {
  expect(m.viewForScreen, `${m.id} nemá scénu pro obrazovku`).toBeDefined();
  const v = m.viewForScreen!(s);
  const keys = keysDeep(v);
  for (const k of SECRET_KEYS) expect(keys.has(k), `${m.id}: tajný klíč ${k}`).toBe(false);
  return v as Record<string, unknown>;
}

describe('Velká obrazovka – scény miniher bez tajných údajů', () => {
  it('všech 8 miniher má scénu a ta neobsahuje tajné klíče', () => {
    for (const m of [auction, splitSteal, hotPotato, quiz, vault, rhythm, bomb, physical] as MinigameModule[]) {
      checkScreen(m, started(m));
    }
  });

  it('Předej bombu: držitel ano, ručička tlaku ne', () => {
    let s = started(hotPotato) as HotPotatoState;
    s = hotPotato.applyModerator!(s, { action: 'endStage' }, T0, rng())!;
    const v = checkScreen(hotPotato, s);
    expect(v.holderIds).toEqual(s.bombs.map((b) => b.holderId));
  });

  it('kvíz: správná odpověď až po otázce, bez svíčky', () => {
    let s = started(quiz) as QuizState;
    s = quiz.tick(s, T0 + 3_000, rng());
    expect(checkScreen(quiz, s).correct).toBeNull();
    s = quiz.tick(s, s.endsAt, rng());
    expect(checkScreen(quiz, s).correct).toBe(s.questions[s.index].correct);
  });

  it('Trezor: kód až po konci, nápovědy ne', () => {
    const s = started(vault) as VaultState;
    const v = checkScreen(vault, s);
    expect(v.revealedCode).toBeNull();
    const json = JSON.stringify(v);
    for (const hs of Object.values(s.hints)) for (const h of hs) expect(json).not.toContain(JSON.stringify(h));
  });

  it('Rytmus: skutečné doby bez posunu rušičky', () => {
    const s = started(rhythm) as RhythmState;
    expect(checkScreen(rhythm, s).beats).toEqual(s.beats);
  });

  it('bomba: pyrotechnik a kontrolky, bomba samotná ne', () => {
    const s = bomb.tick(started(bomb) as BombState, T0 + 20_000, rng());
    const v = checkScreen(bomb, s);
    expect(v).toMatchObject({ pyroId: s.pyroId, errors: 0, maxErrors: 3 });
    const json = JSON.stringify(v);
    for (const sym of s.bomb.symbols) expect(json).not.toContain(sym);
  });

  it('Fyzická mise: zadání až po zveřejnění', () => {
    let s = started(physical) as PhysicalState;
    expect(checkScreen(physical, s).text).toBeNull();
    s = physical.applyModerator!(s, { action: 'publish', text: 'Postavte věž.' }, T0, rng())!;
    expect(checkScreen(physical, s).text).toBe('Postavte věž.');
  });
});
