/** Živá svíčka (Rozšíření 14): vosk, knot, mihotavý plamen a záře – jen CSS, žádný obrázek. */
export function Candle({ size = 'normal' }: { size?: 'small' | 'normal' | 'big' }) {
  return (
    <span className={`candle-art ${size}`} aria-hidden="true">
      <span className="candle-glow" />
      <span className="candle-flame" />
      <span className="candle-wick" />
      <span className="candle-wax" />
    </span>
  );
}
