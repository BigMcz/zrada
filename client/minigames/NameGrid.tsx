import { AvatarFace, useCrestOf } from '../components/Sigil';

/** Mřížka jmen; aktivní dlaždice jdou zmáčknout, označené svítí. */
export function NameGrid({
  ids,
  nameOf,
  enabled = [],
  marked = [],
  onPick,
}: {
  ids: string[];
  nameOf: (id: string) => string;
  enabled?: string[];
  marked?: string[];
  onPick?: (id: string) => void;
}) {
  const crestOf = useCrestOf();
  return (
    <div className={enabled.length > 0 ? 'player-grid passing' : 'player-grid'}>
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className={marked.includes(id) ? 'portrait selected' : 'portrait'}
          disabled={!enabled.includes(id)}
          onClick={() => onPick?.(id)}
        >
          <span className="avatar">
            <AvatarFace name={nameOf(id)} crest={crestOf(id)} />
          </span>
          <span className="portrait-name">{nameOf(id)}</span>
        </button>
      ))}
    </div>
  );
}
