export function isReserveTransfer(memo: string): boolean {
  return /\bRDB\b/i.test(memo) || /caixinh/i.test(memo);
}
