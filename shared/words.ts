// Skloňování pro texty sdílené serverem a klientem.

export function tokensWord(n: number): string {
  if (n === 1) return 'žeton';
  if (n >= 2 && n <= 4) return 'žetony';
  return 'žetonů';
}
