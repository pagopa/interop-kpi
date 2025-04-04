export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export const elapsedTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  return elapsed > 1000
    ? `[TIME: ${(elapsed / 1000).toFixed(2)}s]`
    : `[TIME: ${elapsed}ms]`;
};
