import type {
  Bet,
  Choice,
  SplitStealModeratorView,
  SplitStealPlayerView,
} from '../../../server/minigames/splitSteal/index';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

const CHOICE_LABEL: Record<Choice, string> = { SPLIT: 'Rozdělit', STEAL: 'Ukrást' };
const BET_LABEL: Record<Bet, string> = {
  BOTH_SPLIT: 'Oba rozdělí',
  ONE_STEALS: 'Jeden ukradne',
  BOTH_STEAL: 'Oba ukradnou',
};

function DuelHeader({ game, nameOf }: { game: SplitStealPlayerView | SplitStealModeratorView; nameOf: (id: string) => string }) {
  return (
    <p className="duel-names">
      <b>{nameOf(game.duelists[0])}</b>
      <span className="muted"> proti </span>
      <b>{nameOf(game.duelists[1])}</b>
    </p>
  );
}

/**
 * Telefon. Duelisté mají dvě karty (Rozdělit / Ukrást), diváci tři sázky. Role duelisty je
 * veřejná, takže rozdílné rozložení nic neprozradí; Věrný a Zrádce vypadají stejně.
 */
export function SplitStealPlayer({ game, nameOf, send }: MinigamePlayerProps<SplitStealPlayerView>) {
  if (game.stage === 'READY' || game.stage === 'TALK') {
    return (
      <>
        <DuelHeader game={game} nameOf={nameOf} />
        <p className="lead center">
          {game.amDuelist ? 'Postav se naproti soupeři a přesvědč ho, ať rozdělí.' : 'Duelisté se domlouvají. Poslouchej a připrav si sázku.'}
        </p>
      </>
    );
  }

  if (game.stage === 'CHOOSE') {
    return (
      <>
        <DuelHeader game={game} nameOf={nameOf} />
        {game.amDuelist ? (
          <>
            <p className="center">Tajně zvol. Kdo nezvolí, rozděluje.</p>
            <div className="choice-cards">
              {(['SPLIT', 'STEAL'] as Choice[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={game.myChoice === c ? 'choice-card selected' : 'choice-card'}
                  onClick={() => send({ choice: c })}
                >
                  {CHOICE_LABEL[c]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="center">Jak to dopadne?</p>
            <div className="choice-cards three">
              {(['BOTH_SPLIT', 'ONE_STEALS', 'BOTH_STEAL'] as Bet[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  className={game.myBet === b ? 'choice-card selected' : 'choice-card'}
                  onClick={() => send({ bet: b })}
                >
                  {BET_LABEL[b]}
                </button>
              ))}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <DuelHeader game={game} nameOf={nameOf} />
      {game.revealed ? (
        <div className="choice-cards">
          {game.duelists.map((d) => (
            <div key={d} className={`choice-card revealed ${game.revealed![d] === 'STEAL' ? 'steal' : 'split'}`}>
              <small>{nameOf(d)}</small>
              {CHOICE_LABEL[game.revealed![d]]}
            </div>
          ))}
        </div>
      ) : (
        <p className="lead center">Volby jsou zamčené. Čeká se na odhalení.</p>
      )}
      <p className="center muted">
        {game.amDuelist
          ? `Tvoje volba: ${game.myChoice ? CHOICE_LABEL[game.myChoice] : 'Rozdělit (nezvoleno)'}`
          : `Tvoje sázka: ${game.myBet ? BET_LABEL[game.myBet] : 'žádná'}`}
      </p>
    </>
  );
}

/** Konzole: volby a sázky průběžně, ukončení domluvy/volby a současné odhalení. */
export function SplitStealModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<SplitStealModeratorView>) {
  const stageLabel = {
    READY: 'Připraveno',
    TALK: 'Domluva duelistů',
    CHOOSE: 'Volba a sázky',
    REVEAL: 'Volby zamčené',
    DONE: 'Odhaleno',
  }[game.stage];
  const spectators = players.filter((id) => !game.duelists.includes(id));

  return (
    <>
      <p className="phase-detail">{stageLabel}</p>
      <DuelHeader game={game} nameOf={nameOf} />
      <ul className="console-players compact">
        {game.duelists.map((d) => (
          <li key={d}>
            <span className="grow name">{nameOf(d)} (duelista)</span>
            <span className="state">{game.choices[d] ? CHOICE_LABEL[game.choices[d]] : 'Rozdělit (nezvoleno)'}</span>
          </li>
        ))}
        {spectators.map((id) => (
          <li key={id}>
            <span className="grow name">{nameOf(id)}</span>
            <span className="state">{game.bets[id] ? BET_LABEL[game.bets[id]] : '—'}</span>
          </li>
        ))}
      </ul>
      {game.stage === 'TALK' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endStage' })}>
          Ukončit domluvu
        </button>
      )}
      {game.stage === 'CHOOSE' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endStage' })}>
          Ukončit volbu
        </button>
      )}
      {game.stage === 'REVEAL' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'reveal' })}>
          Odhalit volby
        </button>
      )}
    </>
  );
}
