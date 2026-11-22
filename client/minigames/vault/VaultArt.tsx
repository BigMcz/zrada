/** Obrázky Trezoru (zmenšené z img/trezor.png a img/trezor_open.png). */
const CLOSED_IMG = '/trezor.webp';
const OPEN_IMG = '/trezor-otevreny.webp';

// Načíst předem, ať se otevřený trezor ukáže hned při otevření.
if (typeof Image !== 'undefined') for (const src of [CLOSED_IMG, OPEN_IMG]) new Image().src = src;

/** Otevřel se trezor? Poslední pokus trefil všechny číslice. */
export function isOpened(game: { attempts: { hits: number }[]; digits: number }): boolean {
  const last = game.attempts[game.attempts.length - 1];
  return last !== undefined && last.hits === game.digits;
}

export type VaultLook = 'closed' | 'open' | 'failed';

/**
 * Trezor: zavřený, otevřený s pokladem, nebo zavřený a ztlumený (neotevřel se).
 * `shake` (počet pokusů) při změně cukne trezorem, třeba po špatném pokusu.
 */
export function VaultArt({ look, shake = 0, className = '' }: { look: VaultLook; shake?: number; className?: string }) {
  return (
    <img
      key={look === 'open' ? 'open' : `closed-${shake}`}
      src={look === 'open' ? OPEN_IMG : CLOSED_IMG}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`vault-art ${look}${shake > 0 && look === 'closed' ? ' shake' : ''} ${className}`}
    />
  );
}
