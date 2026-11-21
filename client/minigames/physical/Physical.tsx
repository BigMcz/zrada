import { useState } from 'react';
import type { PhysicalModeratorView, PhysicalPlayerView } from '../../../server/minigames/physical/index';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

const MAX_TEXT = 300;

/** Telefon hráče i ducha: zadání mise velkým písmem. */
export function PhysicalPlayer({ game }: MinigamePlayerProps<PhysicalPlayerView>) {
  if (game.text === null) return <p className="lead center">Moderátor připravuje misi…</p>;
  return (
    <>
      <p className="center muted">Zadání mise</p>
      <p className="physical-text">{game.text}</p>
      <p className="lead center">{game.stage === 'DONE' ? 'Mise skončila.' : 'Plňte misi!'}</p>
    </>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Konzole: napsat a zveřejnit zadání, pak zapsat výsledek. */
export function PhysicalModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<PhysicalModeratorView>) {
  const [text, setText] = useState('');
  const [pot, setPot] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (game.stage === 'BRIEF') {
    return (
      <>
        <p className="phase-detail">Napiš zadání mise. Telefony ho uvidí po zveřejnění.</p>
        <div className="physical-suggestions">
          {game.suggestions.map((s) => (
            <button key={s} type="button" className="link" onClick={() => setText(s)}>
              {s}
            </button>
          ))}
        </div>
        <textarea
          className="physical-input"
          rows={4}
          maxLength={MAX_TEXT}
          value={text}
          placeholder="Zadání mise"
          onChange={(e) => setText(e.target.value)}
        />
        <p className="muted">
          {text.trim().length} / {MAX_TEXT}
        </p>
        <button
          type="button"
          className="console-primary big"
          disabled={busy || text.trim().length === 0}
          onClick={() => send({ action: 'publish', text })}
        >
          Zveřejnit zadání
        </button>
      </>
    );
  }

  const pots: number[] = [];
  for (let v = game.potMin; v <= game.potMax; v += game.potStep) pots.push(v);

  if (game.stage === 'DONE') {
    const o = game.outcome!;
    return (
      <>
        <p className="physical-text small">{game.text}</p>
        <p className="phase-detail">
          Poklad {sign(o.potDelta)} · štít {o.winnerId ? nameOf(o.winnerId) : 'nikdo'} · duch {o.ghostId ? nameOf(o.ghostId) : 'nikdo'}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="physical-text small">{game.text}</p>
      <h3>Změna pokladu</h3>
      <div className="segmented physical-pots">
        {pots.map((v) => (
          <button key={v} type="button" className={v === pot ? 'active' : ''} onClick={() => setPot(v)}>
            {sign(v)}
          </button>
        ))}
      </div>
      <h3>Štít získá</h3>
      <div className="segmented physical-pick">
        {[null, ...players].map((id) => (
          <button key={id ?? 'none'} type="button" className={id === winner ? 'active' : ''} onClick={() => setWinner(id)}>
            {id ? `${nameOf(id)}${game.traitors.includes(id) ? ' 🗡️' : ''}` : 'Nikdo'}
          </button>
        ))}
      </div>
      {game.ghosts.length > 0 && (
        <>
          <h3>Duch s 3 body</h3>
          <div className="segmented physical-pick">
            {[null, ...game.ghosts].map((id) => (
              <button key={id ?? 'none'} type="button" className={id === ghost ? 'active' : ''} onClick={() => setGhost(id)}>
                {id ? `👻 ${nameOf(id)}` : 'Nikdo'}
              </button>
            ))}
          </div>
        </>
      )}
      <h3>Stopa (nepovinná)</h3>
      <textarea
        className="physical-input"
        rows={2}
        maxLength={MAX_TEXT}
        value={note}
        placeholder="Např. Petra upustila klíč dvakrát."
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        className="console-primary big"
        disabled={busy}
        onClick={() => send({ action: 'result', potDelta: pot, winnerId: winner, ghostId: ghost, note })}
      >
        Uložit výsledek
      </button>
    </>
  );
}
