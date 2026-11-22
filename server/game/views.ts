import {
  FINAL_MAX_ALIVE,
  GHOST_TIP_PHASES,
  recommendedTraitors,
  type GhostRank,
  type ModeratorGhost,
  type ModeratorView,
  type NightHint,
  type PlayerView,
  type PublicPlayer,
  type PublicRoundResult,
  type ScreenView,
} from '../../shared/types.js';
import { recapOf } from './recap.js';
import { isTippingGhost, pointsOf } from './rules.js';
import { drawCandidates } from '../minigames/framework.js';
import { moderatorMinigameView, playerMinigameView, screenMinigameView } from '../minigames/views.js';
import type { GameState, Player } from './state.js';

/*
 * Bezpečnostní jádro aplikace: klient nikdy nedostane GameState, jen výsledek těchto funkcí.
 * Každé pole se sem kopíruje výslovně (žádné ...spread), aby se do pohledu omylem
 * nedostala role nebo token, které ve stavu přibudou později.
 */

function tipsGiven(state: GameState, ghostId: string): number {
  const closed = state.ghostTipLog.filter((t) => t.ghostId === ghostId).length;
  return closed + (ghostId in state.ghostTips ? 1 : 0);
}

/** Duchové seřazení podle bodů (pak podle pořadí připojení). Body se počítají včetně skrytých. */
function ghostRanks(state: GameState): GhostRank[] {
  return state.players
    .filter((p) => p.status !== 'ALIVE' && p.role)
    .map((p) => ({
      id: p.id,
      points: pointsOf(state, p.id, true),
      tipsGiven: tipsGiven(state, p.id),
      canTip: isTippingGhost(p),
    }))
    .sort((a, b) => b.points - a.points);
}

/** Všichni hráči seřazení podle osobních bodů (včetně skrytých – jen pro konec hry a moderátora). */
function playerBoard(state: GameState): { id: string; points: number }[] {
  return state.players
    .map((p) => ({ id: p.id, points: pointsOf(state, p.id, true) }))
    .sort((a, b) => b.points - a.points);
}

function publicHistory(state: GameState): PublicRoundResult[] {
  return state.history.map((h) => {
    const out: PublicRoundResult = { round: h.round, banishedId: h.banishedId, murderedId: h.murderedId };
    // Záznam minihry obsahuje jen veřejné údaje (shrnutí, stopa, kdo štít vyhrál).
    if (h.minigame) out.minigame = structuredClone(h.minigame);
    return out;
  });
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
    me: {
      id: me.id,
      name: me.name,
      status: me.status,
      sawRole: me.sawRole,
      // Kdo štít drží, ví jen on sám (a moderátor). Ostatní ví jen, že ho má „někdo jiný“.
      shield: state.shieldHolderId === null ? 'NONE' : state.shieldHolderId === me.id ? 'MINE' : 'OTHER',
    },
    pot: state.pot,
    allies,
    players: state.players.map((p) => publicPlayer(state, p)),
    history: publicHistory(state),
    myVote: state.phase === 'VOTE' ? (state.votes[me.id] ?? null) : null,
    paused: state.paused !== null,
    publicVotes: state.settings.publicVotes,
    inFinale: state.finale,
    myFinalChoice: state.phase === 'FINAL_VOTE' ? (state.finalVotes[me.id] ?? null) : null,
    potShare: state.phase === 'ENDED' ? state.potShare : null,
    recap: state.phase === 'ENDED' ? recapOf(state) : null,
    // Skryté body (tipy duchů) až na konci hry, jinak by duch poznal Zrádce.
    myPoints: pointsOf(state, me.id, state.phase === 'ENDED'),
  };
  if (me.role) view.me.role = me.role;

  const night = nightPart(state, me);
  if (night) view.night = night;

  if (me.status !== 'ALIVE') {
    view.ghost = {
      canTip: isTippingGhost(me),
      tipOpen: isTippingGhost(me) && GHOST_TIP_PHASES.includes(state.phase),
      myTip: state.ghostTips[me.id] ?? null,
      tipsGiven: tipsGiven(state, me.id),
    };
  }
  const minigame = playerMinigameView(state, me);
  if (minigame) view.minigame = minigame;

  if (state.phase === 'ENDED') {
    const board = ghostRanks(state);
    if (board.length > 0) view.ghostBoard = board;
    if (state.points.length > 0 || state.minigamesPlayed.length > 0) view.playerBoard = playerBoard(state);
  }
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
    ghosts: ghostRanks(state).map((g): ModeratorGhost => {
      const tip = state.ghostTips[g.id] ?? null;
      const target = state.players.find((p) => p.id === tip);
      return { ...g, tip, tipOnTraitor: target ? target.role === 'TRAITOR' : null };
    }),
    pot: state.pot,
    playerPoints: Object.fromEntries(state.players.map((p) => [p.id, pointsOf(state, p.id, true)])),
    shieldHolderId: state.shieldHolderId,
    minigamesEnabled: state.settings.minigamesEnabled,
    physicalMission: state.settings.physicalMission,
    screenMuted: state.settings.screenMuted,
    publicVotes: state.settings.publicVotes,
    paused: state.paused !== null,
    inFinale: state.finale,
    finalAvailable: state.phase === 'MORNING' && !state.finale && state.players.filter((p) => p.status === 'ALIVE').length <= FINAL_MAX_ALIVE,
    finalVotes: { ...state.finalVotes },
    potShare: state.potShare,
    recap: state.phase === 'ENDED' ? recapOf(state) : null,
    minigameAvailable:
      state.settings.minigamesEnabled &&
      (state.phase === 'ROLES' || state.phase === 'MORNING') &&
      drawCandidates(state).length > 0,
  };
  const minigame = moderatorMinigameView(state);
  if (minigame) view.minigame = minigame;

  if (state.phase === 'NIGHT') {
    view.traitorsDone = state.players
      .filter((p) => p.role === 'TRAITOR' && p.status === 'ALIVE')
      .every((p) => p.id in state.nightPicks);
  }
  if (state.winner) view.winner = state.winner;
  return view;
}

/** Výsledek aktuálního kola (hlasování a noc). */
const thisRound = (state: GameState) => state.history.find((h) => h.round === state.round);

/**
 * Velká obrazovka (Rozšíření 9): jen veřejné informace. Žádné role živých hráčů, žádné volby
 * (kdo pro koho hlasoval), noční výběry, tipy duchů ani skryté body.
 */
export function viewForScreen(state: GameState, joinUrl: string | null): ScreenView {
  const alivePlayers = state.players.filter((p) => p.status === 'ALIVE');
  const round = thisRound(state);
  // Sloupce hlasů jen po uzavření hlasování (a na konci hry, když skončila hlasováním).
  const afterVote = state.phase === 'VOTE_RESULT' || (state.phase === 'ENDED' && Object.keys(state.votes).length > 0);
  let tally: ScreenView['tally'] = null;
  if (afterVote) {
    const counts = new Map<string, number>();
    for (const target of Object.values(state.votes)) counts.set(target, (counts.get(target) ?? 0) + 1);
    tally = [...counts.entries()].map(([id, votes]) => ({ id, votes })).sort((a, b) => b.votes - a.votes);
  }
  return {
    kind: 'screen',
    phase: state.phase,
    round: state.round,
    pot: state.pot,
    players: state.players.map((p) => publicPlayer(state, p)),
    joinUrl: state.phase === 'LOBBY' ? joinUrl : null,
    votesCast: state.phase === 'VOTE' ? alivePlayers.filter((p) => p.id in state.votes).length : null,
    voters: state.phase === 'VOTE' ? alivePlayers.length : null,
    tally,
    // Kdo pro koho hlasoval jen se zapnutým veřejným hlasováním (Rozšíření 12), v pořadí hráčů.
    voteCards:
      afterVote && state.settings.publicVotes
        ? state.players.filter((p) => p.id in state.votes).map((p) => ({ voterId: p.id, targetId: state.votes[p.id] }))
        : null,
    banishedId: afterVote ? (round?.banishedId ?? null) : null,
    murderedId: state.phase === 'MORNING' ? (round?.murderedId ?? null) : null,
    ghostBoard: state.players
      .filter((p) => p.status !== 'ALIVE' && p.role)
      .map((p) => ({ id: p.id, points: pointsOf(state, p.id, state.phase === 'ENDED') }))
      .sort((a, b) => b.points - a.points),
    minigame: screenMinigameView(state),
    winner: state.winner ?? null,
    muted: state.settings.screenMuted,
    paused: state.paused !== null,
    inFinale: state.finale,
    finalVotesCast: state.phase === 'FINAL_VOTE' ? alivePlayers.filter((p) => p.id in state.finalVotes).length : null,
    finalVoters: state.phase === 'FINAL_VOTE' ? alivePlayers.length : null,
    potShare: state.phase === 'ENDED' ? state.potShare : null,
    recap: state.phase === 'ENDED' ? recapOf(state) : null,
  };
}
