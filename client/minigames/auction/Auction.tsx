import { useState } from 'react';
import type { AuctionGhostView, AuctionModeratorView, AuctionPlayerView } from '../../../server/minigames/auction/index';
import { tokensWord } from '../../../shared/words';
import type { MinigamePlayerProps, MinigameModeratorProps } from '../registry';

const MAX_BID = 10;

/** Telefon hráče; Věrný i Zrádce vidí totéž. */
export function AuctionPlayer({ game, nameOf, send }: MinigamePlayerProps<AuctionPlayerView>) {
  const [value, setValue] = useState(game.myBid ?? 0);

  if (game.stage === 'TALK' || game.stage === 'READY') {
    return (
      <>
        <p className="lead center">Domluvte se nahlas, kolik kdo přihodí.</p>
        <p className="muted center">Přihazovat se bude tajně, až domluva skončí.</p>
      </>
    );
  }

  if (game.stage === 'BID') {
    const changed = value !== game.myBid;
    return (
      <>
        <p className="bid-number">{value}</p>
        <p className="center muted">{tokensWord(value)} · {value * 50} bodů z pokladu</p>
        <input
          className="bid-slider"
          type="range"
          min={0}
          max={MAX_BID}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Počet žetonů"
        />
        <button
          type="button"
          className="primary"
          disabled={!changed}
          onClick={() => send({ bid: value })}
        >
          {changed ? `Přihodit: ${value} ${tokensWord(value)}` : 'Nabídka odevzdána'}
        </button>
        <p className="center muted">
          {game.myBid === null ? 'Kdo nepotvrdí, přihazuje 0.' : `Tvoje nabídka: ${game.myBid}. Do konce ji můžeš změnit.`}
          <br />
          Přihodilo {game.submitted} z {game.total}
        </p>
      </>
    );
  }

  return (
    <>
      <p className="center muted">Odhalování od nejnižší nabídky</p>
      <RevealList game={game} nameOf={nameOf} />
      <p className="center muted">Tvoje nabídka: {game.myBid ?? 0}</p>
    </>
  );
}

/** Duch tipuje součet všech nabídek; vidí jen veřejné údaje. */
export function AuctionGhost({ game, nameOf, send }: MinigamePlayerProps<AuctionGhostView>) {
  const [value, setValue] = useState(game.myGuess ?? Math.round(game.maxSum / 4));
  const open = game.stage === 'TALK' || game.stage === 'BID';

  if (!open) {
    return (
      <>
        <p className="center muted">Odhalování od nejnižší nabídky</p>
        <RevealList game={game} nameOf={nameOf} />
        <p className="center muted">Tvůj tip součtu: {game.myGuess ?? 'žádný'}</p>
      </>
    );
  }

  const changed = value !== game.myGuess;
  return (
    <>
      <p className="center">Kolik žetonů přihodí všichni dohromady?</p>
      <p className="bid-number">{value}</p>
      <input
        className="bid-slider"
        type="range"
        min={0}
        max={game.maxSum}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Tip součtu nabídek"
      />
      <button type="button" className="primary" disabled={!changed} onClick={() => send({ guess: value })}>
        {changed ? 'Tipnout součet: ' + value : 'Tip odevzdán'}
      </button>
      <p className="center muted">
        Přihodilo {game.submitted} z {game.total}
      </p>
    </>
  );
}

function RevealList({
  game,
  nameOf,
}: {
  game: { revealed: { playerId: string; bid: number }[]; total: number };
  nameOf: (id: string) => string;
}) {
  return (
    <ul className="reveal-list">
      {game.revealed.map((r) => (
        <li key={r.playerId}>
          <span>{nameOf(r.playerId)}</span>
          <b>
            {r.bid} {tokensWord(r.bid)}
          </b>
        </li>
      ))}
      {Array.from({ length: game.total - game.revealed.length }, (_, i) => (
        <li key={`hidden-${i}`} className="hidden-bid">
          <span>?</span>
          <b>?</b>
        </li>
      ))}
    </ul>
  );
}

/** Konzole moderátora: všechny nabídky průběžně a řízení odhalování. */
export function AuctionModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<AuctionModeratorView>) {
  const stageLabel = {
    READY: 'Připraveno',
    TALK: 'Domluva nahlas',
    BID: 'Přihazování',
    REVEAL: 'Odhalování nabídek',
    DONE: 'Hotovo',
  }[game.stage];

  return (
    <>
      <p className="phase-detail">
        {stageLabel} · přihodilo <b>{game.submitted}</b> z {game.total}
      </p>
      <ul className="console-players compact">
        {players.map((id) => (
          <li key={id}>
            <span className="grow name">{nameOf(id)}</span>
            <span className="state">{id in game.bids ? `${game.bids[id]} ${tokensWord(game.bids[id])}` : '—'}</span>
          </li>
        ))}
      </ul>
      {game.stage === 'TALK' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endStage' })}>
          Ukončit domluvu
        </button>
      )}
      {game.stage === 'BID' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endStage' })}>
          Ukončit přihazování
        </button>
      )}
      {game.stage === 'REVEAL' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'reveal' })}>
          Odhalit další nabídku ({game.revealed.length + 1}/{game.total})
        </button>
      )}
      {game.revealed.length > 0 && (
        <p className="muted">
          Odhaleno: {game.revealed.map((r) => `${nameOf(r.playerId)} ${r.bid}`).join(', ')}
        </p>
      )}
    </>
  );
}
