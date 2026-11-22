import { useState } from 'react';
import type { Role } from '../../shared/types';
import { SealCrack } from './SealCrack';

interface Props {
  role: Role;
  allies: { id: string; name: string }[];
  /** Řádek o štítu (jen když se hrají minihry); stejné místo pro všechny. */
  shieldLine?: string;
}

/**
 * Karta s pečetí: role je vidět jen po dobu, kdy hráč drží prst.
 * Obě role mají stejnou barvu, velikost i počet řádků – liší se jen text.
 */
export function RoleCard({ role, allies, shieldLine }: Props) {
  const [revealed, setRevealed] = useState(false);
  const hide = () => setRevealed(false);

  let title: string;
  let line: string;
  if (role === 'TRAITOR') {
    title = 'Jsi Zrádce';
    line = allies.length > 0 ? `Tví spojenci: ${allies.map((a) => a.name).join(', ')}` : 'Jsi sám. Nikdo tě nesmí odhalit.';
  } else {
    title = 'Jsi Věrný';
    line = 'Najdi Zrádce dřív, než najdou tebe.';
  }

  return (
    <div
      className={revealed ? 'role-card revealed' : 'role-card'}
      role="button"
      tabIndex={0}
      aria-label="Podrž pro zobrazení role"
      onPointerDown={(e) => {
        setRevealed(true);
        // Prst může při držení sklouznout z karty; zachycení zajistí, že puštění dorazí sem.
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // některé prohlížeče zachycení u dotyku nepodporují
        }
      }}
      onPointerUp={hide}
      onPointerCancel={hide}
      onLostPointerCapture={hide}
      onKeyDown={(e) => e.key === ' ' && setRevealed(true)}
      onKeyUp={hide}
      onBlur={hide}
      onContextMenu={(e) => e.preventDefault()}
    >
      {revealed ? (
        <>
          <SealCrack />
          <span className="role-title">{title}</span>
          <span className="role-line">{line}</span>
          {shieldLine && <span className="role-line shield-line">{shieldLine}</span>}
        </>
      ) : (
        <>
          <span className="seal" aria-hidden>
            ✦
          </span>
          <span className="role-line">Podrž prst pro zobrazení role</span>
        </>
      )}
    </div>
  );
}
