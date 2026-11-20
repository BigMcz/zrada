/** Porušení pravidla: akce se zahodí a odesílatel dostane hlášku. */
export class RuleError extends Error {}

export function fail(message: string): never {
  throw new RuleError(message);
}

// Jedna hláška pro každý nepovolený cíl, aby chyba neprozradila, proč (např. že jde o spoluzrádce).
export const INVALID_TARGET = 'Tohoto hráče nelze vybrat.';
export const WRONG_PHASE = 'Teď to nejde.';
export const NOT_ALLOWED = 'Na tohle nemáš oprávnění.';
