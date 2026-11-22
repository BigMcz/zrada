import { describe, expect, it } from 'vitest';
import { THEME, themeText } from '../shared/themes.js';

describe('témata (Rozšíření 16)', () => {
  it('hrad text nemění', () => {
    expect(themeText('Zrádci, otevřete oči.', THEME.CASTLE)).toBe('Zrádci, otevřete oči.');
  });

  it('přepíše role, stůl a místo ve správných tvarech', () => {
    const t = THEME.SPACE;
    expect(themeText('Vítejte na hradě.', t)).toBe('Vítejte na palubě.');
    expect(themeText('Usaďte se ke kulatému stolu. Kdo z vás je Zrádce?', t)).toBe('Usaďte se na poradu na můstek. Kdo z vás je Sabotér?');
    expect(themeText('Zrádci, mezi vámi jsou Věrní.', THEME.OFFICE)).toBe('Krtci, mezi vámi jsou Kolegové.');
    expect(themeText('Počet Zrádců a Věrných', THEME.PIRATE)).toBe('Počet Vzbouřenců a Námořníků');
  });
});
