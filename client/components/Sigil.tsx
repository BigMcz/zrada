import { createContext, useContext } from 'react';
import type { Crest } from '../../shared/crests';
import { initials } from '../labels';

/** Kreslené znaky hráčů (Rozšíření 16): tahy v mřížce 24×24, barva podle okolního textu. */
const PATHS: Record<Crest, string[]> = {
  OWL: ['M6 4.5l2.5 2.5M18 4.5L15.5 7', 'M6 4.5V13a6 6 0 0 0 12 0V4.5', 'M7.5 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M12.5 10a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M11 13l1 1.5 1-1.5'],
  KEY: ['M4 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0', 'M11 12h10M17 12v3M20 12v2.5'],
  RAVEN: ['M3 14c3-1 5-4.5 9-4.5 2 0 3-2.5 5-2.5l3.5 1-3.5 1c0 4.5-3 7.5-8 7.5l-3 3v-3.2c-1.3-.3-2.3-1.2-3-2.3z', 'M16.3 8.5h.4'],
  LILY: ['M12 3c-2.2 3-2.2 6 0 9 2.2-3 2.2-6 0-9z', 'M12 12c-1-3-4-4.2-6.5-3 0 3 2 4.5 4.5 4.5', 'M12 12c1-3 4-4.2 6.5-3 0 3-2 4.5-4.5 4.5', 'M8 14.5h8M12 14.5V21M10 21h4'],
  CROWN: ['M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z', 'M5 21h14'],
  ANCHOR: ['M10 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M12 7v14M8.5 10h7', 'M4 13a8 8 0 0 0 16 0', 'M2.5 14.5L4 13l1.5 1.5M18.5 14.5L20 13l1.5 1.5'],
  SWORD: ['M12 2l2 3v10.5h-4V5z', 'M7 15.5h10M12 15.5V20', 'M11 21a1 1 0 1 0 2 0a1 1 0 1 0-2 0'],
  LANTERN: ['M9 3h6M10 3v2M14 3v2', 'M8 5h8l1 3v9l-1 2H8l-1-2V8z', 'M12 10c1.3 1.4 1.3 2.8 0 4.2-1.3-1.4-1.3-2.8 0-4.2z', 'M9 21.5h6'],
  SNAKE: ['M4 20.5c3 0 4-3 7-3s6-2 4-5-7-1-7-4.5 3-4 5.5-4', 'M12.5 4a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0', 'M15.7 4h2.3l1-1M18 4l1 1'],
  FOX: ['M4 3.5l4 5h8l4-5V11l-8 9-8-9z', 'M8.8 12l1.6 1M15.2 12l-1.6 1', 'M11.4 16.5h1.2'],
  ROSE: ['M7 8a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M12 6a2 2 0 1 0 2 2', 'M12 13v8', 'M12 17.5c-2 0-4-1-4-3 2 0 4 1 4 3z', 'M12 18.5c2 0 3.2-1 3.2-2.6-1.6 0-3.2 1-3.2 2.6z'],
  STAR: ['M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z'],
  EYE: ['M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z', 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M11.5 12h1'],
  MASK: ['M3 7c3 1 6 1 9 0 3 1 6 1 9 0 0 6-3 10-6 10-1.5 0-2-2-3-2s-1.5 2-3 2c-3 0-6-4-6-10z', 'M6.8 11c1-.8 2.2-.8 3.2 0M14 11c1-.8 2.2-.8 3.2 0'],
  CHALICE: ['M6 3h12c0 6-2.5 9-6 9S6 9 6 3z', 'M12 12v6M9 18h6M8 21h8'],
  TOWER: ['M6 21V8h12v13', 'M5 8V4h2.5v2h2V4h5v2h2V4H19v4', 'M10 21v-4a2 2 0 0 1 4 0v4', 'M11 11.5h2', 'M4 21h16'],
  MOON: ['M16 3.5a8.5 8.5 0 1 0 4.5 13A7 7 0 0 1 16 3.5z', 'M17.5 7.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z'],
  TREE: ['M12 2.5l-5 6h3l-4.5 5.5h3.5L5 19h14l-4-5h3.5L14 8.5h3z', 'M12 19v2.5M9.5 21.5h5'],
};

export function Sigil({ crest, className = '' }: { crest: Crest; className?: string }) {
  return (
    <svg className={`sigil ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[crest].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Obsah kroužku portrétu: znak hráče, nebo iniciály (stará uložená hra bez znaku). */
export function AvatarFace({ name, crest }: { name: string; crest?: Crest }) {
  return crest ? <Sigil crest={crest} /> : <>{initials(name)}</>;
}

/** Znaky hráčů podle id pro komponenty, které dostávají jen id a jméno (mřížky miniher). */
export const CrestOf = createContext<(id: string) => Crest | undefined>(() => undefined);

export function useCrestOf() {
  return useContext(CrestOf);
}
