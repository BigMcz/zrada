/** Obrázek štítu (zmenšený z img/stit.png). Jen na místech, kde je stejný pro všechny a nic neprozradí. */
const SHIELD_IMG = '/stit.webp';

if (typeof Image !== 'undefined') new Image().src = SHIELD_IMG;

export function ShieldArt({ className = '', dim = false }: { className?: string; dim?: boolean }) {
  return <img src={SHIELD_IMG} alt="" aria-hidden="true" draggable={false} className={`shield-art${dim ? ' dim' : ''} ${className}`} />;
}
