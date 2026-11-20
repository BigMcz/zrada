import type { MinigameId } from '../../shared/types.js';
import type { MinigameModule } from './types.js';

/** Všechny minihry, které se smí losovat. Moduly přibudou v krocích M3 a M4. */
const MODULES = new Map<MinigameId, MinigameModule>();

export function registerMinigame(module: MinigameModule): void {
  MODULES.set(module.id, module);
}

/** Jen pro testy: odebere testovací modul, aby neovlivnil ostatní testy. */
export function unregisterMinigame(id: MinigameId): void {
  MODULES.delete(id);
}

export function getMinigame(id: MinigameId): MinigameModule | undefined {
  return MODULES.get(id);
}

export function allMinigames(): MinigameModule[] {
  return [...MODULES.values()];
}
