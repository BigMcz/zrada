import { useEffect, useRef, useState } from 'react';

/** Obrázky minihry Předej bombu (zmenšené z img/bomb.png a img/bomb_explode.png). */
const BOMB_IMG = '/bomba.webp';
const BOOM_IMG = '/vybuch.webp';

// Načíst předem, ať první výbuch neblikne prázdným místem.
if (typeof Image !== 'undefined') for (const src of [BOMB_IMG, BOOM_IMG]) new Image().src = src;

/** Krátký záblesk výbuchu po každém vyřazení (i u první ze dvou bomb, kdy hra běží dál). */
export function useBoomFlash(eliminated: number, ms = 1600): boolean {
  const prev = useRef(eliminated);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const grew = eliminated > prev.current;
    prev.current = eliminated;
    if (!grew) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [eliminated, ms]);
  return on;
}

export type BombLook = 'hot' | 'idle' | 'boom';

/** Bomba (tiká u držitele, jinak ztlumená) nebo výbuch. `id` znovu spustí animaci výbuchu. */
export function BombArt({ look, id = 0, className = '' }: { look: BombLook; id?: number; className?: string }) {
  if (look === 'boom') return <img key={`boom-${id}`} src={BOOM_IMG} alt="" aria-hidden="true" draggable={false} className={`bomb-art boom ${className}`} />;
  return <img src={BOMB_IMG} alt="" aria-hidden="true" draggable={false} className={`bomb-art ${look} ${className}`} />;
}
