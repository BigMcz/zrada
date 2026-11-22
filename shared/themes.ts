// Témata hry (DOC/SPEC.md, Rozšíření 16): jiné názvy, texty, erb a barvy; pravidla a minihry stejné.

export const THEMES = ['CASTLE', 'SPACE', 'OFFICE', 'PIRATE'] as const;
export type ThemeId = (typeof THEMES)[number];

export function isTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** Tvary názvu role, které texty hry potřebují (všechny role jsou rodu mužského životného). */
export interface RoleWords {
  /** Zrádce (1. p. j. č.) */
  sg: string;
  /** Zrádci (1. p. mn. č.) */
  pl: string;
  /** Zrádců (2. p. mn. č.) */
  genPl: string;
  /** Zrádce (4. p. mn. č.) */
  accPl: string;
  /** Zrádce (2./4. p. j. č.) */
  genSg: string;
}

export interface Theme {
  id: ThemeId;
  /** Název tématu v nastavení moderátora. */
  label: string;
  /** Název hry (nadpis, záložka, titulky). */
  title: string;
  loyal: RoleWords;
  traitor: RoleWords;
  /** Nadpis fáze hlasování („Kulatý stůl“). */
  table: string;
  /** „u kulatého stolu“ */
  atTable: string;
  /** „ke kulatému stolu“ */
  toTable: string;
  /** „(začít) kulatý stůl“ */
  tableAcc: string;
  /** „(kolo) kulatého stolu“ */
  tableGen: string;
  /** „Kulatý stůl vyhnal“ (sloveso ve správném rodě) */
  banishedBy: string;
  /** „na hradě“ */
  place: string;
  /** Nadpis noční fáze. */
  night: string;
  /** První dvě věty úvodu; zbytek se složí z názvů rolí. */
  intro: [string, string];
  /** Soubor erbu ve /public. */
  crest: string;
}

export const THEME: Record<ThemeId, Theme> = {
  CASTLE: {
    id: 'CASTLE',
    label: 'Hrad',
    title: 'Zrada',
    loyal: { sg: 'Věrný', pl: 'Věrní', genPl: 'Věrných', accPl: 'Věrné', genSg: 'Věrného' },
    traitor: { sg: 'Zrádce', pl: 'Zrádci', genPl: 'Zrádců', accPl: 'Zrádce', genSg: 'Zrádce' },
    table: 'Kulatý stůl',
    atTable: 'u kulatého stolu',
    toTable: 'ke kulatému stolu',
    tableAcc: 'kulatý stůl',
    tableGen: 'kulatého stolu',
    banishedBy: 'Kulatý stůl vyhnal',
    place: 'na hradě',
    night: 'Noc',
    intro: ['Vítejte na hradě…', 'Dnes večer tu nejste všichni přátelé.'],
    crest: '/crest.svg',
  },
  SPACE: {
    id: 'SPACE',
    label: 'Vesmírná loď',
    title: 'Sabotáž',
    loyal: { sg: 'Člen posádky', pl: 'Členové posádky', genPl: 'Členů posádky', accPl: 'Členy posádky', genSg: 'Člena posádky' },
    traitor: { sg: 'Sabotér', pl: 'Sabotéři', genPl: 'Sabotérů', accPl: 'Sabotéry', genSg: 'Sabotéra' },
    table: 'Porada na můstku',
    atTable: 'na poradě na můstku',
    toTable: 'na poradu na můstek',
    tableAcc: 'poradu na můstku',
    tableGen: 'porady na můstku',
    banishedBy: 'Porada na můstku vyhnala',
    place: 'na palubě',
    night: 'Spánkový cyklus',
    intro: ['Vítejte na palubě…', 'Hluboko ve vesmíru nejste všichni na stejné straně.'],
    crest: '/crest-space.svg',
  },
  OFFICE: {
    id: 'OFFICE',
    label: 'Kancelář',
    title: 'Krtek',
    loyal: { sg: 'Kolega', pl: 'Kolegové', genPl: 'Kolegů', accPl: 'Kolegy', genSg: 'Kolegy' },
    traitor: { sg: 'Krtek', pl: 'Krtci', genPl: 'Krtků', accPl: 'Krtky', genSg: 'Krtka' },
    table: 'Porada',
    atTable: 'na poradě',
    toTable: 'na poradu',
    tableAcc: 'poradu',
    tableGen: 'porady',
    banishedBy: 'Porada vyhnala',
    place: 'v kanceláři',
    night: 'Po pracovní době',
    intro: ['Vítejte v kanceláři…', 'Ne každý kolega to s firmou myslí dobře.'],
    crest: '/crest-office.svg',
  },
  PIRATE: {
    id: 'PIRATE',
    label: 'Pirátská loď',
    title: 'Vzpoura',
    loyal: { sg: 'Námořník', pl: 'Námořníci', genPl: 'Námořníků', accPl: 'Námořníky', genSg: 'Námořníka' },
    traitor: { sg: 'Vzbouřenec', pl: 'Vzbouřenci', genPl: 'Vzbouřenců', accPl: 'Vzbouřence', genSg: 'Vzbouřence' },
    table: 'Shromáždění na palubě',
    atTable: 'na shromáždění na palubě',
    toTable: 'na shromáždění na palubu',
    tableAcc: 'shromáždění na palubě',
    tableGen: 'shromáždění na palubě',
    banishedBy: 'Shromáždění na palubě vyhnalo',
    place: 'na palubě',
    night: 'Noční hlídka',
    intro: ['Vítejte na palubě…', 'Ne každý námořník je věrný kapitánovi.'],
    crest: '/crest-pirate.svg',
  },
};

/**
 * Přepíše text psaný pro hrad do tématu (scénář moderátora). Nahrazuje jen tvary, které scénář
 * používá; delší fráze dřív než kratší, ať se „Zrádců“ nepřepíše jako „Zrádce“.
 */
export function themeText(text: string, t: Theme): string {
  if (t.id === 'CASTLE') return text;
  const c = THEME.CASTLE;
  const pairs: [string, string][] = [
    ['ke kulatému stolu', t.toTable],
    ['u kulatého stolu', t.atTable],
    ['Kulatý stůl', t.table],
    ['na hradě', t.place],
    [c.traitor.genPl, t.traitor.genPl],
    [c.traitor.pl, t.traitor.pl],
    [c.traitor.sg, t.traitor.sg],
    [c.loyal.genPl, t.loyal.genPl],
    [c.loyal.genSg, t.loyal.genSg],
    [c.loyal.pl, t.loyal.pl],
    [c.loyal.accPl, t.loyal.accPl],
    [c.loyal.sg, t.loyal.sg],
  ];
  let out = text;
  pairs.forEach(([from], i) => {
    out = out.split(from).join(`\u0000${i}\u0000`);
  });
  pairs.forEach(([, to], i) => {
    out = out.split(`\u0000${i}\u0000`).join(to);
  });
  return out;
}
