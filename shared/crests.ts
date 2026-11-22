// Znaky hráčů (DOC/SPEC.md, Rozšíření 16): kreslené symboly místo iniciál.

export const CRESTS = [
  'OWL',
  'KEY',
  'RAVEN',
  'LILY',
  'CROWN',
  'ANCHOR',
  'SWORD',
  'LANTERN',
  'SNAKE',
  'FOX',
  'ROSE',
  'STAR',
  'EYE',
  'MASK',
  'CHALICE',
  'TOWER',
  'MOON',
  'TREE',
] as const;

export type Crest = (typeof CRESTS)[number];

export const CREST_LABEL: Record<Crest, string> = {
  OWL: 'Sova',
  KEY: 'Klíč',
  RAVEN: 'Havran',
  LILY: 'Lilie',
  CROWN: 'Koruna',
  ANCHOR: 'Kotva',
  SWORD: 'Meč',
  LANTERN: 'Lucerna',
  SNAKE: 'Had',
  FOX: 'Liška',
  ROSE: 'Růže',
  STAR: 'Hvězda',
  EYE: 'Oko',
  MASK: 'Maska',
  CHALICE: 'Pohár',
  TOWER: 'Věž',
  MOON: 'Měsíc',
  TREE: 'Strom',
};

export function isCrest(value: unknown): value is Crest {
  return typeof value === 'string' && (CRESTS as readonly string[]).includes(value);
}
