import type { GhostRank } from '../../shared/types';

interface Props {
  ghosts: GhostRank[];
  /** Jména hráčů podle id. */
  nameOf: (id: string) => string;
}

/** Pořadí se stejným místem při shodě bodů (1, 1, 3). Vyhnaný Zrádce pořadí nemá. */
export function rankGhosts<T extends GhostRank>(ghosts: T[]): { ghost: T; place: number | null }[] {
  const tipping = ghosts.filter((g) => g.canTip).sort((a, b) => b.points - a.points);
  const ranked = tipping.map((ghost) => ({
    ghost,
    place: tipping.findIndex((g) => g.points === ghost.points) + 1,
  }));
  const watching = ghosts.filter((g) => !g.canTip).map((ghost) => ({ ghost, place: null }));
  return [...ranked, ...watching];
}

/** Žebříček duchů na konci hry (telefon i konzole). */
export function GhostBoard({ ghosts, nameOf }: Props) {
  if (ghosts.length === 0) return null;
  return (
    <section className="ghost-board">
      <h2>Žebříček duchů</h2>
      <ol>
        {rankGhosts(ghosts).map(({ ghost, place }) => (
          <li key={ghost.id} className={place === 1 ? 'first' : ''}>
            <span className="place">{place ?? '–'}</span>
            <span className="grow">{nameOf(ghost.id)}</span>
            <span className="points">
              {ghost.canTip ? `${ghost.points} ${pointsWord(ghost.points)}` : 'netipoval/a'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Žebříček všech hráčů podle osobních bodů (konec hry). */
export function PlayerBoard({ board, nameOf }: { board: { id: string; points: number }[]; nameOf: (id: string) => string }) {
  if (board.length === 0) return null;
  const sorted = [...board].sort((a, b) => b.points - a.points);
  return (
    <section className="ghost-board player-board">
      <h2>Žebříček hráčů</h2>
      <ol>
        {sorted.map((p) => {
          const place = sorted.findIndex((x) => x.points === p.points) + 1;
          return (
            <li key={p.id} className={place === 1 ? 'first' : ''}>
              <span className="place">{place}</span>
              <span className="grow">{nameOf(p.id)}</span>
              <span className="points">
                {p.points} {pointsWord(p.points)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function pointsWord(n: number): string {
  if (n === 1) return 'bod';
  if (n >= 2 && n <= 4) return 'body';
  return 'bodů';
}
