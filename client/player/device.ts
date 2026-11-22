// Telefon během hry (DOC/SPEC.md, Rozšíření 10): displej nezhasne a nový úkol krátce zavibruje.
import { useEffect, useRef, useState } from 'react';
import type { View } from '../../shared/types';

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } };

/**
 * Podrží displej rozsvícený (Wake Lock API). Prohlížeč to dovolí až po ťuknutí, proto se
 * žádá při prvním dotyku a znovu po návratu do prohlížeče (zámek se při skrytí stránky uvolní).
 * Vrací false, když to prohlížeč neumí – telefon pak ukáže upozornění.
 */
export function useWakeLock(): boolean {
  const nav = navigator as WakeLockNavigator;
  const supported = typeof nav.wakeLock?.request === 'function';
  const lock = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!supported) return;
    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock.current && !lock.current.released)) return;
      try {
        lock.current = await nav.wakeLock!.request('screen');
      } catch {
        // Úsporný režim nebo zamítnutí: zkusí se znovu při dalším dotyku.
      }
    };
    const onVisible = () => void request();
    window.addEventListener('pointerdown', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    void request();
    return () => {
      window.removeEventListener('pointerdown', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      void lock.current?.release().catch(() => undefined);
    };
  }, [supported]);

  return supported;
}

/**
 * Zavibruje, pokud to telefon umí. Prohlížeč vibraci pustí až po prvním ťuknutí na stránku
 * (jinak jen zapíše chybu do konzole), proto se do té doby nic neděje.
 */
export function buzz(pattern: number | number[]): void {
  const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
  if (activated) navigator.vibrate?.(pattern);
}

/** Krátké cuknutí po potvrzení vlastní volby (hlas, odpověď, tah) – Rozšíření 14. */
export const CONFIRM_BUZZ = 35;

/**
 * Haptika veřejného dění v minihrách (Rozšíření 14): výbuch Horkého bramboru a chyba u bomby.
 * Obojí vidí všichni, takže vibrace nic neprozradí.
 */
export function useEventHaptics(view: View | null): void {
  const mg = view?.kind === 'player' && view.phase === 'MINIGAME' ? view.minigame : undefined;
  const game = mg?.game as { eliminated?: unknown[]; errors?: unknown } | null | undefined;
  const boom = mg?.id === 'HOT_POTATO' && Array.isArray(game?.eliminated) ? game.eliminated.length : null;
  const bombErrors = mg?.id === 'BOMB' && typeof game?.errors === 'number' ? game.errors : null;
  const last = useRef<{ boom: number | null; bombErrors: number | null } | null>(null);
  useEffect(() => {
    const prev = last.current;
    if (prev && boom !== null && prev.boom !== null && boom > prev.boom) buzz([120, 60, 320]);
    if (prev && bombErrors !== null && prev.bombErrors !== null && bombErrors > prev.bombErrors) buzz([80, 50, 80, 50, 220]);
    last.current = { boom, bombErrors };
  }, [boom, bombErrors]);
}

/**
 * Úkol, při jehož začátku telefon zavibruje. Stejný pro všechny hráče (Věrné, Zrádce i duchy),
 * aby vibrace nic neprozradila: role rozdány, hlasování, noc, start minihry, finálové hlasování.
 */
function taskKey(view: View | null): string | null {
  if (!view || view.kind !== 'player') return null;
  const { phase, round } = view;
  if (phase === 'ROLES' || phase === 'VOTE' || phase === 'NIGHT') return `${phase}-${round}`;
  if (phase === 'MINIGAME' && view.minigame?.step === 'PLAY') return `PLAY-${round}`;
  if ((phase as string) === 'FINAL_VOTE') return `FINAL-${round}`;
  return null;
}

/** Krátká vibrace (200 ms) na začátku nového úkolu; kde to prohlížeč neumí (iPhone), nic. */
export function useTaskVibration(view: View | null): void {
  const last = useRef<string | null | undefined>(undefined);
  const key = taskKey(view);
  useEffect(() => {
    // První pohled po načtení stránky nevibruje (návrat do hry není nový úkol).
    // Prohlížeč vibraci pustí až po prvním ťuknutí na stránku (jinak jen zapíše chybu do konzole).
    if (last.current !== undefined && key && key !== last.current) buzz(200);
    last.current = key;
  }, [key]);
}

/** Upozornění „Nezhasínej displej“ jen tam, kde Wake Lock nejde; po ťuknutí zmizí. */
export function useWakeHint(supported: boolean): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  return [!supported && !hidden, () => setHidden(true)];
}
