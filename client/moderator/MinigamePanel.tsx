import { useState } from 'react';
import type { Intent, ModeratorView } from '../../shared/types';
import { ClueView } from '../components/ClueView';
import { Countdown } from '../components/Countdown';
import { nameOf } from '../labels';
import { MINIGAME_UI } from '../minigames/registry';

interface Props {
  view: ModeratorView;
  run: (intent: Intent) => void;
  busy: boolean;
}

/** Řízení minihry v konzoli: v každém kroku jedno hlavní tlačítko dalšího kroku. */
export function MinigamePanel({ view, run, busy }: Props) {
  const mg = view.minigame!;
  const name = (id: string | null | undefined) => nameOf(view.players, id);
  const alive = view.players.filter((p) => p.status === 'ALIVE');
  const [manual, setManual] = useState('');

  const skip = (
    <button type="button" className="toggle" disabled={busy} onClick={() => run({ type: 'skipMinigame' })}>
      Přeskočit minihru
    </button>
  );

  switch (mg.step) {
    case 'DRAW':
      return (
        <>
          <h1>Los minihry</h1>
          <p className="phase-detail">
            Vylosováno: <b>{mg.name}</b>
          </p>
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run({ type: 'confirmMinigame' })}>
            Potvrdit a ukázat pravidla
          </button>
          <div className="minigame-actions">
            {mg.canReroll && (
              <button type="button" className="toggle" disabled={busy} onClick={() => run({ type: 'rerollMinigame' })}>
                Přelosovat
              </button>
            )}
            {mg.choices.length > 1 && (
              <select
                value={manual}
                onChange={(e) => {
                  setManual(e.target.value);
                  if (e.target.value) run({ type: 'chooseMinigame', id: e.target.value });
                }}
              >
                <option value="">Vybrat ručně…</option>
                {mg.choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {skip}
          </div>
        </>
      );

    case 'INTRO': {
      const seen = alive.filter((p) => mg.secretCardSeen[p.id]).length;
      return (
        <>
          <h1>{mg.name}</h1>
          <p className="phase-detail">
            Hráči čtou pravidla. Tajnou kartu vidělo <b>{seen}</b> z {alive.length}.
            {seen < alive.length && ' Počkej, až ji uvidí všichni.'}
          </p>
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run({ type: 'startMinigame' })}>
            Spustit hru
          </button>
          <div className="minigame-actions">{skip}</div>
        </>
      );
    }

    case 'PLAY': {
      const ui = mg.id ? MINIGAME_UI[mg.id] : undefined;
      return (
        <>
          <h1>
            {mg.name} <Countdown endsAt={mg.endsAt} />
          </h1>
          {ui && mg.game !== null ? (
            <ui.Moderator
              game={mg.game}
              nameOf={(id: string) => name(id)}
              players={alive.map((p) => p.id)}
              send={(payload: unknown) => run({ type: 'minigameModerator', payload })}
              busy={busy}
            />
          ) : (
            <p className="phase-detail">Hra běží.</p>
          )}
          <div className="minigame-actions">{skip}</div>
        </>
      );
    }

    case 'RESULT': {
      const r = mg.result!;
      return (
        <>
          <h1>Výsledek: {mg.name}</h1>
          <p className="phase-detail">{r.summary}</p>
          <p className="phase-detail">
            Štít: <b>{r.shieldWinnerId ? name(r.shieldWinnerId) : 'nikdo'}</b> · Poklad: {r.potDelta > 0 ? '+' : ''}
            {r.potDelta.toLocaleString('cs')}
            {r.ghostWinnerIds.length > 0 && <> · Mezi duchy: {r.ghostWinnerIds.map((id) => name(id)).join(', ')}</>}
          </p>
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run({ type: 'showClue' })}>
            Ukázat stopu
          </button>
        </>
      );
    }

    case 'CLUE': {
      const winner = mg.result?.shieldWinnerId;
      return (
        <>
          <h1>Stopa</h1>
          {mg.clues && <ClueView clues={mg.clues} nameOf={(id) => name(id)} />}
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run({ type: 'afterClue' })}>
            {winner ? 'Předat štít' : 'Dokončit minihru'}
          </button>
          <p className="muted">
            {winner
              ? `Po stisknutí má ${name(winner)} 20 s, aby štít tajně ponechal, nebo daroval.`
              : 'Štít dnes nikdo nezískal.'}
          </p>
        </>
      );
    }

    case 'HANDOFF': {
      const h = mg.handoff!;
      const pick = h.picks[h.winnerId];
      return (
        <>
          <h1>
            Předání štítu <Countdown endsAt={h.endsAt} />
          </h1>
          <p className="phase-detail">
            {name(h.winnerId)}: {pick ? <>daruje štít hráči <b>{name(pick)}</b></> : <b>ponechá si štít</b>}
          </p>
          <p className="muted">Po uplynutí času se štít přiřadí sám. Volby ostatních se nepočítají.</p>
        </>
      );
    }

    case 'DONE':
    default:
      return (
        <>
          <h1>{mg.result ? 'Minihra skončila' : 'Minihra přeskočena'}</h1>
          <p className="phase-detail">
            Štít na dnešní noc: <b>{view.shieldHolderId ? name(view.shieldHolderId) : 'nikdo'}</b>
          </p>
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run({ type: 'startVote' })}>
            Začít kulatý stůl
          </button>
        </>
      );
  }
}
