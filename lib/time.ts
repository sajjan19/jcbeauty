import { scheduling } from "./content";

/**
 * All scheduling maths happens in two plain values:
 *   - a date string, "YYYY-MM-DD"
 *   - minutes past midnight, 0–1439
 *
 * Both are interpreted in the studio's timezone (content.ts → scheduling.timezone),
 * never the server's. That keeps behaviour identical whether the app runs on a
 * laptop in Vancouver or a server in Virginia.
 */

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" → days since the epoch. Safe to compare and add to. */
export function dateToIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** Days since the epoch → "YYYY-MM-DD". */
export function indexToDate(index: number): string {
  return new Date(index * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return indexToDate(dateToIndex(date) + days);
}

/** Day of week for a date string: 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(dateToIndex(date) * MS_PER_DAY).getUTCDay();
}

/** A single comparable number for a moment: date + time of day. */
export function momentIndex(date: string, minutes: number): number {
  return dateToIndex(date) * 1440 + minutes;
}

/** The current date and time of day, in the studio's timezone. */
export function studioNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: scheduling.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** "10:30" → 630 */
export function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 630 → "10:30" */
export function formatTime24(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 630 → "10:30 AM" */
export function formatTime12(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-08-14" → "Friday, August 14, 2026" */
export function formatDateLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "2026-08-14" → "Fri, Aug 14" */
export function formatDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** 75 → "1 hr 15 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hr" : `${h} hrs`;
  return `${h} hr ${m} min`;
}
