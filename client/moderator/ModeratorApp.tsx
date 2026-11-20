import { QRCodeSVG } from 'qrcode.react';
import { useState, type ReactNode } from 'react';
import { MIN_PLAYERS, type Intent, type ModeratorPlayer, type ModeratorView } from '../../shared/types';
import { GhostBoard, pointsWord, rankGhosts } from '../components/GhostBoard';
import { nameOf, phaseTag, ROLE_LABEL, STATUS_LABEL } from '../labels';
import { send, useConnection } from '../socket';

export function ModeratorApp() {
  const { connected, view, helloError } = useConnection();

  return (
    <div className="console">
      {!connected && <div className="connection-bar">Obnovuji spojení se serverem…</div>}
      {view?.kind === 'moderator' ? (
        view.phase === 'LOBBY' ? (
          <Lobby view={view} />
        ) : view.phase === 'ENDED' ? (
          <Ended view={view} />
        ) : (
          <Control view={view} />
        )
      ) : (
        <div className="console-message">
          <h1>Zrada · moderátor</h1>
          {view ? (
            <p>{helloError ?? 'Neplatný klíč moderátora.'} Otevři odkaz pro moderátora, který vypsal server při spuštění.</p>
          ) : (
            <p>Připojuji se…</p>
          )}
        </div>
      )}
    </div>
  );
}

function useSend() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (intent: Intent) => {
    setBusy(true);
    const res = await send(intent);
    setBusy(false);
    setError(res.ok ? null : res.error);
  };
  return { error, busy, run };
}

function TopBar({ view, children }: { view: ModeratorView; children?: ReactNode }) {
  return (
    <header className="console-top">
      <div>
        <span className="console-brand">Zrada</span>
        <span className="console-phase">{phaseTag(view.phase, view.round)}</span>
      </div>
      <div className="console-top-actions">{children}</div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

/** Platné počty Zrádců: aspoň 1 a méně než Věrných. */
function traitorOptions(playerCount: number): number[] {
  const max = Math.floor((playerCount - 1) / 2);
  return Array.from({ length: Math.max(0, max) }, (_, i) => i + 1);
}

function Lobby({ view }: { view: ModeratorView }) {
  const { error, busy, run } = useSend();
  const [chosen, setChosen] = useState<number | null>(null);
  const n = view.players.length;
  const options = traitorOptions(n);
  // Když se změní počet hráčů a volba přestane platit, vrátí se doporučená hodnota.
  const traitors = chosen !== null && options.includes(chosen) ? chosen : view.recommendedTraitors;
  const canStart = n >= MIN_PLAYERS && options.includes(traitors);

  return (
    <>
      <TopBar view={view} />
      <main className="lobby">
        <section className="qr-panel">
          <div className="qr-box">{view.joinUrl && <QRCodeSVG value={view.joinUrl} size={280} marginSize={2} />}</div>
          <p className="qr-caption">Naskenuj a připoj se</p>
          <p className="qr-url">{view.joinUrl}</p>
        </section>

        <section className="lobby-side">
          <h2>Připojení hráči ({n})</h2>
          {n === 0 ? (
            <p className="muted">Zatím nikdo. Hráči se připojí přes QR kód.</p>
          ) : (
            <ul className="lobby-players">
              {view.players.map((p) => (
                <li key={p.id}>
                  <ConnectionDot connected={p.connected} />
                  <span className="grow">{p.name}</span>
                  <button type="button" className="link" onClick={() => run({ type: 'kick', playerId: p.id })}>
                    Odebrat
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2>Počet Zrádců</h2>
          {options.length === 0 ? (
            <p className="muted">Ke hře jsou potřeba aspoň {MIN_PLAYERS} hráči.</p>
          ) : (
            <div className="segmented">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={o === traitors ? 'active' : ''}
                  onClick={() => setChosen(o)}
                >
                  {o}
                  {o === view.recommendedTraitors && <small>doporučeno</small>}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="console-primary"
            disabled={!canStart || busy}
            onClick={() => run({ type: 'startGame', traitorCount: traitors })}
          >
            {n < MIN_PLAYERS ? `Čekáme na aspoň ${MIN_PLAYERS} hráče` : 'Rozdat role'}
          </button>
          {error && <p className="error">{error}</p>}
          <p className="muted small">Po rozdání rolí už tuhle obrazovku nepromítej – budou na ní vidět role.</p>
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Řízení hry
// ---------------------------------------------------------------------------

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className={connected ? 'dot on' : 'dot off'} title={connected ? 'připojen' : 'odpojen'}>
      {connected ? '●' : '○'}
    </span>
  );
}

function PlayersTable({ view, hideRoles }: { view: ModeratorView; hideRoles: boolean }) {
  const alive = view.players.filter((p) => p.status === 'ALIVE');
  const out = view.players.filter((p) => p.status !== 'ALIVE');
  const row = (p: ModeratorPlayer) => (
    <li key={p.id} className={p.status === 'ALIVE' ? '' : 'out'}>
      <ConnectionDot connected={p.connected} />
      <span className="grow name">{p.name}</span>
      {p.role && (
        <span className={hideRoles ? 'role-badge hidden' : `role-badge ${p.role === 'TRAITOR' ? 'traitor' : 'loyal'}`}>
          {hideRoles ? '•' : p.role === 'TRAITOR' ? 'Z' : 'V'}
        </span>
      )}
      <span className="state">
        {p.status !== 'ALIVE' ? STATUS_LABEL[p.status] : p.done === undefined ? '' : p.done ? '✔ hotovo' : '… čeká'}
      </span>
    </li>
  );

  return (
    <section className="players-panel">
      <h2>Hráči ve hře ({alive.length})</h2>
      <ul className="console-players">{alive.map(row)}</ul>
      {out.length > 0 && (
        <>
          <h3>Vyřazení</h3>
          <ul className="console-players">{out.map(row)}</ul>
        </>
      )}
      <GhostsPanel view={view} hideRoles={hideRoles} />
    </section>
  );
}

/**
 * Duchové pro moderátora: průběžné pořadí, body a koho kdo právě tipuje.
 * Správnost tipu a body se při „Skrýt role“ zakryjí – prozrazovaly by Zrádce.
 */
/** Duchové v pořadí připojení hráčů (server je posílá seřazené podle bodů). */
function inPlayerOrder(view: ModeratorView) {
  const order = view.players.map((p) => p.id);
  return [...view.ghosts].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

function GhostsPanel({ view, hideRoles }: { view: ModeratorView; hideRoles: boolean }) {
  if (view.ghosts.length === 0) return null;
  const name = (id: string | null) => nameOf(view.players, id);

  return (
    <>
      <h3>Duchové</h3>
      <ul className="console-players ghosts">
        {/* Při skrytí rolí ani pořadí neprozradí, kdo tipoval správně. */}
        {(hideRoles ? inPlayerOrder(view).map((ghost) => ({ ghost, place: null })) : rankGhosts(view.ghosts)).map(({ ghost: g, place }) => (
          <li key={g.id}>
            <span className="place">{place ?? '–'}</span>
            <span className="grow name">
              {name(g.id)}
              <small>
                {!g.canTip
                  ? 'Zrádce, netipuje'
                  : g.tip
                    ? `tipuje: ${name(g.tip)}`
                    : '… zatím netipoval/a'}
              </small>
            </span>
            {g.canTip && g.tip && (
              <span
                className={
                  hideRoles ? 'role-badge hidden' : `role-badge ${g.tipOnTraitor ? 'traitor' : 'loyal'}`
                }
                title={hideRoles ? '' : g.tipOnTraitor ? 'tip míří na Zrádce' : 'tip míří na Věrného'}
              >
                {hideRoles ? '•' : g.tipOnTraitor ? 'Z' : 'V'}
              </span>
            )}
            <span className="state">{g.canTip ? (hideRoles ? '• bodů' : `${g.points} ${pointsWord(g.points)}`) : ''}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

interface PhaseStep {
  title: string;
  detail: ReactNode;
  button: string;
  intent: Intent;
  next: string;
}

function phaseStep(view: ModeratorView): PhaseStep {
  const alive = view.players.filter((p) => p.status === 'ALIVE');
  const round = view.history.find((h) => h.round === view.round);
  const done = alive.filter((p) => p.done).length;

  switch (view.phase) {
    case 'ROLES': {
      const saw = view.players.filter((p) => p.sawRole).length;
      return {
        title: 'Hráči si prohlížejí role',
        detail: (
          <>
            Roli vidělo <b>{saw}</b> z {view.players.length} hráčů.
            {saw < view.players.length && ' Počkej, až ji uvidí všichni.'}
          </>
        ),
        button: 'Začít kulatý stůl',
        intent: { type: 'startVote' },
        next: 'Hráči začnou hlasovat, koho vyhnat.',
      };
    }
    case 'VOTE':
      return {
        title: 'Kulatý stůl – hlasování',
        detail: (
          <>
            Hlasovalo <b>{done}</b> z {alive.length} hráčů. Kdo nehlasuje, nepočítá se.
          </>
        ),
        button: 'Uzavřít hlasování',
        intent: { type: 'closeVote' },
        next: 'Všem se ukáže, kdo byl vyhnán a jakou měl roli.',
      };
    case 'VOTE_RESULT': {
      const banished = view.players.find((p) => p.id === round?.banishedId);
      return {
        title: 'Výsledek hlasování',
        detail: banished ? (
          <>
            Vyhnán/a: <b>{banished.name}</b> ({banished.role && ROLE_LABEL[banished.role]})
          </>
        ) : (
          'Nikdo nehlasoval, nikdo nebyl vyhnán.'
        ),
        button: 'Začít noc',
        intent: { type: 'startNight' },
        next: 'Zrádci vyberou oběť, Věrní tipují Zrádce.',
      };
    }
    case 'NIGHT':
      return {
        title: 'Noc',
        detail: view.traitorsDone ? (
          <>
            Zrádci: <b>vybráno</b>.
          </>
        ) : (
          <>
            Zrádci: <b>ještě vybírají</b>. Když nevyberou, oběť určí los.
          </>
        ),
        button: 'Ukončit noc',
        intent: { type: 'endNight' },
        next: 'Všem se ukáže, kdo v noci zemřel.',
      };
    case 'MORNING':
      return {
        title: 'Ráno',
        detail: (
          <>
            Tuto noc zemřel/a: <b>{nameOf(view.players, round?.murderedId)}</b>
          </>
        ),
        button: 'Další kolo',
        intent: { type: 'startVote' },
        next: `Začne ${view.round + 1}. kolo kulatého stolu.`,
      };
    default:
      throw new Error(`Fáze ${view.phase} nemá řízení`);
  }
}

function Control({ view }: { view: ModeratorView }) {
  const { error, busy, run } = useSend();
  const [hideRoles, setHideRoles] = useState(false);
  const step = phaseStep(view);

  return (
    <>
      <TopBar view={view}>
        <button type="button" className="toggle" onClick={() => setHideRoles((h) => !h)}>
          {hideRoles ? 'Ukázat role' : 'Skrýt role'}
        </button>
      </TopBar>
      <main className="control">
        <PlayersTable view={view} hideRoles={hideRoles} />
        <section className="phase-panel">
          <h1>{step.title}</h1>
          <p className="phase-detail">{step.detail}</p>
          <button type="button" className="console-primary big" disabled={busy} onClick={() => run(step.intent)}>
            {step.button}
          </button>
          {error && <p className="error">{error}</p>}
          <p className="muted">Po stisknutí: {step.next}</p>
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Konec hry
// ---------------------------------------------------------------------------

function Ended({ view }: { view: ModeratorView }) {
  const { error, busy, run } = useSend();
  return (
    <>
      <TopBar view={view} />
      <main className="ended">
        <p className="muted">Vyhráli</p>
        <h1 className={view.winner === 'TRAITOR' ? 'winner traitor' : 'winner loyal'}>
          {view.winner === 'LOYAL' ? 'Věrní' : 'Zrádci'}
        </h1>
        <ul className="console-players final">
          {view.players.map((p) => (
            <li key={p.id} className={p.status === 'ALIVE' ? '' : 'out'}>
              <span className="grow name">{p.name}</span>
              <span className={`role-badge ${p.role === 'TRAITOR' ? 'traitor' : 'loyal'}`}>
                {p.role === 'TRAITOR' ? 'Z' : 'V'}
              </span>
              <span className="state">
                {p.role && ROLE_LABEL[p.role]} · {STATUS_LABEL[p.status]}
              </span>
            </li>
          ))}
        </ul>
        <GhostBoard ghosts={view.ghosts} nameOf={(id) => nameOf(view.players, id)} />
        <button type="button" className="console-primary" disabled={busy} onClick={() => run({ type: 'newGame' })}>
          Nová hra
        </button>
        <p className="muted small">Hráči zůstanou připojení, role se rozdají znovu.</p>
        {error && <p className="error">{error}</p>}
      </main>
    </>
  );
}
