import { useEffect, useState } from 'react';
import { serverNow } from '../socket';

/**
 * Zbývající čas do `endsAt` (čas serveru). Klient si odpočet kreslí sám.
 * Čas se bere při každém vykreslení: uložený „teď“ by po změně `endsAt` (např. hra → předání štítu)
 * na chvíli ukázal úplně jiné číslo.
 */
export function useRemaining(endsAt: number | null): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(0, endsAt - serverNow());
}

export function formatMs(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Odpočet „0:42“; posledních 10 s jemně pulzuje (stejně pro všechny role). */
export function Countdown({ endsAt }: { endsAt: number | null }) {
  const left = useRemaining(endsAt);
  if (left === null) return null;
  return <span className={left <= 10_000 ? 'countdown urgent' : 'countdown'}>{formatMs(left)}</span>;
}
