import {
  recommendedTraitors,
  type ModeratorView,
  type NightHint,
  type PlayerView,
  type PublicPlayer,
  type PublicRoundResult,
} from '../../shared/types.js';
import type { GameState, Player } from './state.js';

/*
 * Bezpečnostní jádro aplikace: klient nikdy nedostane GameState, jen výsledek těchto funkcí.
 * Každé pole se sem kopíruje výslovně (žádné ...spread), aby se do pohledu omylem
 * nedostala role nebo token, které ve stavu přibudou později.
 */

function publicHistory(state: GameState): PublicRoundResult[] {
  return state.history.map((h) => ({ round: h.round, banishedId: h.banishedId, murderedId: h.murderedId }));
}

function publicPlayer(state: GameState, p: Player): PublicPlayer {
  const out: PublicPlayer = { id: p.id, name: p.name, status: p.status };
  // Role je veřejná jen u vyhnaného hráče a na konci hry.
  if (p.role && (p.status === 'BANISHED' || state.phase === 'ENDED')) out.revealedRole = p.role;
  return out;
}

function nightPart(state: GameState, me: Player): PlayerView['night'] {
  if (state.phase !== 'NIGHT') return undefined;

  if (me.role === 'TRAITOR') {
    const allies = state.players.filter((p) => p.role === 'TRAITOR' && p.id !== me.id);
    const aliveAllies = allies.filter((p) => p.status === 'ALIVE');
    const hint: NightHint =
      aliveAllies.length > 0
        ? { kind: 'ALLY', picks: aliveAllies.map((a) => ({ allyId: a.id, targetId: state.nightPicks[a.id] ?? null })) }
        : { kind: 'OWN', targetId: state.nightPicks[me.id] ?? null };
    return {
      myPick: state.nightPicks[me.id] ?? null,
      blocked: aliveAllies.map((a) => a.id),
      hint,
    };
  }

  const tip = state.nightTips[me.id] ?? null;
  return { myPick: tip, blocked: [], hint: { kind: 'OWN', targetId: tip } };
}

export function viewForPlayer(state: GameState, playerId: string): PlayerView | null {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;

  const allies =
    me.role === 'TRAITOR'
      ? state.players
          .filter((p) => p.role === 'TRAITOR' && p.id !== me.id)
          .map((p) => ({ id: p.id, name: p.name }))
      : [];

  const view: PlayerView = {
    kind: 'player',
    phase: state.phase,
    round: state.round,
    me: { id: me.id, name: me.name, status: me.status, sawRole: me.sawRole },
    allies,
    players: state.players.map((p) => publicPlayer(state, p)),
    history: publicHistory(state),
    myVote: state.phase === 'VOTE' ? (state.votes[me.id] ?? null) : null,
  };
  if (me.role) view.me.role = me.role;

  const night = nightPart(state, me);
  if (night) view.night = night;
  if (state.winner) view.winner = state.winner;
  return view;
}

export function viewForModerator(state: GameState, connectedIds: ReadonlySet<string>): ModeratorView {
  const players = state.players.map((p) => {
    const out: ModeratorView['players'][number] = {
      id: p.id,
      name: p.name,
      status: p.status,
      sawRole: p.sawRole,
      connected: connectedIds.has(p.id),
    };
    if (p.role) out.role = p.role;
    if (state.phase === 'ROLES') out.done = p.sawRole;
    if (state.phase === 'VOTE' && p.status === 'ALIVE') out.done = p.id in state.votes;
    return out;
  });

  const view: ModeratorView = {
    kind: 'moderator',
    phase: state.phase,
    round: state.round,
    traitorCount: state.traitorCount,
    recommendedTraitors: recommendedTraitors(state.players.length),
    players,
    history: publicHistory(state),
  };

  if (state.phase === 'NIGHT') {
    view.traitorsDone = state.players
      .filter((p) => p.role === 'TRAITOR' && p.status === 'ALIVE')
      .every((p) => p.id in state.nightPicks);
  }
  if (state.winner) view.winner = state.winner;
  return view;
}
