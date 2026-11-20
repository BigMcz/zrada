import { auction } from './auction/index.js';
import { registerMinigame } from './registry.js';

/** Zaregistruje minihry, které se ve hře smí losovat. Volá se při startu serveru. */
export function registerAllMinigames(): void {
  registerMinigame(auction);
}
