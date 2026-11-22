import { useEffect, useState } from 'react';
import { REACTION_COOLDOWN_MS, REACTIONS, type Reaction } from '../../shared/types';
import { react } from '../socket';
import { buzz, CONFIRM_BUZZ } from './device';

/**
 * Reakce na velkou obrazovku (Rozšíření 16): ráno a u kulatého stolu. Anonymní, nejvýš jedna za 3 s.
 * Po odeslání se řádek na chvíli zašedne, ať je vidět, proč další ťuknutí nic nedělá.
 */
export function ReactionBar() {
  const [cooling, setCooling] = useState(false);
  useEffect(() => {
    if (!cooling) return;
    const id = setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS);
    return () => clearTimeout(id);
  }, [cooling]);

  const send = async (emoji: Reaction) => {
    if (cooling) return;
    setCooling(true);
    const res = await react(emoji);
    if (res.ok) buzz(CONFIRM_BUZZ);
  };

  return (
    <div className={cooling ? 'reaction-bar cooling' : 'reaction-bar'} aria-label="Reakce na obrazovku">
      {REACTIONS.map((r) => (
        <button key={r} type="button" disabled={cooling} onClick={() => void send(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}
