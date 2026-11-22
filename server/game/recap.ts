// Rekapitulace na konci hry (DOC/SPEC.md, Rozšíření 11): časová osa kol a ceny.
// Ven jdou jen ceny se jmény a počty, nikdy kompletní seznam, kdo pro koho hlasoval.
import type { Recap, RecapAward } from '../../shared/types.js';
import type { GameState } from './state.js';

/** Počet hlasů podle klíče (kdo hlasoval / pro koho). */
function countBy(entries: { voterId: string; targetId: string }[], key: 'voterId' | 'targetId'): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) out.set(e[key], (out.get(e[key]) ?? 0) + 1);
  return out;
}

/** Všichni s nejvyšší (nebo nejnižší) hodnotou; prázdné, když podmínka nikoho nevybere. */
function best(ids: string[], score: (id: string) => number, pick: 'max' | 'min', minScore = 0): { ids: string[]; count: number } {
  if (ids.length === 0) return { ids: [], count: 0 };
  const scores = ids.map(score);
  const target = pick === 'max' ? Math.max(...scores) : Math.min(...scores);
  if (pick === 'max' && target <= minScore) return { ids: [], count: 0 };
  return { ids: ids.filter((_, i) => scores[i] === target), count: target };
}

export function recapOf(state: GameState): Recap {
  const role = (id: string) => state.players.find((p) => p.id === id)?.role;
  const traitors = state.players.filter((p) => p.role === 'TRAITOR').map((p) => p.id);
  const loyal = state.players.filter((p) => p.role === 'LOYAL').map((p) => p.id);
  const against = countBy(state.voteLog, 'targetId');
  const onTraitors = countBy(
    state.voteLog.filter((v) => role(v.targetId) === 'TRAITOR'),
    'voterId',
  );

  const awards: RecapAward[] = [];
  const detective = best(loyal.concat(traitors), (id) => onTraitors.get(id) ?? 0, 'max');
  if (detective.ids.length > 0) {
    awards.push({ key: 'DETECTIVE', title: 'Detektiv', note: 'nejvíc hlasů pro Zrádce', ...detective });
  }
  const deceiver = best(traitors, (id) => against.get(id) ?? 0, 'min');
  if (deceiver.ids.length > 0) {
    awards.push({ key: 'DECEIVER', title: 'Mistr klamu', note: 'Zrádce s nejméně hlasy proti sobě', ...deceiver });
  }
  const suspect = best(loyal, (id) => against.get(id) ?? 0, 'max');
  if (suspect.ids.length > 0) {
    awards.push({ key: 'SUSPECT', title: 'Nejpodezřelejší Věrný', note: 'nejvíc hlasů proti sobě', ...suspect });
  }

  return {
    rounds: state.history.map((h) => ({
      round: h.round,
      banishedId: h.banishedId,
      murderedId: h.murderedId,
      minigame: h.minigame ? { name: h.minigame.name, shieldWinnerId: h.minigame.shieldWinnerId } : null,
    })),
    awards,
  };
}
