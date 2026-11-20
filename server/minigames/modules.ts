import { auction } from './auction/index.js';
import { registerMinigame } from './registry.js';
import { splitSteal } from './splitSteal/index.js';

/** Zaregistruje minihry, které se ve hře smí losovat. Volá se při startu serveru. */
export function registerAllMinigames(): void {
  registerMinigame(auction);
  registerMinigame(splitSteal);
}
