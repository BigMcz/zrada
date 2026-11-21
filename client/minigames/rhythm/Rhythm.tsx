import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type {
  RhythmGhostView,
  RhythmModeratorView,
  RhythmPlayerView,
  RhythmRow,
} from '../../../server/minigames/rhythm/index';
import { serverNow, serverTimeOf, syncClock } from '../../socket';
import { NameGrid } from '../NameGrid';
import type { MinigameModeratorProps, MinigamePlayerProps } from '../registry';

/** Telefon pošle ťuknutí chvíli po poslední době (stejná tolerance jako na serveru). */
const SEND_AFTER_LAST_MS = 350;
/** Jak dlouho kruh svítí kolem doby. */
const FLASH_MS = 90;

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v)} %`);

function RoundTitle({ game }: { game: { round: number; rounds: number; bpm: number } }) {
  return (
    <p className="center muted rhythm-title">
      {game.round === 0 ? 'Cvičné kolo' : `Kolo ${game.round} z ${game.rounds}`} · {game.bpm} BPM
    </p>
  );
}

/**
 * Kruh se stahujícím se prstencem. Kreslí se mimo React přes requestAnimationFrame,
 * aby každý snímek nepřekresloval celou obrazovku.
 */
function Beat({ beats, offset }: { beats: number[]; offset: number }) {
  const ring = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const shown = beats.map((b) => b + offset);
    const interval = shown.length > 1 ? shown[1] - shown[0] : 750;
    const draw = () => {
      const now = serverNow();
      const next = shown.find((b) => b > now - FLASH_MS);
      const leadIn = shown[0] - interval;
      if (count.current) count.current.textContent = now < leadIn ? String(Math.max(1, Math.ceil((leadIn - now) / 1000))) : '';
      if (ring.current) {
        // Prstenec se stahuje vždy od předchozí doby (u první od jednoho intervalu předem).
        const prev = next === undefined ? undefined : [...shown].reverse().find((b) => b < next) ?? next - interval;
        const t = next === undefined || now < leadIn ? 1 : Math.min(1, Math.max(0, (next - now) / (next - prev!)));
        ring.current.style.transform = `scale(${1 + 1.6 * t})`;
        ring.current.style.opacity = next === undefined || now < leadIn ? '0' : String(0.35 + 0.65 * (1 - t));
      }
      if (core.current) core.current.classList.toggle('on', shown.some((b) => Math.abs(now - b) < FLASH_MS));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [beats, offset]);
  return (
    <div className="rhythm-beat" aria-hidden="true">
      <div ref={ring} className="rhythm-ring" />
      <div ref={core} className="rhythm-core" />
      <div ref={count} className="rhythm-count" />
    </div>
  );
}

/**
 * Ťukací plocha: čas ťuknutí z `pointerdown` (ne `click`, ten má na mobilu zpoždění).
 * Všechna ťuknutí kola odejdou najednou chvíli po poslední době.
 */
function TapPad({
  game,
  offset,
  send,
}: {
  game: { stage: string; round: number; beats: number[]; submitted: boolean };
  offset: number;
  send: (payload: unknown) => void;
}) {
  const taps = useRef<number[]>([]);
  const sent = useRef(false);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([]);
  const live = game.stage === 'ROUND' && !game.submitted;

  useEffect(() => {
    taps.current = [];
    sent.current = false;
  }, [game.round]);

  useEffect(() => {
    if (!live) return;
    const last = game.beats[game.beats.length - 1];
    const flush = () => {
      if (sent.current) return;
      sent.current = true;
      send({ round: game.round, taps: taps.current.slice(0, 64) });
    };
    const id = setTimeout(flush, Math.max(0, last + SEND_AFTER_LAST_MS - serverNow()));
    return () => clearTimeout(id);
  }, [live, game.round, game.beats, send]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!live || sent.current) return;
    taps.current.push(Math.round(serverTimeOf(e.timeStamp)));
    const r = e.currentTarget.getBoundingClientRect();
    const spark = { id: e.timeStamp, x: e.clientX - r.left, y: e.clientY - r.top };
    setSparks((s) => [...s.slice(-6), spark]);
    setTimeout(() => setSparks((s) => s.filter((x) => x.id !== spark.id)), 350);
  };

  return (
    <div className="rhythm-pad" onPointerDown={onDown}>
      <Beat beats={game.beats} offset={offset} />
      {sparks.map((s) => (
        <span key={s.id} className="rhythm-spark" style={{ left: s.x, top: s.y }} />
      ))}
      <p className="center muted rhythm-hint">{live ? 'Ťukej, když se prstenec dotkne kruhu' : 'Ťuknutí odeslána'}</p>
    </div>
  );
}

function Standings({ title, rows, nameOf }: { title: string; rows: RhythmRow[]; nameOf: (id: string) => string }) {
  if (rows.length === 0) return null;
  return (
    <section className="clue">
      <h3>{title}</h3>
      <ul>
        {rows.map((r, i) => (
          <li key={r.id}>
            <span>
              {i + 1}. {nameOf(r.id)}
            </span>
            <span className="clue-value">{pct(r.accuracy)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Na začátku Rytmu si telefon zpřesní rozdíl hodin (10 výměn zpráv). */
function useClockSync() {
  useEffect(() => {
    void syncClock(10);
  }, []);
}

/** Telefon. Věrný i Zrádce vypadají stejně; rušička je jen jiné číslo v `displayOffsetMs`. */
export function RhythmPlayer({ game, nameOf, send }: MinigamePlayerProps<RhythmPlayerView>) {
  useClockSync();
  if (game.stage === 'VOTE') {
    return (
      <>
        <p className="lead center">Vyber jednoho hráče</p>
        <p className="center muted">Co volba znamená, říká tvoje tajná karta.</p>
        <NameGrid
          ids={game.voteTargets}
          nameOf={nameOf}
          enabled={game.voteTargets}
          marked={game.myPick ? [game.myPick] : []}
          onPick={(id) => send({ pick: id })}
        />
      </>
    );
  }
  if (game.stage === 'ROUND' || game.stage === 'COLLECT') {
    return (
      <>
        <RoundTitle game={game} />
        <TapPad game={game} offset={game.displayOffsetMs} send={send} />
      </>
    );
  }
  return (
    <>
      <RoundTitle game={game} />
      <p className="headline center">{pct(game.myAccuracy)}</p>
      <p className="center muted">{game.round === 0 ? 'Tvoje přesnost ve cvičném kole' : 'Tvoje přesnost v kole'}</p>
      {game.groupSync !== null && <p className="lead center">Synchronizace skupiny: {pct(game.groupSync)}</p>}
      {game.stage === 'DONE' && <p className="center muted">Rytmus skončil.</p>}
    </>
  );
}

/** Duch hraje stejný rytmus mimo soutěž, bez volby. */
export function RhythmGhost({ game, nameOf, send }: MinigamePlayerProps<RhythmGhostView>) {
  useClockSync();
  if (game.stage === 'ROUND' || game.stage === 'COLLECT') {
    return (
      <>
        <RoundTitle game={game} />
        <TapPad game={game} offset={0} send={send} />
      </>
    );
  }
  return (
    <>
      <RoundTitle game={game} />
      {game.stage === 'VOTE' ? (
        <p className="lead center">Hráči volí. Další kolo začne za chvíli.</p>
      ) : (
        <>
          <p className="headline center">{pct(game.myAccuracy)}</p>
          <p className="center muted">Tvoje přesnost (hraješ mimo soutěž)</p>
        </>
      )}
      <Standings title="Pořadí duchů" rows={game.ghostStandings} nameOf={nameOf} />
    </>
  );
}

const JAM_LABEL = { HIT: 'zasáhla', BLOCKED: 'zablokovaná', UNUSED: 'nepoužitá' } as const;

/** Konzole: přesnosti po kolech, kalibrace, volby, cíl rušičky. */
export function RhythmModerator({ game, nameOf, players, send, busy }: MinigameModeratorProps<RhythmModeratorView>) {
  const stageLabel = {
    ROUND: game.round === 0 ? 'Cvičné kolo běží' : `Kolo ${game.round} běží`,
    COLLECT: 'Sbírám ťuknutí',
    PAUSE: 'Mezikrok',
    VOTE: 'Volba před kolem 2',
    DONE: 'Konec',
  }[game.stage];
  const acc = (round: number, id: string) => (game.accuracy[round]?.[id] === undefined ? '—' : pct(game.accuracy[round][id]));
  return (
    <>
      <p className="phase-detail">
        {stageLabel} · {game.bpm} BPM
        {(game.stage === 'ROUND' || game.stage === 'COLLECT') && ` · ťuknutí poslalo ${game.submitted.length}`}
      </p>
      <p className="rhythm-console-jam">
        Rušička: {game.jamTarget ? nameOf(game.jamTarget) : 'zatím nikdo'}
        {game.jam && ` · ${JAM_LABEL[game.jam]}`}
      </p>
      <ul className="console-players compact">
        {players.map((id) => {
          const pick = game.picks[id];
          return (
            <li key={id}>
              <span className="grow name">
                {nameOf(id)}
                {game.traitors.includes(id) ? ' 🗡️' : ''}
                {pick && ` → ${game.traitors.includes(id) ? 'ruší' : 'chrání'} ${nameOf(pick)}`}
              </span>
              <span className="state">
                kal. {game.calib[id] ?? 0} ms · {acc(1, id)} · {acc(2, id)} · {acc(3, id)}
              </span>
            </li>
          );
        })}
      </ul>
      <Standings title="Pořadí hráčů" rows={game.standings} nameOf={nameOf} />
      <Standings title="Pořadí duchů" rows={game.ghostStandings} nameOf={nameOf} />
      {game.stage === 'VOTE' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'endVote' })}>
          Ukončit volbu
        </button>
      )}
      {game.stage === 'PAUSE' && (
        <button type="button" className="console-primary big" disabled={busy} onClick={() => send({ action: 'next' })}>
          {game.round >= game.rounds ? 'Ukončit rytmus' : 'Další kolo'}
        </button>
      )}
    </>
  );
}
