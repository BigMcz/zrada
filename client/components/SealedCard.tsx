import { useState } from 'react';

interface Props {
  /** Text pod pečetí; obě role mají stejný počet řádků. */
  lines: string[];
  /** Nadpis pod pečetí (např. „Štít“), stejný pro všechny. */
  label?: string;
  onReveal?: () => void;
}

/**
 * Karta s pečetí pro tajné zprávy minihry: text je vidět jen po dobu podržení prstu.
 * Stejný vzhled jako karta role.
 */
export function SealedCard({ lines, label = 'Podrž prst pro tajnou zprávu', onReveal }: Props) {
  const [revealed, setRevealed] = useState(false);
  const hide = () => setRevealed(false);

  return (
    <div
      className={revealed ? 'role-card sealed revealed' : 'role-card sealed'}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={(e) => {
        setRevealed(true);
        onReveal?.();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // některé prohlížeče zachycení u dotyku nepodporují
        }
      }}
      onPointerUp={hide}
      onPointerCancel={hide}
      onLostPointerCapture={hide}
      onKeyDown={(e) => {
        if (e.key === ' ') {
          setRevealed(true);
          onReveal?.();
        }
      }}
      onKeyUp={hide}
      onBlur={hide}
      onContextMenu={(e) => e.preventDefault()}
    >
      {revealed ? (
        lines.map((line, i) => (
          <span key={i} className={i === 0 ? 'secret-line first' : 'secret-line'}>
            {line}
          </span>
        ))
      ) : (
        <>
          <span className="seal" aria-hidden>
            ✦
          </span>
          <span className="role-line">{label}</span>
        </>
      )}
    </div>
  );
}
