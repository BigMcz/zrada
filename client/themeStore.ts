// Téma hry na klientu (Rozšíření 16): barvy, erb, záložka a názvy rolí a fází podle pohledu ze serveru.
import type { RecapAward } from '../shared/types';
import { THEME, type Theme, type ThemeId } from '../shared/themes';
import { PHASE_LABEL, ROLE_LABEL } from './labels';

let current: Theme = THEME.CASTLE;

/** Aktuální téma; komponenty ho čtou při vykreslení (nový pohled = nové vykreslení). */
export function theme(): Theme {
  return current;
}

/** Přepne téma: proměnné barev přes data-theme, ikonu stránky, název záložky a popisky. */
export function applyTheme(id: ThemeId | undefined): void {
  const t = (id && THEME[id]) || THEME.CASTLE;
  const root = document.documentElement;
  if (t === current && root.dataset.theme === t.id.toLowerCase()) return;
  current = t;
  ROLE_LABEL.LOYAL = t.loyal.sg;
  ROLE_LABEL.TRAITOR = t.traitor.sg;
  PHASE_LABEL.VOTE = t.table;
  PHASE_LABEL.VOTE_RESULT = t.table;
  PHASE_LABEL.NIGHT = t.night;
  root.dataset.theme = t.id.toLowerCase();
  document.title = t.title;
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon) icon.href = t.crest;
}

/** „Věrní“ / „Zrádci“ podle vítěze. */
export function winnersWord(winner: 'LOYAL' | 'TRAITOR' | undefined | null): string {
  return winner === 'TRAITOR' ? current.traitor.pl : current.loyal.pl;
}

/** Název a popisek ceny v rekapitulaci podle tématu (server posílá hradní texty). */
export function awardText(a: RecapAward): { title: string; note: string } {
  const t = current;
  if (a.key === 'DETECTIVE') return { title: 'Detektiv', note: `nejvíc hlasů pro ${t.traitor.accPl}` };
  if (a.key === 'DECEIVER') return { title: 'Mistr klamu', note: `${t.traitor.sg} s nejméně hlasy proti sobě` };
  return { title: `Nejpodezřelejší ${t.loyal.sg}`, note: 'nejvíc hlasů proti sobě' };
}

/** Úvodní věty obrazovky. */
export function introLines(): string[] {
  const t = current;
  return [...t.intro, `Mezi vámi se skrývají ${t.traitor.pl}.`, `${t.loyal.pl} je musí odhalit. ${t.traitor.pl} musí přežít.`];
}
