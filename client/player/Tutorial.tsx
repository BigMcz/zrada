import { useState } from 'react';
import { createPortal } from 'react-dom';

const SEEN_KEY = 'zrada-navod';

/** Tři karty „Jak se hraje“ (Rozšíření 16). */
const CARDS = [
  {
    icon: '🗡️',
    title: 'Cíl hry',
    text: 'Mezi vámi se skrývají Zrádci. Věrní je musí odhalit a vyhnat. Zrádci se snaží zůstat skrytí, dokud jich nebude stejně jako Věrných.',
  },
  {
    icon: '🕯️',
    title: 'Den a noc',
    text: 'Přes den se u kulatého stolu radíte a hlasujete, koho vyhnat. V noci Zrádci tajně vyberou oběť. Mluvte spolu – telefon jen tajně hlasuje.',
  },
  {
    icon: '🛡️',
    title: 'Minihry a poklad',
    text: 'Ve dne hrajete minihry o štít, který na jednu noc chrání před vraždou, a o společný poklad. Zrádci v nich mají tajný úkol. Na konci se poklad rozdělí mezi vítěze.',
  },
];

/** Byl už návod na tomto telefonu ukázán? (Soukromé okno nebo zablokované úložiště = ukázat.) */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Bez úložiště se návod ukáže znovu po obnovení stránky; nevadí.
  }
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;
  const close = () => {
    markSeen();
    onClose();
  };
  // Portál do body: obsah obrazovky má animaci s transformací, uvnitř by překryv nepokryl celý displej.
  return createPortal(
    <div className="overlay tutorial" role="dialog" aria-label="Jak se hraje">
      <div className="overlay-panel">
        <div className="tutorial-card" key={i}>
          <span className="tutorial-icon" aria-hidden="true">
            {card.icon}
          </span>
          <h2>{card.title}</h2>
          <p>{card.text}</p>
        </div>
        <div className="tutorial-dots" aria-hidden="true">
          {CARDS.map((c, n) => (
            <span key={c.title} className={n === i ? 'on' : ''} />
          ))}
        </div>
        <button type="button" className="primary" onClick={() => (last ? close() : setI(i + 1))}>
          {last ? 'Rozumím' : 'Další'}
        </button>
        {!last && (
          <button type="button" className="secondary" onClick={close}>
            Přeskočit
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
