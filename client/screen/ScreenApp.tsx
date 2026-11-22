import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ScreenMinigameView, ScreenView } from '../../shared/types';
import { ClueView } from '../components/ClueView';
import { Recap } from '../components/Recap';
import { GameScene } from './GameScenes';
import { Countdown } from '../components/Countdown';
import { initials, nameOf, phaseTag, ROLE_LABEL } from '../labels';
import { useConnection } from '../socket';
import { play, setAmbient, setMuted, startAudio } from './sounds';

/** Velká obrazovka pro projektor (Rozšíření 9): jen sleduje stav hry, nic se na ní neovládá. */
export function ScreenApp() {
  const { connected, view } = useConnection();
  const [started, setStarted] = useState(false);
  const screen = view?.kind === 'screen' ? view : null;
  useSounds(screen);
  return (
    <div className="screen-root">
      {!connected && <div className="screen-offline">Obnovuji spojení…</div>}
      {screen ? <ScreenGame view={screen} /> : <p className="screen-center muted">Připojuji velkou obrazovku…</p>}
      {screen?.paused && (
        <div className="screen-pause" role="status">
          <span aria-hidden="true">🕯️</span>
          <h1>Pauza</h1>
        </div>
      )}
      {!started && (
        // Prohlížeč pustí zvuk až po kliknutí, proto jedno tlačítko na začátku.
        <button
          type="button"
          className="screen-start"
          onClick={() => {
            startAudio();
            setStarted(true);
          }}
        >
          Zahájit
          <small>Kliknutím zapneš zvuk velké obrazovky</small>
        </button>
      )}
    </div>
  );
}

/** Zvuky podle změn veřejného stavu hry (sirka, zvon, ambient noci, buben, mince, karty). */
function useSounds(view: ScreenView | null) {
  const prev = useRef<ScreenView | null>(null);
  useEffect(() => {
    if (!view) return;
    setMuted(view.muted);
    const p = prev.current;
    prev.current = view;
    if (!p) return;
    if (view.phase === 'LOBBY' && view.players.length > p.players.length) play('match');
    if (view.phase !== p.phase) {
      setAmbient(view.phase === 'NIGHT');
      if (view.phase === 'MORNING') play(view.murderedId ? 'drum' : 'bell');
      else if (view.phase !== 'NIGHT' && view.phase !== 'VOTE_RESULT' && view.phase !== 'ENDED') play('bell');
    }
    if (view.pot > p.pot) play('coins');
    const g = view.minigame?.game as Record<string, unknown> | null | undefined;
    const pg = p.minigame?.id === view.minigame?.id ? (p.minigame?.game as Record<string, unknown> | null | undefined) : null;
    if (g && pg) {
      const revealed = (x: Record<string, unknown>) => (Array.isArray(x.revealed) ? x.revealed.length : x.revealed ? 1 : 0);
      if (revealed(g) > revealed(pg)) play('flip');
      if (g.stage === 'PAUSE' && pg.stage === 'BOMB') play('drum'); // Horký brambor bouchl
      if (typeof g.errors === 'number' && g.errors > (pg.errors as number)) play('drum'); // chyba u bomby
      if (Array.isArray(g.attempts) && g.attempts.length > (pg.attempts as unknown[]).length) play('flip'); // pokus u trezoru
    }
  }, [view]);
  useEffect(() => () => setAmbient(false), []);
}

/** Uplynulý čas od změny klíče (pro dramatické pauzy, které si obrazovka časuje sama). */
function useElapsed(key: string): number {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setStart(Date.now());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [key]);
  return now - start;
}

function ScreenGame({ view }: { view: ScreenView }) {
  const name = (id: string | null | undefined) => nameOf(view.players, id);
  return (
    <div className={`screen-layout phase-${view.phase.toLowerCase()}${view.minigame?.step === 'CLUE' ? ' step-clue' : ''}`}>
      <header className="screen-top">
        <span className="screen-phase">{view.phase === 'LOBBY' ? 'Zrada' : phaseTag(view.phase, view.round)}</span>
        {view.phase !== 'LOBBY' && (
          <span className="screen-pot">
            <small>Poklad</small> {view.pot.toLocaleString('cs')}
          </span>
        )}
      </header>
      <main className="screen-stage">
        <Scene view={view} name={name} />
      </main>
      {/* Během odhalení hlasování portréty skryté: jinak by vyhnaný zmizel dřív, než ho obrazovka ohlásí. */}
      {view.phase !== 'LOBBY' && view.phase !== 'ENDED' && view.phase !== 'NIGHT' && view.phase !== 'VOTE_RESULT' && (
        <footer className="screen-bottom">
          <div className="screen-portraits">
            {view.players
              .filter((p) => p.status === 'ALIVE')
              .map((p) => (
                <Portrait key={p.id} label={p.name} />
              ))}
          </div>
          {view.ghostBoard.length > 0 && (
            <ol className="screen-ghosts">
              <li className="screen-ghosts-title">Duchové</li>
              {view.ghostBoard.slice(0, 5).map((g) => (
                <li key={g.id}>
                  {name(g.id)} <b>{g.points}</b>
                </li>
              ))}
            </ol>
          )}
        </footer>
      )}
    </div>
  );
}

function Portrait({ label, dim, tone, note }: { label: string; dim?: boolean; tone?: 'loyal' | 'traitor'; note?: string }) {
  return (
    <div className={['screen-portrait', dim ? 'dim' : '', tone ?? ''].join(' ')}>
      <span className="screen-avatar">{initials(label)}</span>
      <span className="screen-name">{label}</span>
      {note && <span className="screen-note">{note}</span>}
    </div>
  );
}

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="screen-title">
      <h1>{children}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Scene({ view, name }: { view: ScreenView; name: (id: string | null | undefined) => string }) {
  switch (view.phase) {
    case 'LOBBY':
      return <Lobby view={view} />;
    case 'ROLES':
      return <Title sub="Podržte prst na telefonu a podívejte se, kdo jste.">Role byly rozdány</Title>;
    case 'VOTE':
      return (
        <Title sub={`${view.inFinale ? 'Hra pokračuje. ' : ''}Hlasovalo ${view.votesCast ?? 0} z ${view.voters ?? 0}`}>
          {view.inFinale ? 'Finále: kulatý stůl' : 'Kulatý stůl'}
          <span className="screen-dots">
            {Array.from({ length: view.voters ?? 0 }, (_, i) => (
              <span key={i} className={i < (view.votesCast ?? 0) ? 'on' : ''} />
            ))}
          </span>
        </Title>
      );
    case 'FINAL_VOTE':
      return (
        <Title sub={`Hlasovalo ${view.finalVotesCast ?? 0} z ${view.finalVoters ?? 0}. Hru ukončí jen jednomyslné rozhodnutí.`}>
          Finále: ukončit hru?
          <span className="screen-dots">
            {Array.from({ length: view.finalVoters ?? 0 }, (_, i) => (
              <span key={i} className={i < (view.finalVotesCast ?? 0) ? 'on' : ''} />
            ))}
          </span>
        </Title>
      );
    case 'VOTE_RESULT':
      return <VoteReveal view={view} name={name} />;
    case 'NIGHT':
      return (
        <div className="screen-night">
          <span className="screen-candle" aria-hidden="true">
            🕯️
          </span>
          <h1>Noc</h1>
        </div>
      );
    case 'MORNING':
      return view.murderedId ? (
        <Title sub="Zrádci si tuto noc vybrali svou oběť.">
          <Portrait label={name(view.murderedId)} dim />
          Tuto noc zemřel/a {name(view.murderedId)}
        </Title>
      ) : (
        <Title sub="Všichni se probudili.">Tuto noc nikdo nezemřel</Title>
      );
    case 'MINIGAME':
      return view.minigame ? <MinigameScene mg={view.minigame} name={name} /> : null;
    case 'ENDED':
      return <EndScene view={view} name={name} />;
  }
}

/** Skončila-li hra hlasováním, nejdřív odhalení hlasování (karty, sloupce, vyhnaný, role), pak konec hry. */
function EndScene({ view, name }: { view: ScreenView; name: (id: string | null | undefined) => string }) {
  const t = useElapsed('end');
  const revealMs = view.tally ? (view.voteCards?.length ?? 0) * 1500 + 8000 : 0;
  return t < revealMs ? <VoteReveal view={view} name={name} /> : <Finale view={view} name={name} />;
}

function Lobby({ view }: { view: ScreenView }) {
  return (
    <div className="screen-lobby">
      <div className="screen-qr">
        {view.joinUrl && <QRCodeSVG value={view.joinUrl} size={512} marginSize={2} />}
        <p>Naskenuj a připoj se</p>
        <p className="muted">{view.joinUrl}</p>
      </div>
      <div className="screen-joined">
        <h1 className="screen-logo">Z R A D A</h1>
        <div className="screen-portraits wrap">
          {view.players.map((p) => (
            <Portrait key={p.id} label={p.name} />
          ))}
        </div>
        <p className="muted">
          {view.players.length} {view.players.length === 1 ? 'hráč' : view.players.length < 5 ? 'hráči' : 'hráčů'} u stolu
        </p>
      </div>
    </div>
  );
}

/**
 * Sloupce hlasů, pak vyhnaný a po 3 s napětí jeho role. Kdo pro koho hlasoval, se ukáže jen
 * se zapnutým veřejným hlasováním (Rozšíření 12): nejdřív karty „Petra → Marek“ jedna po druhé.
 */
function VoteReveal({ view, name }: { view: ScreenView; name: (id: string | null | undefined) => string }) {
  const elapsed = useElapsed(`vote-${view.round}`);
  const cards = view.voteCards ?? [];
  const cardsMs = cards.length * 1500;
  const shownCards = Math.min(cards.length, Math.floor(elapsed / 1500) + 1);
  const t = elapsed - cardsMs;
  const tally = view.tally ?? [];
  const max = Math.max(1, ...tally.map((r) => r.votes));
  const banished = view.players.find((p) => p.id === view.banishedId);
  // Zvuk ke každému kroku odhalení: karty, sloupce, jméno, role (gong pro Zrádce, molový akord pro Věrného).
  const stage = t < 0 ? -shownCards : t < 2500 ? 0 : t < 5500 ? 1 : 2;
  useEffect(() => {
    if (stage < 2) play('flip');
    else if (banished?.revealedRole) play(banished.revealedRole === 'TRAITOR' ? 'gong' : 'minor');
  }, [stage]);
  if (t < 0) {
    return (
      <div className="screen-vote-cards">
        {cards.slice(0, shownCards).map((c) => (
          <div key={c.voterId} className="screen-vote-card">
            <span>{name(c.voterId)}</span>
            <span className="muted">hlasuje pro</span>
            <b>{name(c.targetId)}</b>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="screen-vote">
      <div className="screen-tally">
        {tally.map((r) => (
          <div key={r.id} className={['screen-bar', t > 2500 && r.id !== view.banishedId ? 'dim' : ''].join(' ')}>
            <span className="screen-bar-name">{name(r.id)}</span>
            <span className="screen-bar-fill" style={{ width: `${(r.votes / max) * 100}%` }} />
            <span className="screen-bar-count">{r.votes}</span>
          </div>
        ))}
      </div>
      {t > 2500 &&
        (banished ? (
          <div className="screen-banished">
            <p className="muted">Kulatý stůl vyhnal</p>
            <h1>{banished.name}</h1>
            {t > 5500 && banished.revealedRole ? (
              <p className={`screen-role ${banished.revealedRole === 'TRAITOR' ? 'traitor' : 'loyal'}`}>
                {ROLE_LABEL[banished.revealedRole]}
              </p>
            ) : (
              <p className="screen-role pending">…</p>
            )}
          </div>
        ) : (
          <Title>Nikdo nebyl vyhnán</Title>
        ))}
    </div>
  );
}

/** Konec hry: role všech hráčů jedna po druhé, pak vítězná strana a poklad. */
function Finale({ view, name }: { view: ScreenView; name: (id: string | null | undefined) => string }) {
  const t = useElapsed('finale');
  const shown = Math.floor(t / 1500);
  const done = shown >= view.players.length;
  useEffect(() => {
    if (shown === 0) return;
    if (!done) play('flip');
    else if (shown === view.players.length) play(view.winner === 'TRAITOR' ? 'gong' : 'bell');
  }, [shown]);
  // Po 6 s od vyhlášení vítěze rekapitulace večera: časová osa kol a ceny.
  if (view.recap && t > view.players.length * 1500 + 6000) {
    return (
      <div className="screen-recap">
        <h1>{view.winner === 'TRAITOR' ? 'Vyhráli Zrádci' : 'Vyhráli Věrní'}: rekapitulace večera</h1>
        <Recap recap={view.recap} players={view.players} className="big" />
      </div>
    );
  }
  return (
    <div className="screen-finale">
      {view.banishedId && t < 1500 && <p className="muted">Kulatý stůl vyhnal: {name(view.banishedId)}</p>}
      <div className="screen-portraits wrap">
        {view.players.map((p, i) => (
          <Portrait
            key={p.id}
            label={p.name}
            tone={i < shown && p.revealedRole ? (p.revealedRole === 'TRAITOR' ? 'traitor' : 'loyal') : undefined}
            note={i < shown && p.revealedRole ? ROLE_LABEL[p.revealedRole] : undefined}
            dim={i >= shown}
          />
        ))}
      </div>
      {done && view.winner && (
        <Title
          sub={
            view.potShare
              ? `Poklad ${view.pot.toLocaleString('cs')}: každý vítěz získává ${view.potShare.each.toLocaleString('cs')} (${view.potShare.winners.map((id) => name(id)).join(', ')})`
              : `Poklad ${view.pot.toLocaleString('cs')}`
          }
        >
          {view.winner === 'TRAITOR' ? 'Vyhráli Zrádci' : 'Vyhráli Věrní'}
        </Title>
      )}
    </div>
  );
}

/** Společné scény miniher; ve hře scéna konkrétní minihry (GameScenes). */
function MinigameScene({ mg, name }: { mg: ScreenMinigameView; name: (id: string | null | undefined) => string }) {
  switch (mg.step) {
    case 'DRAW':
      return <DrawScene mg={mg} />;
    case 'INTRO':
      return (
        <div className="screen-intro">
          <h1>{mg.name}</h1>
          <ul>
            {mg.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="screen-traitor-rule">{mg.traitorRule}</p>
        </div>
      );
    case 'PLAY':
      return mg.game ? (
        <div className="screen-play">
          <div className="screen-play-head">
            <h2>{mg.name}</h2>
            <span className="screen-countdown">
              <Countdown endsAt={mg.endsAt} />
            </span>
          </div>
          <div className="screen-play-scene">
            <GameScene id={mg.id} game={mg.game} name={name} />
          </div>
        </div>
      ) : (
        <Title sub="Hra běží na telefonech.">
          {mg.name}
          <span className="screen-countdown">
            <Countdown endsAt={mg.endsAt} />
          </span>
        </Title>
      );
    case 'RESULT':
      return (
        <div className="screen-result">
          <h1>{mg.name}</h1>
          {/* Konečný stav hry (otočené karty duelu, všechny nabídky aukce, kód trezoru…) jako na telefonech. */}
          {mg.game != null && mg.id !== 'RHYTHM' && (
            <div className="screen-result-scene">
              <GameScene id={mg.id} game={mg.game} name={name} />
            </div>
          )}
          {mg.result && (
            <>
              <p>{mg.result.summary}</p>
              <p className="screen-result-line">Štít: {mg.result.shieldWinnerId ? name(mg.result.shieldWinnerId) : 'nikdo'}</p>
              <p className="screen-result-line">
                Poklad: {mg.result.potDelta > 0 ? '+' : ''}
                {mg.result.potDelta}
              </p>
              {mg.result.ghostWinnerIds.length > 0 && (
                <p className="screen-result-line">Mezi duchy vyhrál/a: {mg.result.ghostWinnerIds.map((id) => name(id)).join(', ')}</p>
              )}
            </>
          )}
        </div>
      );
    case 'CLUE':
      return (
        <div className="screen-clue">
          <h1>Stopa: {mg.name}</h1>
          {mg.clues && <ClueView clues={mg.clues} nameOf={(id) => name(id)} />}
        </div>
      );
    case 'HANDOFF':
      return (
        <Title sub="Vítěz se rozhoduje, komu štít dá.">
          Probíhá tajné předání štítu
          <span className="screen-countdown">
            <Countdown endsAt={mg.endsAt} />
          </span>
        </Title>
      );
    default:
      return <Title>Minihra skončila</Title>;
  }
}

/** „Osud vybírá…“: chvíli se točí názvy her v osudí, pak se zastaví na vylosované. */
function DrawScene({ mg }: { mg: ScreenMinigameView }) {
  const t = useElapsed(`draw-${mg.id}`);
  const spinning = t < 2500 && mg.candidates.length > 1;
  const shown = spinning ? mg.candidates[Math.floor(t / 150) % mg.candidates.length] : mg.name;
  return (
    <Title sub={spinning ? 'Osud vybírá…' : 'Dnešní minihra'}>
      <span className={spinning ? 'screen-spin' : 'screen-drawn'}>{shown}</span>
    </Title>
  );
}
