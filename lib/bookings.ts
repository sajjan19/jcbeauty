import "server-only";

import { db } from "./db";
import { getService, hours, scheduling } from "./content";
import {
  addDays,
  dateToIndex,
  formatTime24,
  momentIndex,
  parseTime,
  studioNow,
  weekday,
} from "./time";

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: number;
  reference: string;
  service_slug: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  date: string;
  start_minutes: number;
  end_minutes: number;
  client_name: string;
  email: string;
  phone: string;
  notes: string | null;
  first_time: number;
  status: BookingStatus;
  created_at: string;
};

export type BlockedDate = {
  date: string;
  reason: string | null;
  created_at: string;
};

/* ── Reads ─────────────────────────────────────────────── */

/** Bookings that still occupy a slot. Cancelled ones free their time up. */
function activeBookingsOn(date: string): Booking[] {
  return db
    .prepare(
      `SELECT * FROM bookings
       WHERE date = ? AND status IN ('pending', 'confirmed')
       ORDER BY start_minutes`,
    )
    .all(date) as Booking[];
}

export function isDateBlocked(date: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM blocked_dates WHERE date = ?`)
    .get(date);
  return row !== undefined;
}

export function listBlockedDates(fromDate?: string): BlockedDate[] {
  if (fromDate) {
    return db
      .prepare(`SELECT * FROM blocked_dates WHERE date >= ? ORDER BY date`)
      .all(fromDate) as BlockedDate[];
  }
  return db
    .prepare(`SELECT * FROM blocked_dates ORDER BY date`)
    .all() as BlockedDate[];
}

export function listBookings(filter: {
  from?: string;
  to?: string;
  status?: BookingStatus;
  order?: "asc" | "desc";
}): Booking[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.from) {
    clauses.push("date >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("date <= ?");
    params.push(filter.to);
  }
  if (filter.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const dir = filter.order === "desc" ? "DESC" : "ASC";

  return db
    .prepare(
      `SELECT * FROM bookings ${where}
       ORDER BY date ${dir}, start_minutes ${dir}`,
    )
    .all(...params) as Booking[];
}

export function getBookingByReference(reference: string): Booking | undefined {
  return db
    .prepare(`SELECT * FROM bookings WHERE reference = ?`)
    .get(reference) as Booking | undefined;
}

/* ── Availability ──────────────────────────────────────── */

/**
 * Two appointments clash if either one starts before the other has finished
 * and been cleaned up. The buffer is applied on both sides so it doesn't
 * matter which is booked first.
 */
function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  const buffer = scheduling.bufferMinutes;
  return aStart < bEnd + buffer && bStart < aEnd + buffer;
}

/** The earliest moment a client is allowed to book, as a comparable index. */
function earliestBookableMoment(): number {
  const now = studioNow();
  return momentIndex(now.date, now.minutes + scheduling.minimumNoticeHours * 60);
}

/** The last date the calendar opens up to. */
export function lastBookableDate(): string {
  return addDays(studioNow().date, scheduling.maximumDaysAhead);
}

export function firstBookableDate(): string {
  return studioNow().date;
}

/**
 * Every start time still free for this service on this date, as "HH:MM".
 *
 * A slot is offered only if the whole appointment fits inside opening hours,
 * clears the minimum-notice cutoff, and doesn't clash with an existing booking.
 */
export function getAvailableSlots(serviceSlug: string, date: string): string[] {
  const service = getService(serviceSlug);
  if (!service) return [];

  // Outside the bookable window entirely.
  const dayIndex = dateToIndex(date);
  const todayIndex = dateToIndex(studioNow().date);
  if (dayIndex < todayIndex) return [];
  if (dayIndex > todayIndex + scheduling.maximumDaysAhead) return [];

  if (isDateBlocked(date)) return [];

  const dayHours = hours[weekday(date)];
  if (!dayHours) return [];

  const open = parseTime(dayHours.open);
  const close = parseTime(dayHours.close);
  const duration = service.durationMinutes;
  const cutoff = earliestBookableMoment();
  const existing = activeBookingsOn(date);

  const slots: string[] = [];

  for (
    let start = open;
    start + duration <= close;
    start += scheduling.slotIntervalMinutes
  ) {
    if (momentIndex(date, start) < cutoff) continue;

    const end = start + duration;
    const clashes = existing.some((b) =>
      overlaps(start, end, b.start_minutes, b.end_minutes),
    );
    if (clashes) continue;

    slots.push(formatTime24(start));
  }

  return slots;
}

/**
 * Which dates in a given month can still take this service.
 * Powers the calendar's enabled/disabled days in one round trip.
 */
export function getMonthAvailability(
  serviceSlug: string,
  year: number,
  month: number, // 1–12
): Record<string, boolean> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const result: Record<string, boolean> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    result[date] = getAvailableSlots(serviceSlug, date).length > 0;
  }

  return result;
}

/* ── Writes ────────────────────────────────────────────── */

function generateReference(): string {
  // Unambiguous alphabet — no O/0, I/1 — so it survives being read aloud.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `JC-${out}`;
}

export type CreateBookingInput = {
  serviceSlug: string;
  date: string;
  time: string; // "HH:MM"
  name: string;
  email: string;
  phone: string;
  notes?: string;
  firstTime: boolean;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: string };

/**
 * Insert a booking, re-checking availability inside the transaction.
 *
 * The slot list a client sees can go stale between loading the page and
 * pressing confirm, so the decisive check happens here — not in the UI.
 */
export function createBooking(
  input: CreateBookingInput,
): CreateBookingResult {
  const service = getService(input.serviceSlug);
  if (!service) return { ok: false, error: "That service isn't available." };

  const start = parseTime(input.time);
  if (Number.isNaN(start)) {
    return { ok: false, error: "That start time isn't valid." };
  }
  const end = start + service.durationMinutes;

  const transaction = db.transaction((): CreateBookingResult => {
    if (isDateBlocked(input.date)) {
      return { ok: false, error: "That date is no longer available." };
    }

    const dayHours = hours[weekday(input.date)];
    if (!dayHours) {
      return { ok: false, error: "The studio is closed that day." };
    }
    if (start < parseTime(dayHours.open) || end > parseTime(dayHours.close)) {
      return { ok: false, error: "That time is outside opening hours." };
    }
    if (momentIndex(input.date, start) < earliestBookableMoment()) {
      return {
        ok: false,
        error: `Appointments need at least ${scheduling.minimumNoticeHours} hours' notice.`,
      };
    }
    if (
      dateToIndex(input.date) >
      dateToIndex(studioNow().date) + scheduling.maximumDaysAhead
    ) {
      return { ok: false, error: "That date is too far ahead to book yet." };
    }

    const clash = activeBookingsOn(input.date).some((b) =>
      overlaps(start, end, b.start_minutes, b.end_minutes),
    );
    if (clash) {
      return {
        ok: false,
        error: "Sorry, that time was just taken. Please pick another.",
      };
    }

    // Retry on the astronomically unlikely reference collision.
    let reference = generateReference();
    for (let i = 0; i < 5 && getBookingByReference(reference); i++) {
      reference = generateReference();
    }

    const info = db
      .prepare(
        `INSERT INTO bookings (
           reference, service_slug, service_name, price, duration_minutes,
           date, start_minutes, end_minutes,
           client_name, email, phone, notes, first_time, status, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(
        reference,
        service.slug,
        service.name,
        service.price,
        service.durationMinutes,
        input.date,
        start,
        end,
        input.name,
        input.email,
        input.phone,
        input.notes?.trim() || null,
        input.firstTime ? 1 : 0,
        new Date().toISOString(),
      );

    const booking = db
      .prepare(`SELECT * FROM bookings WHERE id = ?`)
      .get(info.lastInsertRowid) as Booking;

    return { ok: true, booking };
  });

  return transaction();
}

export function setBookingStatus(id: number, status: BookingStatus): void {
  db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, id);
}

export function blockDate(date: string, reason: string | null): void {
  db.prepare(
    `INSERT INTO blocked_dates (date, reason, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`,
  ).run(date, reason, new Date().toISOString());
}

export function unblockDate(date: string): void {
  db.prepare(`DELETE FROM blocked_dates WHERE date = ?`).run(date);
}

/** Counts for the admin dashboard header. */
export function getStats(): {
  pending: number;
  upcoming: number;
  thisWeek: number;
} {
  const today = studioNow().date;
  const weekEnd = addDays(today, 7);

  const pending = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM bookings WHERE status = 'pending' AND date >= ?`,
      )
      .get(today) as { n: number }
  ).n;

  const upcoming = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM bookings
         WHERE date >= ? AND status IN ('pending','confirmed')`,
      )
      .get(today) as { n: number }
  ).n;

  const thisWeek = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM bookings
         WHERE date >= ? AND date <= ? AND status IN ('pending','confirmed')`,
      )
      .get(today, weekEnd) as { n: number }
  ).n;

  return { pending, upcoming, thisWeek };
}
