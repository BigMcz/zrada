// Sady otázek do kvízu (DOC/SPEC.md, Rozšíření 13): všechny soubory *.json v této složce se načtou samy.
// Vlastní sada = nový soubor ve stejném formátu a restart serveru.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { QuizQuestion, QuizSet } from '../index.js';

function validQuestion(q: unknown): q is QuizQuestion {
  const x = q as QuizQuestion;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.text === 'string' &&
    x.text.trim().length > 0 &&
    Array.isArray(x.options) &&
    x.options.length === 4 &&
    x.options.every((o) => typeof o === 'string' && o.length > 0) &&
    Number.isInteger(x.correct) &&
    x.correct >= 0 &&
    x.correct < 4
  );
}

/** Načte sady ze složky; neplatné otázky (a soubory) přeskočí s varováním, aby kvíz nespadl. */
export function loadQuestionSets(dir: URL | string): QuizSet[] {
  const path = typeof dir === 'string' ? dir : fileURLToPath(dir);
  const files = fs.readdirSync(path).filter((f) => f.endsWith('.json')).sort();
  const sets: QuizSet[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(`${path}/${file}`, 'utf8')) as Partial<QuizSet>;
      if (typeof data.set !== 'string' || typeof data.name !== 'string' || !Array.isArray(data.questions)) throw new Error('chybí set, name nebo questions');
      const questions = data.questions.filter((q) => validQuestion(q) && !seen.has(q.id));
      const skipped = data.questions.length - questions.length;
      if (skipped > 0) console.warn(`  Sada otázek ${file}: přeskočeno ${skipped} neplatných nebo zdvojených otázek.`);
      for (const q of questions) seen.add(q.id);
      sets.push({ set: data.set, name: data.name, lang: data.lang ?? 'cs', questions });
    } catch (e) {
      console.warn(`  Sadu otázek ${file} nejde načíst: ${(e as Error).message}`);
    }
  }
  return sets;
}
