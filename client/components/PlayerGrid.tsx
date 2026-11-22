import type { PublicPlayer } from '../../shared/types';
import { AvatarFace } from './Sigil';

interface Props {
  players: PublicPlayer[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /**
   * Hráči, na které klepnutí nic neudělá (spoluzrádci v noci).
   * Záměrně vypadají úplně stejně jako ostatní, aby z obrazovky nešlo nic poznat.
   */
  blocked?: string[];
  disabled?: boolean;
}

/** Mřížka portrétů hráčů (3 sloupce). */
export function PlayerGrid({ players, selectedId, onSelect, blocked = [], disabled }: Props) {
  return (
    <div className="player-grid">
      {players.map((p) => (
        <button
          key={p.id}
          type="button"
          className={p.id === selectedId ? 'portrait selected' : 'portrait'}
          disabled={disabled}
          onClick={() => {
            if (!blocked.includes(p.id)) onSelect?.(p.id);
          }}
        >
          <span className="avatar">
            <AvatarFace name={p.name} crest={p.crest} />
          </span>
          <span className="portrait-name">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
