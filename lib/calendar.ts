/**
 * Calendar export for a confirmed-in-principle appointment.
 *
 * Everything here runs in the browser from data the client already has, so
 * there's no endpoint exposing bookings and nothing to secure.
 */

/**
 * How far `date` sits from UTC in the given zone, in milliseconds.
 * Positive east of Greenwich.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );

  return asIfUtc - date.getTime();
}

/**
 * A wall-clock time in the studio's zone → the real UTC instant.
 *
 * The offset is resolved twice because the first guess can land on the wrong
 * side of a daylight-saving change.
 */
export function studioTimeToUtc(
  date: string,
  minutes: number,
  timeZone: string,
): Date {
  const [y, m, d] = date.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);

  const firstGuess = zoneOffsetMs(new Date(naive), timeZone);
  let utc = naive - firstGuess;

  const secondGuess = zoneOffsetMs(new Date(utc), timeZone);
  if (secondGuess !== firstGuess) utc = naive - secondGuess;

  return new Date(utc);
}

/** 2026-08-04T18:00:00.000Z → "20260804T180000Z" */
function toIcsStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Long values must be folded at 75 octets, continuation lines start with a space. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const chunks: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 73) {
    chunks.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

function escape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export type CalendarEvent = {
  title: string;
  description: string;
  location: string;
  /** "YYYY-MM-DD" in studio-local time */
  date: string;
  /** minutes past midnight, studio-local */
  startMinutes: number;
  durationMinutes: number;
  timeZone: string;
  uid: string;
};

export function buildIcs(event: CalendarEvent): string {
  const start = studioTimeToUtc(event.date, event.startMinutes, event.timeZone);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JC Beauty//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "STATUS:TENTATIVE",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(event.title)} tomorrow`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // iCalendar requires CRLF line endings.
  return lines.map(fold).join("\r\n");
}

/** Google Calendar's "add event" URL, for people who live in a browser tab. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = studioTimeToUtc(event.date, event.startMinutes, event.timeZone);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsStamp(start)}/${toIcsStamp(end)}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
