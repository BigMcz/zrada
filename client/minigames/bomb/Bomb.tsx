import { useEffect, useState } from 'react';
import type {
  BombGhostView,
  BombModeratorView,
  BombPlayerView,
  BombPublicDevice,
  BombTip,
} from '../../../server/minigames/bomb/index';
import type { PageView, WireColor } from '../../../server/minigames/bomb/manual';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

const COLOR_NAME: Record<WireColor, string> = {
  red: 'červený',
  blue: 'modrý',
  yellow: 'žlutý',
  white: 'bílý',
  black: 'černý',
  green: 'zelený',
};
const TIP_LABELS: Record<BombTip, string> = { 0: 'Bez chyby', 1: 'S 1 chybou', 2: 'Se 2 chybami', 3: 'Vybuchne' };

type Status = { pyroId: string; errors: number; maxErrors: number; wiresSolved: boolean; symbolsSolved: boolean; paused: boolean; stage: string };

/** Kontrolky chyb a stav modulů – stejné pro všechny. */
function StatusBar({ game, nameOf }: { game: Status; nameOf: (id: string) => string }) {
  return (
    <div className="bomb-status">
      <p className="center">
        Pyrotechnik: <b>{nameOf(game.pyroId)}</b>
      </p>
      <p className="center bomb-lights" aria-label={`Chyby ${game.errors} z ${game.maxErrors}`}>
        {Array.from({ length: game.maxErrors }, (_, i) => (
          <span key={i} className={i < game.errors ? 'bomb-light on' : 'bomb-light'} />
        ))}
      </p>
      <p className="center muted">
        Dráty {game.wiresSolved ? '✓' : '…'} · Symboly {game.symbolsSolved ? '✓' : '…'}
      </p>
      {game.paused && <p className="center bomb-paused">Pyrotechnik se odpojil, odpočet stojí.</p>}
    </div>
  );
}

function Outcome({ game }: { game: Status }) {
  if (game.stage !== 'DONE') return null;
  const defused = game.wiresSolved && game.symbolsSolved;
  return <p className="headline center">{defused ? 'Bomba zneškodněna!' : 'Bum! Bomba vybuchla.'}</p>;
}

/** Stránky manuálu: u drátů číslovaná pravidla, u symbolů sloupce vedle sebe. */
function Pages({ pages }: { pages: PageView[] }) {
  return (
    <>
      {pages.map((p) => (
        <section key={p.id} className="clue bomb-page">
          <h3>{p.title}</h3>
          {p.kind === 'wires' ? (
            p.sections.map((s) => (
              <div key={s.heading}>
                <h4>{s.heading}</h4>
                <ol>
                  {s.items.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ol>
              </div>
            ))
          ) : (
            <div className="bomb-columns">
              {p.sections.map((s) => (
                <div key={s.heading} className="bomb-column">
                  <h4>{s.heading}</h4>
                  {s.items.map((sym, i) => (
                    <span key={i} className="bomb-symbol-cell">
                      {sym}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}

type Pick = { kind: 'wire'; index: number } | { kind: 'symbol'; symbol: string } | null;

/** Bomba na telefonu pyrotechnika: ťuk označí, akce až potvrzovacím tlačítkem. */
function Device({ device, solved, send }: { device: BombPublicDevice; solved: { wires: boolean; symbols: boolean }; send: (p: unknown) => void }) {
  const [pick, setPick] = useState<Pick>(null);
  const done = device.cut.length + device.pressed.length;
  useEffect(() => setPick(null), [done]);
  return (
    <div className="bomb-device">
      <section className="bomb-module">
        <h3>Dráty {solved.wires && '✓'}</h3>
        {device.wires.map((color, i) => {
          const cut = device.cut.includes(i);
          const selected = pick?.kind === 'wire' && pick.index === i;
          return (
            <button
              key={i}
              type="button"
              className={['bomb-wire', `wire-${color}`, cut ? 'cut' : '', selected ? 'selected' : ''].join(' ')}
              disabled={cut || solved.wires}
              aria-label={`${i + 1}. drát, ${COLOR_NAME[color]}${cut ? ', přestřižený' : ''}`}
              onClick={() => setPick({ kind: 'wire', index: i })}
            >
              <span className="bomb-wire-no">{i + 1}</span>
              <span className="bomb-wire-line" />
            </button>
          );
        })}
        {pick?.kind === 'wire' && (
          <button type="button" className="primary big" onClick={() => send({ cut: pick.index })}>
            Přestřihnout {pick.index + 1}. drát
          </button>
        )}
      </section>
      <section className="bomb-module">
        <h3>Symboly {solved.symbols && '✓'}</h3>
        <div className="bomb-symbols">
          {device.symbols.map((sym) => {
            const pressed = device.pressed.includes(sym);
            const selected = pick?.kind === 'symbol' && pick.symbol === sym;
            return (
              <button
                key={sym}
                type="button"
                className={['bomb-symbol', pressed ? 'pressed' : '', selected ? 'selected' : ''].join(' ')}
                disabled={pressed || solved.symbols}
                onClick={() => setPick({ kind: 'symbol', symbol: sym })}
              >
                {sym}
              </button>
            );
          })}
        </div>
        {pick?.kind === 'symbol' && (
          <button type="button" className="primary big" onClick={() => send({ press: pick.symbol })}>
            Zmáčknout {pick.symbol}
          </button>
        )}
      </section>
    </div>
  );
}

/** Telefon. Pyrotechnik vidí bombu, navigátor stránky; Věrný i Zrádce mají stejná pole. */
export function BombPlayer({ game, nameOf, send }: MinigamePlayerProps<BombPlayerView>) {
  return (
    <>
      <Outcome game={game} />
      <StatusBar game={game} nameOf={nameOf} />
      {game.isPyro && game.stage === 'READY' && <p className="lead center">Bomba se odkryje po spuštění odpočtu. Připrav se popisovat.</p>}
      {game.device && game.stage === 'ARMED' && !game.paused && (
        <Device device={game.device} solved={{ wires: game.wiresSolved, symbols: game.symbolsSolved }} send={send} />
      )}
      {!game.isPyro && game.stage !== 'DONE' && <p className="center muted">Pyrotechnik ti popíše bombu. Najdi pravidlo ve své stránce.</p>}
      <Pages pages={game.pages} />
    </>
  );
}

/** Duch: do spuštění odpočtu tipuje, pak sleduje kontrolky. Bombu ani stránky nevidí. */
export function BombGhost({ game, nameOf, send }: MinigamePlayerProps<BombGhostView>) {
  return (
    <>
      <Outcome game={game} />
      <StatusBar game={game} nameOf={nameOf} />
      {game.canTip ? (
        <>
          <p className="center">
            Jak to dopadne? <span className="muted">(přesně 3 body, o jedno vedle 1 bod)</span>
          </p>
          <div className="vault-tips">
            {([0, 1, 2, 3] as BombTip[]).map((t) => (
              <button key={t} type="button" className={game.myTip === t ? 'selected' : ''} onClick={() => send({ tip: t })}>
                {TIP_LABELS[t]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="center muted">Tvůj tip: {game.myTip === null ? '—' : TIP_LABELS[game.myTip]}</p>
      )}
    </>
  );
}

/** Konzole: bomba se správným řešením, stránky s vyznačeným falešným pravidlem, chyby, zásahy. */
export function BombModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<BombModeratorView>) {
  const stageLabel = { READY: 'Příprava (duchové tipují)', ARMED: game.paused ? 'Odpočet stojí' : 'Odpočet běží', DONE: 'Konec' }[game.stage];
  const tips = Object.entries(game.ghostTips);
  return (
    <>
      <p className="phase-detail">
        {stageLabel} · pyrotechnik {nameOf(game.pyroId)} · chyby {game.errors.length} z 3
      </p>
      <p className="bomb-console-line">
        Dráty:{' '}
        {game.device.wires.map((c, i) => (
          <span key={i} className={i === game.solution.wire ? 'bomb-console-wire right' : 'bomb-console-wire'}>
            {i + 1}. {COLOR_NAME[c]}
            {game.device.cut.includes(i) ? ' ✂' : ''}
            {i === game.solution.wire ? ' ✓' : ''}
          </span>
        ))}
      </p>
      <p className="bomb-console-line">
        Symboly v pořadí: <b>{game.solution.order.join(' ')}</b>
        {game.device.pressed.length > 0 && <span className="muted"> · zmáčknuto {game.device.pressed.join(' ')}</span>}
      </p>
      {game.paused && <p className="vault-warning">Pyrotechnik je odpojený.{game.reassignable ? '' : ' Za chvíli půjde přidělit znovu.'}</p>}
      <ul className="console-players compact">
        {players.map((id) => (
          <li key={id} className="vault-console-player">
            <span className="grow name">
              {nameOf(id)}
              {game.traitors.includes(id) ? ' 🗡️' : ''}
              {id === game.pyroId ? ' · 💣 pyrotechnik' : ''}
            </span>
            <ul className="vault-console-hints">
              {(game.pages[id] ?? []).map((p) => (
                <li key={p.id} className={p.fake ? 'fake' : ''}>
                  {p.title}
                  {p.fake && <span className="muted"> · {p.fake}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {game.errors.length > 0 && (
        <ul className="console-players compact">
          {game.errors.map((e, i) => (
            <li key={i}>
              <span className="grow name">Chyba {i + 1}</span>
              <span className="state">
                {e.module === 'WIRES'
                  ? `drát ${(e.did as number) + 1} (správně ${(e.expected as number) + 1})`
                  : `symbol ${e.did} (správně ${e.expected})`}
              </span>
            </li>
          ))}
        </ul>
      )}
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
      {game.stage === 'READY' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'start' })}>
          Spustit odpočet
        </button>
      )}
      {game.stage === 'ARMED' && game.reassignable && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'reassign' })}>
          Přidělit pyrotechnika znovu
        </button>
      )}
      {game.stage === 'ARMED' && (
        <button type="button" className="console-primary big secondary-look" disabled={busy} onClick={() => send({ action: 'end' })}>
          Ukončit bombu (výbuch)
        </button>
      )}
    </>
  );
}
