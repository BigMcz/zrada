import type { Role } from '../../shared/types';

/** Obrázky rolí (zmenšené z img/verny.png a img/zradce.png). */
const ROLE_IMG: Record<Role, string> = {
  LOYAL: '/verny.webp',
  TRAITOR: '/zradce.webp',
};

// Načíst obě předem: obrázek se ukáže hned při odhalení a podle stahování nejde poznat, která role přijde.
if (typeof Image !== 'undefined') for (const src of Object.values(ROLE_IMG)) new Image().src = src;

/** Motiv role (svíce Věrných / maska Zrádců). Ukazovat jen tam, kde je role už odhalená. */
export function RoleArt({ role, className = '' }: { role: Role; className?: string }) {
  return <img src={ROLE_IMG[role]} alt="" aria-hidden="true" draggable={false} className={`role-art ${className}`} />;
}
