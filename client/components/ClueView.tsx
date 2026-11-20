import type { Clue } from '../../shared/types';

/** Stopa z minihry: veřejná data jako tabulka nebo seznam. */
export function ClueView({ clues, nameOf }: { clues: Clue[]; nameOf: (id: string) => string }) {
  return (
    <div className="clues">
      {clues.map((clue, i) => (
        <section key={i} className="clue">
          <h3>{clue.title}</h3>
          <ul>
            {clue.rows.map((row, j) => (
              <li key={j}>
                <span>{row.playerId ? nameOf(row.playerId) : row.label}</span>
                <span className="clue-value">{row.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
