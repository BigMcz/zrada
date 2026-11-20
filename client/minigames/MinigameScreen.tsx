import { useState, type ReactNode } from 'react';
import type { PlayerMinigameView, PlayerView, PublicPlayer } from '../../shared/types';
import { ClueView } from '../components/ClueView';
import { Countdown } from '../components/Countdown';
import { PlayerGrid } from '../components/PlayerGrid';
import { SealedCard } from '../components/SealedCard';
import { PrimaryButton, Screen } from '../components/Screen';
import { nameOf } from '../labels';
import { send } from '../socket';
import { MINIGAME_UI } from './registry';

interface Props {
  view: PlayerView;
  tag: string;
  corner?: ReactNode;
  status?: ReactNode;
}

/** Pseudo-hráč „Nikomu“ v mřížce předání štítu. */
const NOBODY: PublicPlayer = { id: '__nobody', name: 'Nikomu', status: 'ALIVE' };

/** Společná kostra minihry na telefonu: los, pravidla, hra, výsledek, stopa, předání štítu. */
export function MinigameScreen({ view, tag, corner, status }: Props) {
  const mg = view.minigame!;
  const name = (id: string | null | undefined) => nameOf(view.players, id);
  const alive = view.me.status === 'ALIVE';
  const [error, setError] = useState<string | null>(null);
  const run = async (intent: Parameters<typeof send>[0]) => {
    const res = await send(intent);
    setError(res.ok ? null : res.error);
  };
  const common = { tag: `${tag} · ${mg.name || 'Minihra'}`, corner, status };
  const errorLine = error && <p className="error">{error}</p>;

  switch (mg.step) {
    case 'DRAW':
      return (
        <Screen {...common}>
          <p className="center muted">Osud vybírá dnešní minihru…</p>
          <p className="headline center">{mg.name}</p>
          <p className="muted center">Moderátor ji za chvíli potvrdí.</p>
        </Screen>
      );

    case 'INTRO':
      return (
        <Screen
          {...common}
          action={
            mg.secretCard && (
              <PrimaryButton disabled={mg.cardSeen} onClick={() => run({ type: 'ackSecretCard' })}>
                {mg.cardSeen ? 'Čekáme na start' : 'Viděl/a jsem tajnou kartu'}
              </PrimaryButton>
            )
          }
        >
          <Rules mg={mg} />
          {mg.secretCard ? (
            <SealedCard lines={mg.secretCard} />
          ) : (
            <p className="center ghost-winner">
              {mg.ghostRule ? 'Úloha duchů: ' + mg.ghostRule : 'Jako duch tuhle minihru jen sleduješ.'}
            </p>
          )}
          {errorLine}
        </Screen>
      );

    case 'PLAY': {
      const ui = mg.id ? MINIGAME_UI[mg.id] : undefined;
      const Comp = alive ? ui?.Player : ui?.Ghost;
      return (
        <Screen {...common} corner={<>{<Countdown endsAt={mg.endsAt} />}{corner}</>}>
          {Comp && mg.game !== null ? (
            <Comp game={mg.game} nameOf={(id: string) => name(id)} send={(payload: unknown) => run({ type: 'minigameInput', payload })} />
          ) : (
            <p className="muted center">Hráči hrají minihru. Sleduj, co se děje.</p>
          )}
          {errorLine}
        </Screen>
      );
    }

    case 'RESULT': {
      // Nad výsledkem i konečný stav hry (otočené karty duelu, odhalené nabídky aukce).
      const ui = mg.id ? MINIGAME_UI[mg.id] : undefined;
      const Comp = alive ? ui?.Player : ui?.Ghost;
      return (
        <Screen {...common}>
          {Comp && mg.game !== null && (
            <Comp game={mg.game} nameOf={(id: string) => name(id)} send={() => undefined} />
          )}
          <Result mg={mg} name={name} />
        </Screen>
      );
    }

    case 'CLUE':
      return (
        <Screen {...common}>
          <p className="center muted">Stopa z minihry</p>
          {mg.clues && <ClueView clues={mg.clues} nameOf={(id) => name(id)} />}
        </Screen>
      );

    case 'HANDOFF':
      return alive && mg.handoff ? (
        <Handoff key="handoff" view={view} mg={mg} common={common} run={run} error={errorLine} />
      ) : (
        <Screen {...common}>
          <p className="lead center">Probíhá tajné předání štítu.</p>
          <Countdown endsAt={mg.endsAt} />
        </Screen>
      );

    case 'DONE':
    default:
      return (
        <Screen {...common}>
          <p className="lead center">{mg.result ? 'Minihra skončila.' : 'Minihra se dnes nehraje.'}</p>
          <p className="muted center">Za chvíli začne kulatý stůl.</p>
          <div className="candle" aria-hidden />
        </Screen>
      );
  }
}

function Rules({ mg }: { mg: PlayerMinigameView }) {
  return (
    <div className="rules">
      <p className="headline center">{mg.name}</p>
      <ul>
        {mg.rules.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <p className="traitor-rule">{mg.traitorRule}</p>
    </div>
  );
}

function Result({ mg, name }: { mg: PlayerMinigameView; name: (id: string | null) => string }) {
  const r = mg.result!;
  return (
    <>
      <p className="center">{r.summary}</p>
      <p className="headline center">{r.shieldWinnerId ? `Štít: ${name(r.shieldWinnerId)}` : 'Štít nikdo'}</p>
      {r.shieldWinnerId && <p className="muted center">Vítěz minihry získává +2 body.</p>}
      <p className="center">
        Poklad: {r.potDelta > 0 ? '+' : ''}
        {r.potDelta.toLocaleString('cs')} bodů
      </p>
      {r.ghostWinnerIds.length > 0 && (
        <p className="center ghost-winner">Mezi duchy vyhrál/a: {r.ghostWinnerIds.map((id) => name(id)).join(', ')}</p>
      )}
    </>
  );
}

/**
 * Předání štítu: všichni živí vidí stejnou obrazovku (karta s pečetí, mřížka, tlačítko).
 * Pod pečetí vítěz najde „daruj, nebo si nech“, ostatní „komu bys ho svěřil“.
 */
function Handoff({
  view,
  mg,
  common,
  run,
  error,
}: {
  view: PlayerView;
  mg: PlayerMinigameView;
  common: { tag: string; corner?: ReactNode; status?: ReactNode };
  run: (intent: Parameters<typeof send>[0]) => Promise<void>;
  error: ReactNode;
}) {
  const h = mg.handoff!;
  const current = h.myPick ?? NOBODY.id;
  const [selected, setSelected] = useState<string | null>(null);
  const choice = selected ?? current;
  const others = [...view.players.filter((p) => p.status === 'ALIVE' && p.id !== view.me.id), NOBODY];
  const lines = h.isWinner
    ? ['Získal/a jsi štít. Vyber, komu ho tajně daruješ.', '„Nikomu“ znamená, že si ho necháš.']
    : ['Štít získal někdo jiný. Komu bys ho svěřil/a ty?', 'Tvoje volba se nikam nepočítá.'];

  return (
    <Screen
      {...common}
      corner={<>{<Countdown endsAt={h.endsAt} />}{common.corner}</>}
      action={
        <PrimaryButton
          disabled={selected === null || selected === current}
          onClick={() => run({ type: 'handoffPick', targetId: choice === NOBODY.id ? null : choice })}
        >
          {selected === null || selected === current ? 'Potvrzeno' : `Potvrdit: ${others.find((p) => p.id === choice)?.name}`}
        </PrimaryButton>
      }
    >
      <SealedCard lines={lines} label="Štít – podrž prst" />
      <PlayerGrid players={others} selectedId={choice} onSelect={setSelected} />
      {error}
    </Screen>
  );
}
