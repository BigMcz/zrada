import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 1_000;

/**
 * Poklad jako počítadlo (Rozšíření 14): při změně se číslo protočí k nové hodnotě.
 * Přírůstek zlatě zazáří, úbytek krátce zčervená.
 */
export function PotCounter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const [trend, setTrend] = useState<'up' | 'down' | null>(null);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    setTrend(value > start ? 'up' : 'down');
    const t0 = performance.now();
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / DURATION_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (k < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    const clear = setTimeout(() => setTrend(null), DURATION_MS + 600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(clear);
      from.current = value;
    };
  }, [value]);

  return <span className={trend ? `pot-counter ${trend}` : 'pot-counter'}>{shown.toLocaleString('cs')}</span>;
}
