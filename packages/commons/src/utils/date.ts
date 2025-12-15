import { format } from "date-fns";

export const MAX_SUPPORTED_TIMESTAMP_MS = 253402300799999; // 9999-12-31T23:59:59.999Z

export function formatDateyyyyMMdd(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function formatTimehhmmss(date: Date): string {
  return format(date, "hhmmss");
}

export const normalizeTimestampToMilliseconds = (timestamp: number): number => {
  // eslint-disable-next-line functional/no-let
  let ms: number;

  // ns -> ms
  if (timestamp > 1e17) {
    ms = Math.trunc(timestamp / 1_000_000);
  }
  // µs -> ms
  else if (timestamp > 1e14) {
    ms = Math.trunc(timestamp / 1_000);
  }
  // ms -> ms
  else if (timestamp > 1e12) {
    ms = Math.trunc(timestamp);
  }
  // s -> ms
  else {
    ms = Math.trunc(timestamp * 1_000);
  }

  return Math.min(ms, MAX_SUPPORTED_TIMESTAMP_MS);
};
