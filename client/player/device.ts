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
    if (last.current !== undefined && key && key !== last.current) navigator.vibrate?.(200);
    last.current = key;
  }, [key]);
}

/** Upozornění „Nezhasínej displej“ jen tam, kde Wake Lock nejde; po ťuknutí zmizí. */
export function useWakeHint(supported: boolean): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  return [!supported && !hidden, () => setHidden(true)];
}
