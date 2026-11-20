import type {
  QuizGhostView,
  QuizModeratorView,
  QuizPlayerView,
  QuizRow,
} from '../../../server/minigames/quiz/index';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

const LETTERS = ['A', 'B', 'C', 'D'];

interface OptionsProps {
  options: string[];
  hint: number | null;
  myAnswer: number | null;
  correct: number | null;
  open: boolean;
  onPick: (i: number) => void;
}

/** Čtyři dlaždice odpovědí. Svíčka je malá ikona; po otázce se ukáže správná odpověď. */
function Options({ options, hint, myAnswer, correct, open, onPick }: OptionsProps) {
  return (
    <div className="quiz-options">
      {options.map((text, i) => {
        const cls = ['quiz-option'];
        if (myAnswer === i) cls.push('selected');
        if (correct !== null && i === correct) cls.push('right');
        if (correct !== null && myAnswer === i && i !== correct) cls.push('wrong');
        return (
          <button key={i} type="button" className={cls.join(' ')} disabled={!open || myAnswer !== null} onClick={() => onPick(i)}>
            <span className="quiz-letter">{LETTERS[i]}</span>
            <span className="quiz-text">{text}</span>
            <span className="quiz-candle" aria-label={hint === i ? 'nápověda' : undefined}>
              {hint === i ? '🕯️' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Standings({ title, rows, nameOf }: { title: string; rows: QuizRow[]; nameOf: (id: string) => string }) {
  if (rows.length === 0) return null;
  let place = 0;
  return (
    <section className="clue quiz-standings">
      <h3>{title}</h3>
      <ul>
        {rows.map((r, i) => {
          if (i === 0 || rows[i - 1].points !== r.points) place = i + 1;
          return (
            <li key={r.id}>
              <span>
                {place}. {nameOf(r.id)}
              </span>
              <span className="clue-value">{r.points} b.</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Header({ game }: { game: { index: number; total: number; question: { text: string } } }) {
  return (
    <>
      <p className="center muted quiz-count">
        Otázka {game.index + 1} / {game.total}
      </p>
      <p className="quiz-question">{game.question.text}</p>
    </>
  );
}

/** Telefon. Věrný i Zrádce vypadají stejně; svíčka je jen jiná hodnota ze serveru. */
export function QuizPlayer({ game, nameOf, send }: MinigamePlayerProps<QuizPlayerView>) {
  const open = game.stage === 'QUESTION';
  return (
    <>
      <Header game={game} />
      <Options
        options={game.question.options}
        hint={game.hint}
        myAnswer={game.myAnswer}
        correct={game.correct}
        open={open}
        onPick={(i) => send({ option: i })}
      />
      {open ? (
        <p className="center muted">
          {game.myAnswer !== null ? 'Odpověď zamčena. ' : ''}Odpovědělo {game.answeredCount} z {game.standings.length}
        </p>
      ) : (
        <Standings title="Průběžné pořadí" rows={game.standings} nameOf={nameOf} />
      )}
    </>
  );
}

/** Duch hraje stejný kvíz bez svíčky, má vlastní pořadí duchů. */
export function QuizGhost({ game, nameOf, send }: MinigamePlayerProps<QuizGhostView>) {
  const open = game.stage === 'QUESTION';
  return (
    <>
      <Header game={game} />
      <Options
        options={game.question.options}
        hint={null}
        myAnswer={game.myAnswer}
        correct={game.correct}
        open={open}
        onPick={(i) => send({ option: i })}
      />
      {open ? (
        <p className="center muted">{game.myAnswer !== null ? 'Odpověď zamčena.' : 'Hraješ mimo soutěž, bez svíčky.'}</p>
      ) : (
        <>
          <Standings title="Pořadí duchů" rows={game.ghostStandings} nameOf={nameOf} />
          <Standings title="Pořadí hráčů" rows={game.standings} nameOf={nameOf} />
        </>
      )}
    </>
  );
}

/** Konzole: správná odpověď, kdo jak odpověděl, kde mají Věrní náhodné svíčky. */
export function QuizModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<QuizModeratorView>) {
  const stageLabel = { QUESTION: 'Otázka běží', REVEAL: 'Správná odpověď', DONE: 'Konec kvízu' }[game.stage];
  return (
    <>
      <p className="phase-detail">
        {stageLabel} · otázka {game.index + 1} / {game.total}
      </p>
      <p className="quiz-console-question">{game.question.text}</p>
      <ul className="console-players compact">
        {game.question.options.map((text, i) => (
          <li key={i}>
            <span className="grow name">
              {LETTERS[i]}. {text} {i === game.correct ? '✓' : ''}
            </span>
          </li>
        ))}
      </ul>
      <ul className="console-players compact">
        {players.map((id) => {
          const a = game.answers[id];
          const hint = game.hints[id];
          const real = game.traitors.includes(id);
          return (
            <li key={id}>
              <span className="grow name">{nameOf(id)}</span>
              <span className="state">
                {game.hintOn && hint !== undefined ? `🕯️ ${LETTERS[hint]}${real ? ' (pravá)' : hint === game.correct ? ' (náhodou dobře)' : ''} · ` : ''}
                {a ? `${LETTERS[a.option]} ${a.option === game.correct ? '✓' : '✗'} za ${(a.ms / 1000).toFixed(1).replace('.', ',')} s` : '—'}
              </span>
            </li>
          );
        })}
      </ul>
      <Standings title="Pořadí hráčů" rows={game.standings} nameOf={nameOf} />
      <Standings title="Pořadí duchů" rows={game.ghostStandings} nameOf={nameOf} />
      {game.stage === 'REVEAL' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'next' })}>
          {game.index + 1 >= game.total ? 'Ukončit kvíz' : 'Další otázka'}
        </button>
      )}
    </>
  );
}
