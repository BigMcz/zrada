import type { Phase, PlayerStatus, PublicPlayer, Role } from '../shared/types';

export const PHASE_LABEL: Record<Phase, string> = {
  LOBBY: 'Čekárna',
  ROLES: 'Rozdání rolí',
  MINIGAME: 'Minihra',
  VOTE: 'Kulatý stůl',
  VOTE_RESULT: 'Kulatý stůl',
  NIGHT: 'Noc',
  MORNING: 'Ráno',
  ENDED: 'Konec hry',
};

export const ROLE_LABEL: Record<Role, string> = { LOYAL: 'Věrný', TRAITOR: 'Zrádce' };

export const STATUS_LABEL: Record<PlayerStatus, string> = {
  ALIVE: 've hře',
  BANISHED: 'vyhnán/a',
  MURDERED: 'zemřel/a',
  LEFT: 'odešel/a',
};

/** „Kulatý stůl · 2. kolo“ */
export function phaseTag(phase: Phase, round: number): string {
  const label = PHASE_LABEL[phase];
  return round > 0 && phase !== 'ENDED' && phase !== 'LOBBY' ? `${label} · ${round}. kolo` : label;
}

export function nameOf(players: PublicPlayer[], id: string | null | undefined): string {
  return players.find((p) => p.id === id)?.name ?? '—';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toLocaleUpperCase('cs');
}
