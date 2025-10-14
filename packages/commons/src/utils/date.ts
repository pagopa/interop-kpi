import { format } from "date-fns";

export function formatDateyyyyMMdd(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function formatTimehhmmss(date: Date): string {
  return format(date, "hhmmss");
}

export const normalizeTimestampToMilliseconds = (timestamp: number): number => {
  const integerPartOfTimestamp = Number(timestamp.toString().split(".")[0]);
  const integerPartLength = integerPartOfTimestamp.toString().length;

  if (integerPartLength === 10) {
    // Seconds -> milliseconds
    return integerPartOfTimestamp * 1000;
  }

  if (integerPartLength > 13 && integerPartLength <= 16) {
    // Microseconds -> milliseconds
    return Math.floor(integerPartOfTimestamp / 1000);
  }

  return integerPartOfTimestamp;
};
