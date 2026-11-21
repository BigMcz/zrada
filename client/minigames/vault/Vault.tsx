import { useEffect, useState } from 'react';
import type {
  VaultAttempt,
  VaultGhostView,
  VaultModeratorView,
  VaultPlayerView,
  VaultTip,
} from '../../../server/minigames/vault/index';
import { NameGrid } from '../NameGrid';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

const TIP_LABELS: Record<VaultTip, string> = { 1: '1. pokus', 2: '2. pokus', 3: '3. pokus', 4: 'Neotevře se' };

function Hints({ hints }: { hints: string[] }) {
  return (
    <section className="clue vault-hints">
      <h3>{hints.length > 1 ? 'Tvoje nápovědy' : 'Tvoje nápověda'}</h3>
      <ul>
        {hints.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </section>
  );
}

/** Okénka kódu; prázdné okénko je „·“. */
function Windows({ digits, value, hits }: { digits: number; value: (number | null)[]; hits?: number }) {
  return (
    <div className="vault-windows" aria-label="Kód">
      {Array.from({ length: digits }, (_, i) => (
        <span key={i} className="vault-window">
          {value[i] ?? '·'}
        </span>
      ))}
      {hits !== undefined && (
        <span className="vault-hits">
          {hits} z {digits}
        </span>
      )}
    </div>
  );
}

function Attempts({ attempts, digits }: { attempts: VaultAttempt[]; digits: number }) {
  if (attempts.length === 0) return null;
  return (
    <div className="vault-attempts">
      {attempts.map((a, i) => (
        <Windows key={i} digits={digits} value={a.guess} hits={a.hits} />
      ))}
    </div>
  );
}

/** Číselník zámečníka. Rozepsaný kód drží telefon, na server jde až po „Otevřít trezor“. */
function Keypad({ digits, attemptsUsed, send }: { digits: number; attemptsUsed: number; send: (p: unknown) => void }) {
  const [entry, setEntry] = useState<number[]>([]);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    setEntry([]);
    setSent(false);
  }, [attemptsUsed]);
  const full = entry.length === digits;
  return (
    <div className="vault-lock">
      <Windows digits={digits} value={entry} />
      <div className="vault-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d} type="button" disabled={full || sent} onClick={() => setEntry((e) => (e.length < digits ? [...e, d] : e))}>
            {d}
          </button>
        ))}
        <span />
        <button type="button" disabled={full || sent} onClick={() => setEntry((e) => (e.length < digits ? [...e, 0] : e))}>
          0
        </button>
        <button type="button" aria-label="Smazat" disabled={entry.length === 0 || sent} onClick={() => setEntry((e) => e.slice(0, -1))}>
          ⌫
        </button>
      </div>
      <button
        type="button"
        className="primary big"
        disabled={!full || sent}
        onClick={() => {
          setSent(true);
          send({ guess: entry });
        }}
      >
        Otevřít trezor
      </button>
    </div>
  );
}

function Outcome({ game }: { game: { attempts: VaultAttempt[]; digits: number; revealedCode: number[] | null } }) {
  const last = game.attempts[game.attempts.length - 1];
  const opened = last !== undefined && last.hits === game.digits;
  return (
    <>
      <p className="headline center">{opened ? `Trezor otevřen na ${game.attempts.length}. pokus!` : 'Trezor zůstal zavřený.'}</p>
      {game.revealedCode && (
        <>
          <p className="center muted">Kód trezoru</p>
          <Windows digits={game.digits} value={game.revealedCode} />
        </>
      )}
    </>
  );
}

function LocksmithLine({ game, nameOf }: { game: { locksmithId: string | null; attemptsLeft: number }; nameOf: (id: string) => string }) {
  return (
    <p className="lead center">
      Zámečník: <b>{game.locksmithId ? nameOf(game.locksmithId) : '—'}</b> · zbývá pokusů {game.attemptsLeft}
    </p>
  );
}

/** Telefon. Věrný i Zrádce vypadají stejně; falešná nápověda je jen jiný text ze serveru. */
export function VaultPlayer({ game, nameOf, send }: MinigamePlayerProps<VaultPlayerView>) {
  if (game.stage === 'VOTE') {
    return (
      <>
        <p className="lead center">Kdo bude zámečník?</p>
        <NameGrid
          ids={game.voteTargets}
          nameOf={nameOf}
          enabled={game.voteTargets}
          marked={game.myVote ? [game.myVote] : []}
          onPick={(id) => send({ vote: id })}
        />
        <p className="center muted">
          Hlasovalo {game.votedCount} z {game.voteTargets.length + 1}
        </p>
        <Hints hints={game.myHints} />
      </>
    );
  }
  if (game.stage === 'DONE') {
    return (
      <>
        <Outcome game={game} />
        <Attempts attempts={game.attempts} digits={game.digits} />
      </>
    );
  }
  return (
    <>
      {game.isLocksmith ? (
        <>
          <p className="headline center">Jsi zámečník</p>
          <p className="center muted">Zbývá pokusů {game.attemptsLeft}</p>
        </>
      ) : (
        <LocksmithLine game={game} nameOf={nameOf} />
      )}
      {game.isLocksmith && <Keypad digits={game.digits} attemptsUsed={game.attempts.length} send={send} />}
      <Attempts attempts={game.attempts} digits={game.digits} />
      <Hints hints={game.myHints} />
    </>
  );
}

/** Duch: do prvního pokusu tipuje, pak sleduje pokusy. Nápovědy nevidí. */
export function VaultGhost({ game, nameOf, send }: MinigamePlayerProps<VaultGhostView>) {
  return (
    <>
      {game.stage === 'DONE' ? (
        <Outcome game={game} />
      ) : game.stage === 'VOTE' ? (
        <p className="lead center">Hráči volí zámečníka.</p>
      ) : (
        <LocksmithLine game={game} nameOf={nameOf} />
      )}
      {game.canTip ? (
        <>
          <p className="center">
            Kolikátým pokusem se trezor otevře? <span className="muted">(přesně 3 body, o jeden vedle 1 bod)</span>
          </p>
          <div className="vault-tips">
            {([1, 2, 3, 4] as VaultTip[]).map((t) => (
              <button key={t} type="button" className={game.myTip === t ? 'selected' : ''} onClick={() => send({ tip: t })}>
                {TIP_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="center muted">Tvůj tip: {game.myTip ? TIP_LABELS[game.myTip] : '—'}</p>
      )}
      <Attempts attempts={game.attempts} digits={game.digits} />
    </>
  );
}

/** Konzole: kód, nápovědy všech s označením falešných, hlasy, pokusy a zásahy. */
export function VaultModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<VaultModeratorView>) {
  const stageLabel = { VOTE: 'Volba zámečníka', CRACK: 'Luštění', DONE: 'Konec' }[game.stage];
  const votesFor = (id: string) => Object.values(game.votes).filter((t) => t === id).length;
  const tips = Object.entries(game.ghostTips);
  return (
    <>
      <p className="phase-detail">
        {stageLabel}
        {game.locksmithId && ` · zámečník ${nameOf(game.locksmithId)}`}
        {game.stage !== 'VOTE' && ` · zbývá pokusů ${game.attemptsLeft}`}
      </p>
      <p className="vault-console-code">
        Kód: <b>{game.code.join(' ')}</b>
      </p>
      {game.stage === 'CRACK' && !game.locksmithConnected && (
        <p className="vault-warning">Zámečník je odpojený.{game.reassignable ? '' : ' Za chvíli půjde přidělit znovu.'}</p>
      )}
      <ul className="console-players compact">
        {players.map((id) => (
          <li key={id} className="vault-console-player">
            <span className="grow name">
              {nameOf(id)}
              {game.traitors.includes(id) ? ' 🗡️' : ''}
              {game.stage === 'VOTE'
                ? ` · hlas: ${game.votes[id] ? nameOf(game.votes[id]) : '—'} · má ${votesFor(id)}`
                : id === game.locksmithId
                  ? ' · 🔑 zámečník'
                  : ''}
            </span>
            <ul className="vault-console-hints">
              {(game.hints[id] ?? []).map((h, i) => (
                <li key={i} className={h.fake ? 'fake' : ''}>
                  {h.text}
                  {h.fake && <span className="muted"> · falešná, pravá: {h.trueText}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <Attempts attempts={game.attempts} digits={game.digits} />
      {tips.length > 0 && (
        <ul className="console-players compact">
          {tips.map(([id, t]) => (
            <li key={id}>
              <span className="grow name">👻 {nameOf(id)}</span>
              <span className="state">{TIP_LABELS[t]}</span>
            </li>
          ))}
        </ul>
      )}
      {game.stage === 'VOTE' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endVote' })}>
          Ukončit volbu
        </button>
      )}
      {game.stage === 'CRACK' && game.reassignable && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'reassign' })}>
          Přidělit zámečníka znovu
        </button>
      )}
      {game.stage === 'CRACK' && (
        <button type="button" className="console-primary big secondary-look" disabled={busy} onClick={() => send({ action: 'end' })}>
          Ukončit trezor
        </button>
      )}
    </>
  );
}
