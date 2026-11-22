import { useState } from 'react';
import type { ModeratorView } from '../../shared/types';
import script from './script.cs.json';
import { theme } from '../themeStore';
import { themeText } from '../../shared/themes';

const STORAGE_KEY = 'zrada-scenar-skryty';
const TEXTS = script as Record<string, string>;

function readHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Klíč scénáře: fáze, u minihry i krok („MINIGAME.PLAY“). */
export function scriptKey(view: ModeratorView): string {
  return view.phase === 'MINIGAME' && view.minigame ? `MINIGAME.${view.minigame.step}` : view.phase;
}

/**
 * Scénář pro moderátora (Rozšíření 12): 1–2 věty k přečtení nahlas v aktuální fázi.
 * Texty jsou v script.cs.json; scénář jde skrýt a prohlížeč si to pamatuje.
 */
export function ScriptHint({ view }: { view: ModeratorView }) {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // bez úložiště si to prohlížeč jen nezapamatuje
    }
  };
  const raw = TEXTS[scriptKey(view)];
  // Scénář je psaný pro hrad; v jiném tématu se přepíšou role, stůl a místo (Rozšíření 16).
  const text = raw && themeText(raw, theme());
  if (!text) return null;
  return (
    <aside className={hidden ? 'script-hint hidden' : 'script-hint'}>
      <button type="button" className="link" onClick={toggle}>
        {hidden ? 'Ukázat scénář' : 'Skrýt scénář'}
      </button>
      {!hidden && <p>„{text}“</p>}
    </aside>
  );
}
