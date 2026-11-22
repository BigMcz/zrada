import { theme } from '../themeStore';
/** Erb hry (Rozšíření 14): štít, meč a svíčka. Stejný soubor slouží i jako ikona stránky. */
export function Crest({ className = '' }: { className?: string }) {
  return <img src={theme().crest} alt="" aria-hidden="true" className={`crest ${className}`} />;
}
