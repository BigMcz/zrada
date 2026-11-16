// Dočasná testovací stránka pro krok 4: ukazuje surový pohled ze serveru a tlačítka pro všechny akce.
// V krocích 5 a 6 ji nahradí skutečné obrazovky hráče a moderátora.
import { useState } from 'react';
import type { Intent, ModeratorView, PlayerView, PublicPlayer } from '../shared/types';
import { isModeratorPage, join, send, useConnection } from './socket';

const PHASES: Record<string, string> = {
  LOBBY: 'Lobby',
  ROLES: 'Rozdání rolí',
  VOTE: 'Kulatý stůl',
  VOTE_RESULT: 'Výsledek hlasování',
  NIGHT: 'Noc',
  MORNING: 'Ráno',
  ENDED: 'Konec hry',
};
const ROLE = { LOYAL: 'Věrný', TRAITOR: 'Zrádce' } as const;
const STATUS = { ALIVE: 'živý', BANISHED: 'vyhnán', MURDERED: 'zemřel' } as const;

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const run = async (intent: Intent) => {
    const res = await send(intent);
    setError(res.ok ? null : res.error);
  };
  return { error, run };
}

export function DebugPage() {
  const { connected, view, helloError } = useConnection();

  return (
    <main className="debug">
      <header>
        <strong>Zrada · testovací stránka</strong>
        <span className={connected ? 'ok' : 'warn'}>{connected ? 'spojeno' : 'připojuji se…'}</span>
      </header>
      {helloError && <p className="error">{helloError}</p>}
      {view?.kind === 'guest' && (isModeratorPage ? <p>Bez platného klíče moderátora tu nic není.</p> : <JoinForm open={view.joinOpen} />)}
      {view?.kind === 'player' && <PlayerDebug view={view} />}
      {view?.kind === 'moderator' && <ModeratorDebug view={view} />}
      {view && (
        <details>
          <summary>Surový pohled ze serveru</summary>
          <pre>{JSON.stringify(view, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}

function JoinForm({ open }: { open: boolean }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!open) return <p>Hra už běží nebo je plná, připojit se teď nejde.</p>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await join(name);
        setError(res.ok ? null : res.error);
      }}
    >
      <label>
        Jméno <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <button type="submit">Vstoupit</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function nameOf(players: PublicPlayer[], id: string | null | undefined) {
  return players.find((p) => p.id === id)?.name ?? '—';
}

function PlayerDebug({ view }: { view: PlayerView }) {
  const { error, run } = useAction();
  const others = view.players.filter((p) => p.status === 'ALIVE' && p.id !== view.me.id);
  const canAct = view.me.status === 'ALIVE';
  const lastRound = view.history.at(-1);

  return (
    <section>
      <p>
        <b>{view.me.name}</b> · {PHASES[view.phase]} · kolo {view.round} · {STATUS[view.me.status]}
      </p>
      <p>
        Role: {view.me.role ? ROLE[view.me.role] : '—'}
        {view.allies.length > 0 && <> · spoluzrádci: {view.allies.map((a) => a.name).join(', ')}</>}
      </p>
      {view.phase === 'ROLES' && !view.me.sawRole && <button onClick={() => run({ type: 'ackRole' })}>Viděl jsem svou roli</button>}

      {view.phase === 'VOTE' && canAct && (
        <>
          <p>Koho vyženeš? Můj hlas: {nameOf(view.players, view.myVote)}</p>
          {others.map((p) => (
            <button key={p.id} onClick={() => run({ type: 'vote', targetId: p.id })}>
              {p.name}
            </button>
          ))}
        </>
      )}

      {view.phase === 'NIGHT' && canAct && view.night && (
        <>
          <p>{view.me.role === 'TRAITOR' ? 'Koho tuto noc umlčíte?' : 'Kdo je podle tebe Zrádce?'}</p>
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => !view.night!.blocked.includes(p.id) && run({ type: 'nightPick', targetId: p.id })}
            >
              {p.name}
            </button>
          ))}
          <p>
            {view.night.hint.kind === 'ALLY'
              ? `Spojenec volí: ${view.night.hint.picks.map((x) => nameOf(view.players, x.targetId)).join(', ')}`
              : `Tvá volba: ${nameOf(view.players, view.night.hint.targetId)}`}
          </p>
        </>
      )}

      {view.phase === 'VOTE_RESULT' && lastRound && (
        <p>
          {lastRound.banishedId
            ? `Vyhnán: ${nameOf(view.players, lastRound.banishedId)} (${ROLE[view.players.find((p) => p.id === lastRound.banishedId)!.revealedRole!]})`
            : 'Nikdo nebyl vyhnán.'}
        </p>
      )}
      {view.phase === 'MORNING' && lastRound && <p>Tuto noc zemřel/a: {nameOf(view.players, lastRound.murderedId)}</p>}
      {view.winner && <p>Vyhráli: {view.winner === 'LOYAL' ? 'Věrní' : 'Zrádci'}</p>}
      <PlayerList players={view.players} />
      {error && <p className="error">{error}</p>}
    </section>
  );
}

function PlayerList({ players }: { players: PublicPlayer[] }) {
  return (
    <ul>
      {players.map((p) => (
        <li key={p.id}>
          {p.name} – {STATUS[p.status]}
          {p.revealedRole && <> ({ROLE[p.revealedRole]})</>}
        </li>
      ))}
    </ul>
  );
}

function ModeratorDebug({ view }: { view: ModeratorView }) {
  const { error, run } = useAction();
  const [traitors, setTraitors] = useState<number | null>(null);
  const traitorCount = traitors ?? view.recommendedTraitors;

  return (
    <section>
      <p>
        Moderátor · {PHASES[view.phase]} · kolo {view.round}
        {view.phase === 'NIGHT' && <> · Zrádci: {view.traitorsDone ? 'hotovo' : 'čeká se'}</>}
        {view.winner && <> · vyhráli {view.winner === 'LOYAL' ? 'Věrní' : 'Zrádci'}</>}
      </p>
      {view.phase === 'LOBBY' && <p>Adresa pro hráče: {view.joinUrl}</p>}

      <table>
        <thead>
          <tr>
            <th>Jméno</th>
            <th>Role</th>
            <th>Stav</th>
            <th>Spojení</th>
            <th>Hotovo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {view.players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.role ? ROLE[p.role] : '—'}</td>
              <td>{STATUS[p.status]}</td>
              <td>{p.connected ? '●' : '○'}</td>
              <td>{p.done === undefined ? '' : p.done ? '✔' : '…'}</td>
              <td>{view.phase === 'LOBBY' && <button onClick={() => run({ type: 'kick', playerId: p.id })}>Odebrat</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="actions">
        {view.phase === 'LOBBY' && (
          <>
            <label>
              Zrádců{' '}
              <input
                type="number"
                min={1}
                value={traitorCount}
                onChange={(e) => setTraitors(Number(e.target.value))}
                style={{ width: 60 }}
              />
            </label>
            <button onClick={() => run({ type: 'startGame', traitorCount })}>Rozdat role</button>
          </>
        )}
        {(view.phase === 'ROLES' || view.phase === 'MORNING') && (
          <button onClick={() => run({ type: 'startVote' })}>
            {view.phase === 'ROLES' ? 'Začít kulatý stůl' : 'Další kolo'}
          </button>
        )}
        {view.phase === 'VOTE' && <button onClick={() => run({ type: 'closeVote' })}>Uzavřít hlasování</button>}
        {view.phase === 'VOTE_RESULT' && <button onClick={() => run({ type: 'startNight' })}>Začít noc</button>}
        {view.phase === 'NIGHT' && <button onClick={() => run({ type: 'endNight' })}>Ukončit noc</button>}
        {view.phase === 'ENDED' && <button onClick={() => run({ type: 'newGame' })}>Nová hra</button>}
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
