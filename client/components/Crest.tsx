import { theme } from '../themeStore';
/** Erb hry: u hradu malovaný (svíce se stínem dýky, img/erb.png), u ostatních témat SVG jako ikona stránky. */
export function Crest({ className = '' }: { className?: string }) {
  const { crest, crestArt } = theme();
  return <img src={crestArt ?? crest} alt="" aria-hidden="true" className={`crest${crestArt ? ' art' : ''} ${className}`} />;
}
