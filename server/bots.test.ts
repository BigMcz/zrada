// Rozšíření 13, krok B1: boti v základní hře.
import { describe, expect, it } from 'vitest';
import { botAction, BOT_NAMES, nextBotName } from './bots.js';
import { apply, type Action } from './game/engine.js';
import { seededRng } from './game/random.js';
import type { GameState } from './game/state.js';
import { as, lobby, MOD, must, startedWith } from './game/testing.js';

const rng = () => seededRng(4);
/** Hra, ve které jsou p2–p5 boti (p1 je člověk a Zrádce). */
const withBots = (s: GameState) => ({ ...s, players: s.players.map((p) => (p.id === 'p1' ? p : { ...p, bot: true })) });

/** Nechá boty táhnout, dokud mají co dělat (bez prodlev). */
function runBots(s: GameState, guard = 50): GameState {
  for (let i = 0; i < guard; i++) {
    const bot = s.players.find((p) => p.bot && botAction(s, p.id, rng(), 0));
    if (!bot) return s;
    const action = botAction(s, bot.id, rng(), 0) as Action;
    const r = apply(s, { kind: 'player', playerId: bot.id }, action, rng());
    if (!r.ok) throw new Error(`${bot.name} ${action.type}: ${r.error}`);
    s = r.state;
  }
  throw new Error('boti se zacyklili');
}

describe('Boti – rozhodování', () => {
  it('náhodná jména ze seznamu bez kolize, po vyčerpání „Bot N“', () => {
    let s = lobby(['leo']);
    const names = new Set<string>();
    for (let i = 0; i < BOT_NAMES.length - 1; i++) {
      const name = nextBotName(s, seededRng(i + 1));
      expect(BOT_NAMES).toContain(name);
      expect(name).not.toBe('Leo');
      names.add(name);
      s = must(s, { kind: 'guest' }, { type: 'join', name, playerId: `b${i}`, token: 't', bot: true });
    }
    expect(names.size).toBe(BOT_NAMES.length - 1);
    expect(s.players.find((p) => p.id === 'b0')!.bot).toBe(true);
    expect(nextBotName(s, seededRng(1))).toBe('Bot 1');
    // Náhodné pořadí: různé seedy dají různá první jména.
    const first = new Set(Array.from({ length: 20 }, (_, i) => nextBotName(lobby(['Petra']), seededRng(i + 1))));
    expect(first.size).toBeGreaterThan(3);
  });

  it('člověk nemá tahy bota; bot potvrdí roli, hlasuje, v noci vybírá', () => {
    let s = withBots(startedWith(5, ['p1']));
    expect(botAction(s, 'p1', rng(), 0)).toBeNull();
    s = runBots(s);
    expect(s.players.filter((p) => p.bot).every((p) => p.sawRole)).toBe(true);
    s = must(s, MOD, { type: 'startVote' });
    s = runBots(s);
    expect(Object.keys(s.votes).sort()).toEqual(['p2', 'p3', 'p4', 'p5']);
    s = must(s, MOD, { type: 'closeVote' });
    if (s.phase === 'ENDED') return;
    s = must(s, MOD, { type: 'startNight' });
    s = runBots(s);
    // Věrní boti tipují; Zrádce je člověk, takže oběť nevybral nikdo.
    expect(Object.keys(s.nightPicks)).toEqual([]);
    expect(Object.keys(s.nightTips).length).toBeGreaterThan(0);
  });

  it('Zrádce-bot vybírá jen Věrné; duch-bot tipuje; ve finále bot hlasuje', () => {
    let s = startedWith(6, ['p2']);
    s = { ...s, players: s.players.map((p) => ({ ...p, bot: p.id !== 'p1' })) };
    s = runBots(s);
    s = must(s, MOD, { type: 'startVote' });
    s = must(s, as('p1'), { type: 'vote', targetId: 'p6' });
    s = runBots(s);
    s = must(s, MOD, { type: 'closeVote' });
    s = must(s, MOD, { type: 'startNight' });
    s = runBots(s);
    expect(s.players.find((p) => p.id === s.nightPicks.p2)?.role).toBe('LOYAL');
    const ghost = s.players.find((p) => p.status !== 'ALIVE' && p.bot && p.role === 'LOYAL');
    if (ghost) expect(ghost.id in s.ghostTips).toBe(true);
  });

  it('během pauzy bot netáhne', () => {
    let s = withBots(startedWith(5, ['p1']));
    s = must(s, MOD, { type: 'pause' });
    expect(botAction(s, 'p2', rng(), 0)).toBeNull();
  });
});
