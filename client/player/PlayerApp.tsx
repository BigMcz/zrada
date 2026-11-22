import { useState, type ReactNode } from 'react';
import type { Intent, PlayerView, Role } from '../../shared/types';
import { MAX_NAME_LENGTH } from '../../shared/types';
import { GhostBoard, PlayerBoard } from '../components/GhostBoard';
import { PlayerGrid } from '../components/PlayerGrid';
import { RoleCard } from '../components/RoleCard';
import { Candle } from '../components/Candle';
import { Crest } from '../components/Crest';
import { AvatarFace, CrestOf, Sigil } from '../components/Sigil';
import { CREST_LABEL, CRESTS } from '../../shared/crests';
import { PotCounter } from '../components/PotCounter';
import { ClueView } from '../components/ClueView';
import { Recap } from '../components/Recap';
import { PrimaryButton, Screen, ScreenFooter, ScreenStatus } from '../components/Screen';
import { ReactionBar } from './ReactionBar';
import { Tutorial, tutorialSeen } from './Tutorial';
import { MinigameScreen } from '../minigames/MinigameScreen';
import { nameOf, phaseTag, ROLE_LABEL, STATUS_LABEL } from '../labels';
import { join, send, useConnection } from '../socket';
import { useEventHaptics, useTaskVibration, useWakeHint, useWakeLock } from './device';
import { theme, winnersWord } from '../themeStore';

export function PlayerApp() {
  const { connected, view } = useConnection();
  const wakeSupported = useWakeLock();
  const [showWakeHint, hideWakeHint] = useWakeHint(wakeSupported);
  useTaskVibration(view);
  useEventHaptics(view);

  return (
    <div
      className={[
        'phone',
        view?.kind === 'player' && view.ghost && view.phase !== 'ENDED' ? 'ghost-mode' : '',
        // Rozšíření 14: ráno telefon „svítá“ z noční tmy do teplého tónu.
        view?.kind === 'player' && view.phase === 'MORNING' ? 'dawn' : '',
        // Barva minihry (Rozšíření 14): jemný akcent podle id, stejný pro všechny role.
        view?.kind === 'player' && view.phase === 'MINIGAME' && view.minigame?.id ? `mg-accent mg-${view.minigame.id.toLowerCase()}` : '',
      ].join(' ')}
    >
      {!connected && <div className="connection-bar">Obnovuji spojení…</div>}
      {view?.kind === 'player' && view.paused && (
        <div className="pause-overlay" role="status">
          <Candle size="big" />
          <p>Pauza</p>
          <small>Moderátor hru na chvíli zastavil.</small>
        </div>
      )}
      {showWakeHint && view?.kind === 'player' && (
        <button type="button" className="wake-hint" onClick={hideWakeHint}>
          Nezhasínej displej, ať ti nic neuteče. ✕
        </button>
      )}
      <div className="rotate-hint">Otoč telefon na výšku</div>
      {!view ? (
        <Screen tag={theme().title}>
          <p className="muted center">Připojuji se ke hře…</p>
        </Screen>
      ) : view.kind === 'player' ? (
        <PlayerGame view={view} />
      ) : (
        <JoinScreen open={view.kind === 'guest' && view.joinOpen} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vstup
// ---------------------------------------------------------------------------

function JoinScreen({ open }: { open: boolean }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Screen tag={theme().title}>
        <Crest />
        <h1 className="title">{theme().title}</h1>
        <p className="center">Hra už běží nebo je plná. Připojit se teď nejde.</p>
      </Screen>
    );
  }

  return (
    <form
      className="form-screen"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await join(name);
        setBusy(false);
        setError(res.ok ? null : res.error);
      }}
    >
      <Screen
        tag={theme().title}
        action={
          <PrimaryButton type="submit" disabled={busy || name.trim().length === 0}>
            Vstoupit
          </PrimaryButton>
        }
      >
        <Crest />
        <h1 className="title">{theme().title}</h1>
        <div className="divider">✦</div>
        <label className="field">
          <span>Jak ti mají ostatní říkat?</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="go"
          />
        </label>
        {error && <p className="error">{error}</p>}
      </Screen>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Hra
// ---------------------------------------------------------------------------

function useSend() {
  const [error, setError] = useState<string | null>(null);
  const run = async (intent: Intent) => {
    const res = await send(intent);
    setError(res.ok ? null : res.error);
    return res.ok;
  };
  return { error, run };
}

/** Pečeť v rohu: roli si jde kdykoli znovu zobrazit. */
function RoleCorner({ view, onOpen }: { view: PlayerView; onOpen: () => void }) {
  if (!view.me.role) return null;
  return (
    <button type="button" className="seal-button" onClick={onOpen} aria-label="Zobrazit moji roli">
      ✦
    </button>
  );
}

function PlayerGame({ view }: { view: PlayerView }) {
  const [roleOpen, setRoleOpen] = useState(false);
  const corner = <RoleCorner view={view} onOpen={() => setRoleOpen(true)} />;
  const tag = phaseTag(view.phase, view.round);

  const [cluesOpen, setCluesOpen] = useState(false);
  // Minihry „ve hře“: veřejná informace, takže řádek se štítem a poklad vidí všichni stejně.
  const minigamesInPlay = view.phase === 'MINIGAME' || view.history.some((h) => h.minigame);
  const withClues = view.history.filter((h) => h.minigame && h.minigame.clues.length > 0);
  const status =
    minigamesInPlay && view.phase !== 'LOBBY' ? (
      <>
        <span>
          Poklad <PotCounter value={view.pot} />
        </span>
        <span>Moje body {view.myPoints}</span>
        {withClues.length > 0 && (
          <button type="button" className="link-button" onClick={() => setCluesOpen(true)}>
            Stopy ({withClues.length})
          </button>
        )}
      </>
    ) : null;
  const shieldLine = !minigamesInPlay
    ? undefined
    : view.me.shield === 'MINE'
      ? 'Tuto noc tě chrání štít.'
      : view.me.shield === 'OTHER'
        ? 'Štít drží někdo jiný.'
        : 'Dnes štít nikdo nemá.';

  let screen: ReactNode;
  if (view.phase === 'LOBBY') screen = <Waiting view={view} tag={tag} />;
  else if (view.phase === 'ENDED') screen = <Ended view={view} tag={tag} />;
  else if (view.phase === 'MINIGAME' && view.minigame)
    screen = <MinigameScreen key={view.round} view={view} tag={view.ghost ? `Duch · ${tag}` : tag} corner={corner} />;
  // key podle kola: v novém kole začíná duch bez předvybraného hráče
  else if (view.ghost) screen = <Ghost key={view.round} view={view} tag={`Duch · ${tag}`} corner={corner} />;
  else if (view.phase === 'ROLES') screen = <Roles view={view} tag={tag} corner={corner} />;
  // key podle kola: nový kulatý stůl / noc začíná bez předvybraného hráče
  else if (view.phase === 'FINAL_VOTE') screen = <FinalVote key={view.round} view={view} tag={tag} corner={corner} />;
  else if (view.phase === 'VOTE') screen = <Vote key={view.round} view={view} tag={tag} corner={corner} />;
  else if (view.phase === 'VOTE_RESULT') screen = <VoteResult view={view} tag={tag} corner={corner} />;
  else if (view.phase === 'NIGHT') screen = <Night key={view.round} view={view} tag={tag} corner={corner} />;
  else screen = <Morning view={view} tag={tag} corner={corner} />;

  const crestOf = (id: string) => view.players.find((p) => p.id === id)?.crest;
  return (
    <CrestOf.Provider value={crestOf}>
    <ScreenFooter.Provider value={view.canReact ? <ReactionBar /> : null}>
    <ScreenStatus.Provider value={status}>
      {screen}
      {cluesOpen && (
        <div className="overlay" onClick={() => setCluesOpen(false)}>
          <div className="overlay-panel scroll" onClick={(e) => e.stopPropagation()}>
            {withClues.map((h) => (
              <section key={h.round}>
                <h2 className="question">
                  {h.round}. den · {h.minigame!.name}
                </h2>
                <p className="center muted">{h.minigame!.summary}</p>
                <ClueView clues={h.minigame!.clues} nameOf={(id) => nameOf(view.players, id)} />
              </section>
            ))}
            <button type="button" className="secondary" onClick={() => setCluesOpen(false)}>
              Zavřít
            </button>
          </div>
        </div>
      )}
      {roleOpen && view.me.role && (
        <div className="overlay" onClick={() => setRoleOpen(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <RoleCard role={view.me.role} allies={view.allies} shieldLine={shieldLine} />
            <button type="button" className="secondary" onClick={() => setRoleOpen(false)}>
              Zavřít
            </button>
          </div>
        </div>
      )}
    </ScreenStatus.Provider>
    </ScreenFooter.Provider>
    </CrestOf.Provider>
  );
}

interface ScreenProps {
  view: PlayerView;
  tag: string;
  corner?: ReactNode;
}

function Waiting({ view, tag }: ScreenProps) {
  const myCrest = view.players.find((p) => p.id === view.me.id)?.crest;
  // Návod se na novém telefonu ukáže sám, jinak přes tlačítko (Rozšíření 16).
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  return (
    <Screen tag={tag}>
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      <div className="avatar big">
        <AvatarFace name={view.me.name} crest={myCrest} />
      </div>
      <p className="lead center">{view.me.name}</p>
      <p className="center">Čekáme na začátek hry</p>
      <CrestPicker view={view} mine={myCrest} />
      <p className="muted center">Připojených hráčů: {view.players.length}</p>
      <button type="button" className="link-button tutorial-open" onClick={() => setTutorial(true)}>
        Jak se hraje
      </button>
      {view.publicVotes && <p className="center">Hlasování je veřejné: velká obrazovka ukáže, kdo pro koho hlasoval.</p>}
      <Candle />
    </Screen>
  );
}

/** Výběr znaku v čekárně (Rozšíření 16): obsazené znaky jsou šedé a nejdou zmáčknout. */
function CrestPicker({ view, mine }: { view: PlayerView; mine?: string }) {
  const { error, run } = useSend();
  const taken = new Set(view.players.filter((p) => p.id !== view.me.id).map((p) => p.crest));
  return (
    <div className="crest-picker">
      <p className="muted center">Vyber si svůj znak</p>
      <div className="crest-grid">
        {CRESTS.map((c) => (
          <button
            key={c}
            type="button"
            className={c === mine ? 'crest-option selected' : 'crest-option'}
            disabled={taken.has(c)}
            aria-label={CREST_LABEL[c]}
            title={CREST_LABEL[c]}
            onClick={() => c !== mine && run({ type: 'setCrest', crest: c })}
          >
            <Sigil crest={c} />
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function Roles({ view, tag, corner }: ScreenProps) {
  const { error, run } = useSend();

  if (view.me.sawRole) {
    return (
      <Screen tag={tag} corner={corner}>
        <p className="lead center">Čekáme, až si roli prohlédnou ostatní.</p>
        <p className="muted center">Svou roli si můžeš kdykoli znovu zobrazit pečetí vpravo nahoře.</p>
        <Candle />
      </Screen>
    );
  }

  return (
    <Screen
      tag={tag}
      corner={corner}
      action={<PrimaryButton onClick={() => run({ type: 'ackRole' })}>Viděl/a jsem svou roli</PrimaryButton>}
    >
      <p className="center">Tvoje role je tajná. Ujisti se, že se ti nikdo nedívá přes rameno.</p>
      <RoleCard role={view.me.role!} allies={view.allies} />
      {error && <p className="error">{error}</p>}
    </Screen>
  );
}

function aliveOthers(view: PlayerView) {
  return view.players.filter((p) => p.status === 'ALIVE' && p.id !== view.me.id);
}

function Vote({ view, tag, corner }: ScreenProps) {
  const { error, run } = useSend();
  const [selected, setSelected] = useState<string | null>(view.myVote);
  const changed = selected !== view.myVote;

  return (
    <Screen
      tag={tag}
      corner={corner}
      action={
        <PrimaryButton disabled={!selected || !changed} onClick={() => selected && run({ type: 'vote', targetId: selected })}>
          {!selected
            ? 'Vyber hráče'
            : changed
              ? `Vyhnat: ${nameOf(view.players, selected)}`
              : 'Hlas odevzdán'}
        </PrimaryButton>
      }
    >
      {view.inFinale && <p className="center muted">Finále: hra pokračuje, mezi vámi je podle vás pořád {theme().traitor.sg}.</p>}
      <h2 className="question">Koho vyženeš?</h2>
      <PlayerGrid players={aliveOthers(view)} selectedId={selected} onSelect={setSelected} />
      <p className="hint">
        {view.myVote
          ? `Hlas odevzdán: ${nameOf(view.players, view.myVote)}. Dokud moderátor hlasování neuzavře, můžeš ho změnit.`
          : 'Vyber jednoho hráče a potvrď.'}
        {view.publicVotes && ' Hlasování je veřejné.'}
      </p>
      {error && <p className="error">{error}</p>}
    </Screen>
  );
}

/** Finálové hlasování: dvě velké karty, stejné pro Věrné i Zrádce (Rozšíření 11). */
function FinalVote({ view, tag, corner }: ScreenProps) {
  const { error, run } = useSend();
  const choice = view.myFinalChoice;
  const card = (value: 'END' | 'CONTINUE', title: string, text: string) => (
    <button
      type="button"
      className={choice === value ? 'final-card selected' : 'final-card'}
      onClick={() => run({ type: 'finalVote', choice: value })}
    >
      <span className="final-title">{title}</span>
      <span className="final-text">{text}</span>
    </button>
  );
  return (
    <Screen tag={tag} corner={corner}>
      <h2 className="question">Ukončit hru?</h2>
      {card('END', 'Ukončit hru', `Věřím, že tu zbyli jen ${theme().loyal.pl}.`)}
      {card('CONTINUE', 'Vyhnat dalšího', `Mezi námi je pořád ${theme().traitor.sg}.`)}
      <p className="hint">
        {choice ? 'Hlas odevzdán. Dokud moderátor hlasování neuzavře, můžeš ho změnit.' : 'Hru ukončí jen jednomyslné „Ukončit hru“.'}
      </p>
      {error && <p className="error">{error}</p>}
    </Screen>
  );
}

function lastRound(view: PlayerView) {
  return view.history.find((h) => h.round === view.round);
}

function VoteResult({ view, tag, corner }: ScreenProps) {
  const banishedId = lastRound(view)?.banishedId ?? null;
  const banished = view.players.find((p) => p.id === banishedId);
  return (
    <Screen tag={tag} corner={corner}>
      {banished ? (
        <>
          <p className="center">{theme().banishedBy}</p>
          <p className="headline center">{banished.name}</p>
          <p className={`center reveal ${roleClass(banished.revealedRole)}`}>
            {banished.revealedRole && ROLE_LABEL[banished.revealedRole]}
          </p>
        </>
      ) : (
        <p className="headline center">Nikdo nebyl vyhnán</p>
      )}
      <p className="muted center">Čekáme na moderátora.</p>
    </Screen>
  );
}

/**
 * Noc: Věrný i Zrádce mají stejnou mřížku, stejný řádek pod ní a stejné tlačítko.
 * Liší se jen otázka a to, co klepnutí na spoluzrádce udělá (nic).
 */
function Night({ view, tag, corner }: ScreenProps) {
  const { error, run } = useSend();
  const night = view.night!;
  const [selected, setSelected] = useState<string | null>(night.myPick);
  const changed = selected !== night.myPick;
  const isTraitor = view.me.role === 'TRAITOR';

  const hint =
    night.hint.kind === 'ALLY'
      ? `Spojenec volí: ${night.hint.picks.map((p) => nameOf(view.players, p.targetId)).join(', ')}`
      : `Tvá volba: ${nameOf(view.players, night.hint.targetId)}`;

  return (
    <Screen
      tag={tag}
      corner={corner}
      action={
        <PrimaryButton
          disabled={!selected || !changed}
          onClick={() => selected && run({ type: 'nightPick', targetId: selected })}
        >
          {!selected ? 'Vyber hráče' : changed ? `Potvrdit: ${nameOf(view.players, selected)}` : 'Potvrzeno'}
        </PrimaryButton>
      }
    >
      <h2 className="question">{isTraitor ? 'Koho tuto noc umlčíte?' : `Kdo je podle tebe ${theme().traitor.sg}?`}</h2>
      <PlayerGrid players={aliveOthers(view)} selectedId={selected} onSelect={setSelected} blocked={night.blocked} />
      <p className="hint">{hint}</p>
      {error && <p className="error">{error}</p>}
    </Screen>
  );
}

function Morning({ view, tag, corner }: ScreenProps) {
  const murderedId = lastRound(view)?.murderedId ?? null;
  return (
    <Screen tag={tag} corner={corner}>
      {murderedId ? (
        <>
          <p className="center">Tuto noc zemřel/a</p>
          <p className="headline center">{nameOf(view.players, murderedId)}</p>
        </>
      ) : (
        <p className="headline center">Tuto noc nikdo nezemřel</p>
      )}
      <p className="muted center">Čekáme na moderátora.</p>
    </Screen>
  );
}

/** Co se právě děje, pro vyřazené hráče. */
function currentEvent(view: PlayerView): string {
  const round = lastRound(view);
  if (view.phase === 'VOTE_RESULT') {
    return round?.banishedId ? `${theme().banishedBy}: ${nameOf(view.players, round.banishedId)}` : 'Nikdo nebyl vyhnán.';
  }
  if (view.phase === 'MORNING') {
    return round?.murderedId ? `Tuto noc zemřel/a: ${nameOf(view.players, round.murderedId)}` : 'Tuto noc nikdo nezemřel.';
  }
  if (view.phase === 'MINIGAME') return 'Hraje se minihra.';
  if (view.phase === 'VOTE') return 'Hráči hlasují, koho vyženou.';
  if (view.phase === 'NIGHT') return 'Je noc.';
  if (view.phase === 'FINAL_VOTE') return 'Finále: živí hráči rozhodují, jestli hru ukončit.';
  return '';
}

/**
 * Duch = vyřazený hráč. Od kulatého stolu do konce noci tipuje, kdo je Zrádce.
 * Jestli tipoval správně, se dozví až na konci hry.
 */
function Ghost({ view, tag, corner }: ScreenProps) {
  const { error, run } = useSend();
  const ghost = view.ghost!;
  const [selected, setSelected] = useState<string | null>(ghost.myTip);
  const changed = selected !== ghost.myTip;
  const how = view.me.status === 'BANISHED' ? `Vyhnali tě ${theme().atTable}.` : `${theme().traitor.pl} tě umlčeli.`;

  if (!ghost.canTip) {
    return (
      <Screen tag={tag} corner={corner}>
        <p className="headline center">Jsi duch</p>
        <p className="center">Jako {theme().traitor.sg} netipuješ, jen sleduješ hru.</p>
        <p className="hint center">{currentEvent(view)}</p>
        <PlayerList view={view} />
      </Screen>
    );
  }

  if (!ghost.tipOpen) {
    return (
      <Screen tag={tag} corner={corner}>
        <p className="headline center">Jsi duch</p>
        <p className="center">{how}</p>
        <p className="center">{currentEvent(view)}</p>
        <p className="muted center">
          Další tip můžeš dát od {theme().tableGen}. Odevzdané tipy: {ghost.tipsGiven}
        </p>
        <PlayerList view={view} />
      </Screen>
    );
  }

  const alivePlayers = view.players.filter((p) => p.status === 'ALIVE');
  return (
    <Screen
      tag={tag}
      corner={corner}
      action={
        <PrimaryButton disabled={!selected || !changed} onClick={() => selected && run({ type: 'ghostTip', targetId: selected })}>
          {!selected ? 'Vyber hráče' : changed ? `Tipnout: ${nameOf(view.players, selected)}` : 'Tip odevzdán'}
        </PrimaryButton>
      }
    >
      <p className="muted center">{currentEvent(view)}</p>
      <h2 className="question">Kdo je podle tebe {theme().traitor.sg}?</h2>
      <PlayerGrid players={alivePlayers} selectedId={selected} onSelect={setSelected} />
      <p className="hint">
        Tvůj tip v tomto kole: {nameOf(view.players, ghost.myTip)}
        <br />
        Odevzdané tipy: {ghost.tipsGiven}
      </p>
      <p className="muted center small">Jestli jsi tipoval/a správně, se dozvíš až na konci hry.</p>
      {error && <p className="error">{error}</p>}
      <PlayerList view={view} />
    </Screen>
  );
}

function Ended({ view, tag }: ScreenProps) {
  return (
    <Screen tag={tag}>
      <p className="center">Vyhráli</p>
      <p className={`headline center ${roleClass(view.winner)}`}>{winnersWord(view.winner)}</p>
      {view.potShare && (
        <p className="center">
          Poklad {view.pot.toLocaleString('cs')} bodů: každý vítěz získává <b>{view.potShare.each.toLocaleString('cs')}</b> (
          {view.potShare.winners.map((id) => nameOf(view.players, id)).join(', ')})
        </p>
      )}
      <PlayerList view={view} />
      {view.recap && <Recap recap={view.recap} players={view.players} />}
      {view.playerBoard && <PlayerBoard board={view.playerBoard} nameOf={(id) => nameOf(view.players, id)} />}
      {view.ghostBoard && <GhostBoard ghosts={view.ghostBoard} nameOf={(id) => nameOf(view.players, id)} />}
    </Screen>
  );
}

/** Barva jen pro veřejně odhalenou roli (vyhnaný hráč, konec hry). */
function roleClass(role: Role | undefined): string {
  return role === 'TRAITOR' ? 'role-traitor' : role === 'LOYAL' ? 'role-loyal' : '';
}

function PlayerList({ view }: { view: PlayerView }) {
  return (
    <ul className="player-list">
      {view.players.map((p) => (
        <li key={p.id} className={p.status === 'ALIVE' ? '' : 'out'}>
          <span>{p.name}</span>
          <span className="muted">
            {p.revealedRole && <span className={roleClass(p.revealedRole)}>{ROLE_LABEL[p.revealedRole]} · </span>}
            {STATUS_LABEL[p.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
