import type {
  HotPotatoGhostView,
  HotPotatoModeratorView,
  HotPotatoPlayerView,
} from '../../../server/minigames/hotPotato/index';
import { Countdown } from '../../components/Countdown';
import { NameGrid } from '../NameGrid';
import { BombArt, useBoomFlash } from './BombArt';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

/** Červené pole ručičky (stejné číslo jako na serveru). */
const RED_FROM = 0.8;

/** Bod na půlkruhu budíku: 0 vlevo, 1 vpravo. */
function arcPoint(t: number, r: number): [number, number] {
  const a = Math.PI * (1 - t);
  return [60 + r * Math.cos(a), 60 - r * Math.sin(a)];
}

/** Ručička tlaku. Stejná pro všechny role; liší se jen hodnota ze serveru. */
export function PressureGauge({ pressure }: { pressure: number }) {
  const [x0, y0] = arcPoint(0, 48);
  const [xr, yr] = arcPoint(RED_FROM, 48);
  const [x1, y1] = arcPoint(1, 48);
  const angle = -90 + 180 * Math.min(1, Math.max(0, pressure));
  return (
    <svg className="gauge" viewBox="0 0 120 68" role="img" aria-label="Ručička tlaku">
      <path d={`M ${x0} ${y0} A 48 48 0 0 1 ${xr} ${yr}`} className="gauge-track" />
      <path d={`M ${xr} ${yr} A 48 48 0 0 1 ${x1} ${y1}`} className="gauge-red" />
      <line x1="60" y1="60" x2="60" y2="18" className="gauge-needle" style={{ transform: `rotate(${angle}deg)` }} />
      <circle cx="60" cy="60" r="5" className="gauge-hub" />
    </svg>
  );
}

function Eliminated({ game, nameOf }: { game: { eliminated: string[] }; nameOf: (id: string) => string }) {
  if (game.eliminated.length === 0) return null;
  return (
    <p className="center muted potato-out">
      Vypadli: {game.eliminated.map((id, i) => `${i + 1}. ${nameOf(id)}`).join(', ')}
    </p>
  );
}

const names = (ids: string[], nameOf: (id: string) => string) => ids.map(nameOf).join(' a ');

/** Hlavní řádek stavu, společný pro hráče i ducha. Ve velké skupině můžou být bomby dvě (Rozšíření 17). */
function StatusLine({ game, nameOf, amHolder }: { game: HotPotatoPlayerView | HotPotatoGhostView; nameOf: (id: string) => string; amHolder?: boolean }) {
  if (game.stage === 'READY') return <p className="lead center">Bomba se za chvíli objeví u jednoho z vás.</p>;
  if (game.stage === 'PAUSE') return <p className="headline center potato-boom">Bum! Vypadává {names(game.lastOut, nameOf)}.</p>;
  if (game.stage === 'DONE') {
    return <p className="headline center">Poslední přeživší: {game.remaining[0] ? nameOf(game.remaining[0]) : 'nikdo'}</p>;
  }
  const boom = game.lastOut.length > 0 && <p className="center potato-boom">Bum! Vypadává {names(game.lastOut, nameOf)}.</p>;
  if (amHolder) return <>{boom}<p className="headline center potato-hot">Pošli ji dál!</p></>;
  return (
    <>
      {boom}
      <p className="lead center">
        {game.holderIds.length > 1 ? 'Bomby mají' : 'Bombu má'}: <b>{game.holderIds.length > 0 ? names(game.holderIds, nameOf) : '—'}</b>
      </p>
    </>
  );
}

/**
 * Telefon. Ručičku tlaku vidí všichni živí po celou dobu; Věrný i Zrádce mají stejné rozložení.
 * Rozdílné rozložení držitele a ostatních nic neprozradí, kdo bombu drží, je veřejné.
 */
export function HotPotatoPlayer({ game, nameOf, send }: MinigamePlayerProps<HotPotatoPlayerView>) {
  const bomb = game.stage === 'BOMB';
  const flash = useBoomFlash(game.eliminated.length);
  const look = game.stage === 'PAUSE' || flash ? 'boom' : game.amHolder ? 'hot' : 'idle';
  return (
    <>
      <BombArt look={look} id={game.eliminated.length} />
      <PressureGauge pressure={game.pressure} />
      <StatusLine game={game} nameOf={nameOf} amHolder={game.amHolder} />
      {game.amOut && game.stage !== 'DONE' && <p className="center muted">Bouchlo to u tebe. Sleduj, jak to dopadne.</p>}
      {(bomb || game.stage === 'PAUSE' || game.stage === 'READY') && (
        <NameGrid
          ids={game.remaining}
          nameOf={nameOf}
          enabled={game.amHolder ? game.canPassTo : []}
          marked={game.holderIds}
          onPick={(id) => send({ targetId: id })}
        />
      )}
      <Eliminated game={game} nameOf={nameOf} />
    </>
  );
}

function GhostBomb({ game }: { game: HotPotatoGhostView }) {
  const flash = useBoomFlash(game.eliminated.length);
  return <BombArt look={game.stage === 'PAUSE' || flash ? 'boom' : 'idle'} id={game.eliminated.length} />;
}

/** Duch: před první bombou dva tipy, pak sleduje, kdo bombu drží. Ručičku tlaku nemá. */
export function HotPotatoGhost({ game, nameOf, send }: MinigamePlayerProps<HotPotatoGhostView>) {
  const tip = game.myTip;
  if (game.canTip) {
    return (
      <>
        <p className="center">Kdo přežije poslední? <span className="muted">(3 body)</span></p>
        <NameGrid
          ids={game.players}
          nameOf={nameOf}
          enabled={game.players}
          marked={tip.survivorId ? [tip.survivorId] : []}
          onPick={(id) => send({ survivorId: id })}
        />
        <p className="center">U koho bouchne první? <span className="muted">(1 bod)</span></p>
        <NameGrid
          ids={game.players}
          nameOf={nameOf}
          enabled={game.players}
          marked={tip.firstId ? [tip.firstId] : []}
          onPick={(id) => send({ firstId: id })}
        />
      </>
    );
  }
  return (
    <>
      <GhostBomb game={game} />
      <StatusLine game={game} nameOf={nameOf} />
      <NameGrid ids={game.remaining} nameOf={nameOf} marked={game.holderIds} />
      <Eliminated game={game} nameOf={nameOf} />
      <p className="center muted">
        Tvůj tip: přežije {tip.survivorId ? nameOf(tip.survivorId) : '—'}, první bouchne u {tip.firstId ? nameOf(tip.firstId) : '—'}
      </p>
    </>
  );
}

/** Konzole: kdo drží bombu, skutečný čas do výbuchu, vyřazení a tipy duchů. */
export function HotPotatoModerator({ game, nameOf, send, busy }: MinigameModeratorProps<HotPotatoModeratorView>) {
  const stageLabel = {
    READY: 'Příprava (duchové tipují)',
    BOMB: `${game.round + 1}. kolo${game.bombs.length > 1 ? ', dvě bomby' : ''}`,
    PAUSE: 'Pauza po výbuchu',
    DONE: 'Konec',
  }[game.stage];
  const tips = Object.entries(game.ghostTips);
  return (
    <>
      <p className="phase-detail">{stageLabel}</p>
      {game.stage === 'BOMB' &&
        game.bombs.map((b) => (
          <p key={b.holderId} className="potato-console">
            Bombu drží <b>{nameOf(b.holderId)}</b>, výbuch za <Countdown endsAt={b.explodeAt} />
            <span className="muted"> (rozbuška {Math.round(b.fuseMs / 1000)} s)</span>
          </p>
        ))}
      <ul className="console-players compact">
        {game.players.map((id) => {
          const out = game.eliminated.indexOf(id);
          return (
            <li key={id}>
              <span className="grow name">{nameOf(id)}</span>
              <span className="state">
                {out >= 0 ? `vyřazen/a jako ${out + 1}.` : game.holderIds.includes(id) ? '💣 drží bombu' : 've hře'}
              </span>
            </li>
          );
        })}
      </ul>
      {tips.length > 0 && (
        <ul className="console-players compact">
          {tips.map(([id, t]) => (
            <li key={id}>
              <span className="grow name">👻 {nameOf(id)}</span>
              <span className="state">
                přežije {t.survivorId ? nameOf(t.survivorId) : '—'}, první {t.firstId ? nameOf(t.firstId) : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {game.stage === 'READY' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endStage' })}>
          Spustit bombu
        </button>
      )}
    </>
  );
}
