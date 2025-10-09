import { format } from "date-fns";

export function formatDateyyyyMMdd(date: Date): string {
  return format(date, "yyyyMMdd");
}

export function formatTimehhmmss(date: Date): string {
  return format(date, "hhmmss");
}

export const dateToMilliseconds = (date: Date): number => {
  return Math.floor(date.getTime());
};

export const secondsToMilliseconds = (timestamp: number): number => {
  if (timestamp.toString().length === 10) {
    return timestamp * 1000;
  }

  return timestamp;
};

export const truncateTimestampDecimals = (value: number): number => {
  const intPart = value.toString().split(".")[0];
  return secondsToMilliseconds(Number(intPart));
};
