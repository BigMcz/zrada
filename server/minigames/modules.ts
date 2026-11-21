import { auction } from './auction/index.js';
import { hotPotato } from './hotPotato/index.js';
import { quiz } from './quiz/index.js';
import { registerMinigame } from './registry.js';
import { splitSteal } from './splitSteal/index.js';
import { vault } from './vault/index.js';

/** Zaregistruje minihry, které se ve hře smí losovat. Volá se při startu serveru. */
export function registerAllMinigames(): void {
  registerMinigame(auction);
  registerMinigame(splitSteal);
  registerMinigame(hotPotato);
  registerMinigame(quiz);
  registerMinigame(vault);
}
