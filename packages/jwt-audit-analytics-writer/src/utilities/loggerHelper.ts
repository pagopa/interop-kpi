export const elapsedTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  return elapsed > 1000
    ? `[TIME: ${(elapsed / 1000).toFixed(2)}s]`
    : `[TIME: ${elapsed}ms]`;
};
