import type { ReactNode } from 'react';
import type { AuctionScreenView } from '../../server/minigames/auction/index';
import type { BombScreenView } from '../../server/minigames/bomb/index';
import type { HotPotatoScreenView } from '../../server/minigames/hotPotato/index';
import type { PhysicalPlayerView } from '../../server/minigames/physical/index';
import type { QuizScreenView } from '../../server/minigames/quiz/index';
import type { RhythmScreenView } from '../../server/minigames/rhythm/index';
import type { SplitStealScreenView } from '../../server/minigames/splitSteal/index';
import type { VaultScreenView } from '../../server/minigames/vault/index';
import { BombArt, useBoomFlash } from '../minigames/hotPotato/BombArt';
import { Beat } from '../minigames/rhythm/Rhythm';

type Name = (id: string | null | undefined) => string;

/** Scéna minihry na velké obrazovce podle id; jen veřejné údaje z viewForScreen modulu. */
export function GameScene({ id, game, name }: { id: string | null; game: unknown; name: Name }): ReactNode {
  switch (id) {
    case 'AUCTION':
      return <AuctionScene g={game as AuctionScreenView} name={name} />;
    case 'SPLIT_STEAL':
      return <DuelScene g={game as SplitStealScreenView} name={name} />;
    case 'HOT_POTATO':
      return <PotatoScene g={game as HotPotatoScreenView} name={name} />;
    case 'QUIZ':
      return <QuizScene g={game as QuizScreenView} name={name} />;
    case 'VAULT':
      return <VaultScene g={game as VaultScreenView} name={name} />;
    case 'RHYTHM':
      return <RhythmScene g={game as RhythmScreenView} />;
    case 'BOMB':
      return <BombScene g={game as BombScreenView} name={name} />;
    case 'PHYSICAL':
      return <p className="sg-big-text">{(game as PhysicalPlayerView).text ?? 'Moderátor připravuje misi…'}</p>;
    default:
      return null;
  }
}

const Lead = ({ children }: { children: ReactNode }) => <p className="sg-lead">{children}</p>;

function AuctionScene({ g, name }: { g: AuctionScreenView; name: Name }) {
  if (g.stage === 'READY' || g.stage === 'TALK') return <Lead>Hráči se radí, kolik nabídnout.</Lead>;
  if (g.stage === 'BID')
    return (
      <Lead>
        Tajné nabídky: {g.submitted} z {g.total}
      </Lead>
    );
  return (
    <div className="sg-cards">
      {g.revealed.map((r) => (
        <div key={r.playerId} className="sg-card flip">
          <span className="sg-card-value">{r.bid}</span>
          <span className="sg-card-name">{name(r.playerId)}</span>
        </div>
      ))}
      {Array.from({ length: g.total - g.revealed.length }, (_, i) => (
        <div key={`hidden-${i}`} className="sg-card back" aria-hidden="true">
          ✦
        </div>
      ))}
    </div>
  );
}

const CHOICE: Record<string, string> = { SPLIT: 'Rozdělit', STEAL: 'Ukrást' };

function DuelScene({ g, name }: { g: SplitStealScreenView; name: Name }) {
  return (
    <div className="sg-duel">
      {g.duelists.map((d) => {
        const choice = g.revealed?.[d];
        return (
          <div key={d} className={['sg-card', 'big', choice ? `flip ${choice === 'STEAL' ? 'steal' : 'split'}` : 'back'].join(' ')}>
            <span className="sg-card-name">{name(d)}</span>
            <span className="sg-card-value">{choice ? CHOICE[choice] : '?'}</span>
          </div>
        );
      })}
      {!g.revealed && <Lead>{g.stage === 'CHOOSE' ? 'Duelisté se tajně rozhodují.' : 'Duelisté přesvědčují ostatní.'}</Lead>}
    </div>
  );
}

function PotatoScene({ g, name }: { g: HotPotatoScreenView; name: Name }) {
  const out = g.lastOut.map((id) => name(id)).join(' a ');
  const flash = useBoomFlash(g.eliminated.length);
  return (
    <div className="sg-potato">
      {g.stage === 'READY' && (
        <>
          <BombArt look="idle" className="sg-bomb-art" />
          <Lead>Bomba se za chvíli objeví u jednoho z vás.</Lead>
        </>
      )}
      {g.stage === 'BOMB' && (
        <>
          <div className="sg-bombs">
            {g.holderIds.map((id) => (
              <div key={id} className="sg-bomb-holder">
                <BombArt look="hot" className="sg-bomb-art" />
                <p className="sg-big-name">{name(id)}</p>
              </div>
            ))}
            {flash && <BombArt look="boom" id={g.eliminated.length} className="sg-boom-flash" />}
          </div>
          {g.lastOut.length > 0 && <p className="sg-small boom">Bum! Vypadává {out}</p>}
        </>
      )}
      {g.stage === 'PAUSE' && (
        <>
          <BombArt look="boom" id={g.eliminated.length} className="sg-bomb-art" />
          <p className="sg-big-name boom">Bum! Vypadává {out}</p>
        </>
      )}
      {g.stage === 'DONE' && <p className="sg-big-name">Přežil/a {name(g.remaining[0])}</p>}
      {g.eliminated.length > 0 && <p className="sg-small">Vypadli: {g.eliminated.map((id, i) => `${i + 1}. ${name(id)}`).join(', ')}</p>}
    </div>
  );
}

const LETTERS = ['A', 'B', 'C', 'D'];

function QuizScene({ g, name }: { g: QuizScreenView; name: Name }) {
  return (
    <div className="sg-quiz">
      <p className="sg-small">
        Otázka {g.index + 1} z {g.total}
        {g.stage === 'QUESTION' && ` · odpovědělo ${g.answeredCount} z ${g.playerCount}`}
      </p>
      <p className="sg-question">{g.question.text}</p>
      <div className="sg-options">
        {g.question.options.map((o, i) => (
          <div key={i} className={['sg-option', g.correct === i ? 'right' : g.correct !== null ? 'dim' : ''].join(' ')}>
            <b>{LETTERS[i]}</b> {o}
          </div>
        ))}
      </div>
      {g.stage !== 'QUESTION' && g.standings.length > 0 && (
        <p className="sg-small">
          Pořadí: {g.standings.slice(0, 5).map((r, i) => `${i + 1}. ${name(r.id)} ${r.points}`).join(' · ')}
        </p>
      )}
    </div>
  );
}

function VaultScene({ g, name }: { g: VaultScreenView; name: Name }) {
  if (g.stage === 'VOTE')
    return (
      <Lead>
        Volba zámečníka: hlasovalo {g.votedCount} z {g.playerCount}
      </Lead>
    );
  return (
    <div className="sg-vault">
      <p className="sg-small">
        Zámečník <b>{name(g.locksmithId)}</b> · zbývá pokusů {g.attemptsLeft}
      </p>
      {g.attempts.map((a, i) => (
        <div key={i} className="sg-windows">
          {a.guess.map((d, k) => (
            <span key={k} className="sg-window">
              {d}
            </span>
          ))}
          <span className="sg-hits">
            {a.hits} z {g.digits}
          </span>
        </div>
      ))}
      {g.attempts.length === 0 && (
        <div className="sg-windows">
          {Array.from({ length: g.digits }, (_, k) => (
            <span key={k} className="sg-window">
              ·
            </span>
          ))}
        </div>
      )}
      {g.revealedCode && <p className="sg-lead">Kód trezoru: {g.revealedCode.join(' ')}</p>}
    </div>
  );
}

function RhythmScene({ g }: { g: RhythmScreenView }) {
  const label = g.round === 0 ? 'Cvičné kolo' : `Kolo ${g.round} z ${g.rounds}`;
  return (
    <div className="sg-rhythm">
      <p className="sg-small">
        {label} · {g.bpm} BPM
      </p>
      {g.stage === 'ROUND' || g.stage === 'COLLECT' ? (
        <div className="sg-beat">
          <Beat beats={g.beats} offset={0} />
        </div>
      ) : g.stage === 'VOTE' ? (
        <Lead>Hráči volí před 2. kolem.</Lead>
      ) : (
        g.groupSync !== null && <p className="sg-big-name">Synchronizace skupiny {Math.round(g.groupSync)} %</p>
      )}
    </div>
  );
}

function BombScene({ g, name }: { g: BombScreenView; name: Name }) {
  return (
    <div className="sg-bombscene">
      <p className="sg-small">
        Pyrotechnik <b>{name(g.pyroId)}</b>
      </p>
      <div className="sg-lights" aria-label={`Chyby ${g.errors} z ${g.maxErrors}`}>
        {Array.from({ length: g.maxErrors }, (_, i) => (
          <span key={i} className={i < g.errors ? 'on' : ''} />
        ))}
      </div>
      <p className="sg-small">
        Dráty {g.wiresSolved ? '✓' : '…'} · Symboly {g.symbolsSolved ? '✓' : '…'}
      </p>
      {g.stage === 'READY' && <Lead>Navigátoři čtou manuál. Odpočet za chvíli začne.</Lead>}
      {g.paused && <Lead>Pyrotechnik se odpojil, odpočet stojí.</Lead>}
    </div>
  );
}
