// Rozšíření 13, krok Q1: sady otázek do kvízu.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { as, lobby, MOD, must, rejected } from '../../game/testing.js';
import { viewForModerator } from '../../game/views.js';
import type { MinigameContext } from '../types.js';
import { QUESTION_COUNT, QUESTION_SETS, questionBank, quiz } from './index.js';
import { loadQuestionSets } from './questions/load.js';

const ctx = (quizSets: string[] | null, usedIds: string[] = []): MinigameContext => ({
  players: ['a', 'b', 'c'].map((id) => ({ id, role: 'LOYAL', alive: true })),
  ghosts: [],
  pot: 1000,
  round: 1,
  memory: { usedIds },
  quizSets,
});

describe('Sady otázek', () => {
  it('složka se načte sama: Obecné otázky a Filmy a seriály, id napříč sadami unikátní', () => {
    expect(QUESTION_SETS.map((s) => s.set).sort()).toEqual(['filmy-serialy', 'obecne']);
    const filmy = QUESTION_SETS.find((s) => s.set === 'filmy-serialy')!;
    expect(filmy.name).toBe('Filmy a seriály');
    expect(filmy.questions.length).toBeGreaterThanOrEqual(30);
    const ids = QUESTION_SETS.flatMap((s) => s.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('výběr sad omezí otázky kvízu', () => {
    expect(questionBank(['filmy-serialy']).every((q) => q.id.startsWith('filmy-'))).toBe(true);
    expect(questionBank(null).length).toBe(QUESTION_SETS.reduce((n, s) => n + s.questions.length, 0));
    const s = quiz.init(ctx(['filmy-serialy']), { int: () => 0 }, 0);
    expect(s.questions).toHaveLength(QUESTION_COUNT);
    expect(s.questions.every((q) => q.id.startsWith('filmy-'))).toBe(true);
  });

  it('kvíz se nelosuje, když ve vybraných sadách není dost nepoužitých otázek', () => {
    expect(quiz.canRun!(ctx(['filmy-serialy']))).toBe(true);
    // Použité jsou všechny otázky sady kromě šesti → na kvíz (7 otázek) nezbývá dost.
    const used = questionBank(['filmy-serialy']).slice(QUESTION_COUNT - 1).map((q) => q.id);
    expect(quiz.canRun!(ctx(['filmy-serialy'], used))).toBe(false);
    expect(quiz.canRun!(ctx([]))).toBe(false);
  });

  it('neplatné otázky a soubory se přeskočí, kvíz nespadne', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zrada-otazky-'));
    try {
      const ok = { id: 'x-1', text: 'Otázka?', options: ['a', 'b', 'c', 'd'], correct: 1 };
      fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ set: 'a', name: 'A', questions: [ok, { id: 'x-2', text: '', options: [], correct: 9 }] }));
      fs.writeFileSync(path.join(dir, 'b.json'), '{ rozbitý');
      const sets = loadQuestionSets(dir);
      expect(sets).toHaveLength(1);
      expect(sets[0].questions.map((q) => q.id)).toEqual(['x-1']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('výběr sad v lobby: jen moderátor, jen v lobby; konzole ukazuje sady a výběr', () => {
    let s = lobby(['A', 'B', 'C', 'D']);
    expect(viewForModerator(s, new Set()).quizSets.every((x) => x.selected)).toBe(true);
    s = must(s, MOD, { type: 'setQuizSets', sets: ['obecne'] });
    expect(viewForModerator(s, new Set()).quizSets.map((x) => [x.set, x.selected])).toEqual(
      QUESTION_SETS.map((x) => [x.set, x.set === 'obecne']),
    );
    rejected(s, as('p1'), { type: 'setQuizSets', sets: null });
    s = must(s, MOD, { type: 'startGame', traitorCount: 1 });
    rejected(s, MOD, { type: 'setQuizSets', sets: null });
  });
});
