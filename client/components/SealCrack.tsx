/**
 * Praskající pečeť (Rozšíření 14): při odhalení se vosková pečeť rozlomí na dvě poloviny,
 * které odletí. Vypadá stejně pro obě role; text karty se mezitím objeví.
 */
export function SealCrack() {
  return (
    <span className="seal-crack" aria-hidden="true">
      <span className="seal half left">✦</span>
      <span className="seal half right">✦</span>
    </span>
  );
}
