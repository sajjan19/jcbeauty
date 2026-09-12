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

/**
 * Time she isn't available. `start_minutes` and `end_minutes` are null for a
 * whole day off, or set to block only part of a day.
 */
export type BlockedPeriod = {
  id: number;
  date: string;
  start_minutes: number | null;
  end_minutes: number | null;
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

function blockedPeriodsOn(date: string): BlockedPeriod[] {
  return db
    .prepare(`SELECT * FROM blocked_periods WHERE date = ?`)
    .all(date) as BlockedPeriod[];
}

/** True only when the entire day is blocked out. */
export function isDateBlocked(date: string): boolean {
  return blockedPeriodsOn(date).some((p) => p.start_minutes === null);
}

/** Does [start, end) collide with any time she has blocked off that day? */
function hitsBlockedTime(date: string, start: number, end: number): boolean {
  return blockedPeriodsOn(date).some((period) => {
    if (period.start_minutes === null || period.end_minutes === null) {
      return true; // whole day
    }
    return start < period.end_minutes && period.start_minutes < end;
  });
}

export function listBlockedPeriods(fromDate?: string): BlockedPeriod[] {
  if (fromDate) {
    return db
      .prepare(
        `SELECT * FROM blocked_periods WHERE date >= ?
         ORDER BY date, COALESCE(start_minutes, -1)`,
      )
      .all(fromDate) as BlockedPeriod[];
  }
  return db
    .prepare(
      `SELECT * FROM blocked_periods ORDER BY date, COALESCE(start_minutes, -1)`,
    )
    .all() as BlockedPeriod[];
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

    // Part of this day may be blocked off even when the day itself is open.
    if (hitsBlockedTime(date, start, end)) continue;

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
    if (hitsBlockedTime(input.date, start, end)) {
      return { ok: false, error: "That time is no longer available." };
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

    rememberClient(input.name, input.email, input.phone);

    return { ok: true, booking };
  });

  return transaction();
}

/**
 * Add a booking from the admin side.
 *
 * Deliberately looser than the client flow: no minimum notice, no
 * how-far-ahead limit and no opening-hours check, because she needs to be
 * able to record an appointment she agreed in person or squeeze one in
 * outside her usual times. Double-booking is still refused.
 */
export function createBookingAsAdmin(input: {
  serviceSlug: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  status?: BookingStatus;
}): CreateBookingResult {
  const service = getService(input.serviceSlug);
  if (!service) return { ok: false, error: "That service isn't available." };

  const start = parseTime(input.time);
  if (Number.isNaN(start)) {
    return { ok: false, error: "That start time isn't valid." };
  }
  const end = start + service.durationMinutes;

  const transaction = db.transaction((): CreateBookingResult => {
    const clash = activeBookingsOn(input.date).some((b) =>
      overlaps(start, end, b.start_minutes, b.end_minutes),
    );
    if (clash) {
      return {
        ok: false,
        error: "That overlaps an appointment already in the book.",
      };
    }

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
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
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
        input.status ?? "confirmed",
        new Date().toISOString(),
      );

    rememberClient(input.name, input.email, input.phone);

    return {
      ok: true,
      booking: db
        .prepare(`SELECT * FROM bookings WHERE id = ?`)
        .get(info.lastInsertRowid) as Booking,
    };
  });

  return transaction();
}

/**
 * Moves an existing appointment. Keeps its service and length, so only the
 * date and start time change, and refuses a move that would collide with
 * something else already booked.
 */
export function rescheduleBooking(
  id: number,
  date: string,
  time: string,
): { ok: true } | { ok: false; error: string } {
  const booking = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id) as
    | Booking
    | undefined;
  if (!booking) return { ok: false, error: "That appointment no longer exists." };

  const start = parseTime(time);
  if (Number.isNaN(start)) {
    return { ok: false, error: "That start time isn't valid." };
  }
  const end = start + booking.duration_minutes;

  const transaction = db.transaction(
    (): { ok: true } | { ok: false; error: string } => {
      const clash = activeBookingsOn(date).some(
        (b) =>
          b.id !== id && overlaps(start, end, b.start_minutes, b.end_minutes),
      );
      if (clash) {
        return { ok: false, error: "That overlaps another appointment." };
      }

      db.prepare(
        `UPDATE bookings SET date = ?, start_minutes = ?, end_minutes = ?
         WHERE id = ?`,
      ).run(date, start, end, id);

      return { ok: true };
    },
  );

  return transaction();
}

export function setBookingStatus(id: number, status: BookingStatus): void {
  db.prepare(`UPDATE bookings SET status = ? WHERE id = ?`).run(status, id);
}

/** Pass start/end as null to block the whole day. */
export function blockPeriod(
  date: string,
  start: number | null,
  end: number | null,
  reason: string | null,
): void {
  db.prepare(
    `INSERT INTO blocked_periods (date, start_minutes, end_minutes, reason, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(date, start, end, reason, new Date().toISOString());
}

/**
 * Blocks every day from `fromDate` to `toDate` inclusive, for holidays and
 * the like. One row per day, so any single day can be freed again on its own.
 */
export function blockPeriodRange(
  fromDate: string,
  toDate: string,
  start: number | null,
  end: number | null,
  reason: string | null,
): { ok: true; days: number } | { ok: false; error: string } {
  const span = dateToIndex(toDate) - dateToIndex(fromDate);

  if (span < 0) return { ok: false, error: "The end date is before the start." };
  // A mistyped year shouldn't quietly write thousands of rows.
  if (span > 365) return { ok: false, error: "That range is over a year long." };

  const insert = db.prepare(
    `INSERT INTO blocked_periods (date, start_minutes, end_minutes, reason, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    for (let i = 0; i <= span; i++) {
      insert.run(addDays(fromDate, i), start, end, reason, now);
    }
  });

  transaction();
  return { ok: true, days: span + 1 };
}

/**
 * Corrects one blocked period. Ranges are stored a row per day, so this
 * changes the single day it was called on, not the whole holiday.
 */
export function updateBlockedPeriod(
  id: number,
  date: string,
  start: number | null,
  end: number | null,
  reason: string | null,
): { ok: true } | { ok: false; error: string } {
  const exists = db
    .prepare(`SELECT id FROM blocked_periods WHERE id = ?`)
    .get(id);
  if (!exists) return { ok: false, error: "That time off no longer exists." };

  db.prepare(
    `UPDATE blocked_periods
     SET date = ?, start_minutes = ?, end_minutes = ?, reason = ?
     WHERE id = ?`,
  ).run(date, start, end, reason, id);

  return { ok: true };
}

export function unblockPeriod(id: number): void {
  db.prepare(`DELETE FROM blocked_periods WHERE id = ?`).run(id);
}

/**
 * Everyone who has ever booked, one row per person.
 *
 * Grouped by email, since that's the field a client is least likely to vary
 * between visits. Someone who books under two different emails shows up twice.
 */
export type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  /** Every appointment ever, past and future. */
  bookings: number;
  /** Appointments that have actually happened: past and not cancelled. */
  visits: number;
  upcoming: number;
  /** Null until they've actually booked something. */
  firstVisit: string | null;
  lastVisit: string | null;
  /**
   * Total of appointments that have already happened. Excludes upcoming
   * ones, which haven't been paid for yet.
   */
  spent: number;
};

/** The address book, with each person's booking history joined on. */
export function listClients(): Client[] {
  return db
    .prepare(
      `SELECT
         c.id, c.name, c.email, c.phone, c.notes,
         COALESCE(b.bookings, 0) AS bookings,
         COALESCE(b.visits, 0)   AS visits,
         COALESCE(b.upcoming, 0) AS upcoming,
         b.firstVisit, b.lastVisit,
         COALESCE(b.spent, 0) AS spent
       FROM clients c
       LEFT JOIN (
         SELECT LOWER(email) AS key,
                COUNT(*)  AS bookings,
                MIN(date) AS firstVisit,
                MAX(date) AS lastVisit,
                SUM(CASE WHEN date < ? AND status != 'cancelled'
                         THEN 1 ELSE 0 END) AS visits,
                SUM(CASE WHEN date < ? AND status != 'cancelled'
                         THEN price ELSE 0 END) AS spent,
                SUM(CASE WHEN date >= ? AND status IN ('pending','confirmed')
                         THEN 1 ELSE 0 END) AS upcoming
         FROM bookings
         GROUP BY LOWER(email)
       ) b ON b.key = LOWER(c.email)
       ORDER BY c.name COLLATE NOCASE`,
    )
    .all(studioNow().date, studioNow().date, studioNow().date) as Client[];
}

/**
 * One contact with their stats. Filtered from the full list rather than
 * given its own query: a single studio's address book is small enough that
 * the extra SQL isn't worth maintaining.
 */
export function getClient(id: number): Client | undefined {
  return listClients().find((c) => c.id === id);
}

/** Every appointment this person has had, newest first. */
export function listBookingsForClient(email: string): Booking[] {
  if (!email) return [];
  return db
    .prepare(
      `SELECT * FROM bookings
       WHERE LOWER(email) = LOWER(?)
       ORDER BY date DESC, start_minutes DESC`,
    )
    .all(email) as Booking[];
}

/**
 * Edits a contact's details.
 *
 * Appointments are linked to a contact by email, so changing one would cut
 * them off from their own history. Their bookings are updated in the same
 * transaction to keep the two in step.
 */
export function updateClient(
  id: number,
  name: string,
  email: string,
  phone: string,
  notes: string | null,
): { ok: true } | { ok: false; error: string } {
  const existing = db
    .prepare(`SELECT email FROM clients WHERE id = ?`)
    .get(id) as { email: string } | undefined;

  if (!existing) return { ok: false, error: "That contact no longer exists." };

  if (email) {
    const clash = db
      .prepare(
        `SELECT 1 FROM clients WHERE LOWER(email) = LOWER(?) AND id != ?`,
      )
      .get(email, id);
    if (clash) {
      return { ok: false, error: "Another contact already uses that email." };
    }
  }

  const transaction = db.transaction((): { ok: true } => {
    if (existing.email) {
      db.prepare(
        `UPDATE bookings SET client_name = ?, email = ?, phone = ?
         WHERE LOWER(email) = LOWER(?)`,
      ).run(name, email, phone, existing.email);
    }

    db.prepare(
      `UPDATE clients SET name = ?, email = ?, phone = ?, notes = ?
       WHERE id = ?`,
    ).run(name, email, phone, notes, id);

    return { ok: true };
  });

  return transaction();
}

export function createClient(
  name: string,
  email: string,
  phone: string,
  notes: string | null,
): { ok: true } | { ok: false; error: string } {
  if (email) {
    const existing = db
      .prepare(`SELECT 1 FROM clients WHERE LOWER(email) = LOWER(?)`)
      .get(email);
    if (existing) {
      return { ok: false, error: "Someone with that email is already saved." };
    }
  }

  db.prepare(
    `INSERT INTO clients (name, email, phone, notes, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(name, email, phone, notes, new Date().toISOString());

  return { ok: true };
}

/** Removes the contact only. Their past bookings are left untouched. */
export function deleteClient(id: number): void {
  db.prepare(`DELETE FROM clients WHERE id = ?`).run(id);
}

/**
 * Keeps the address book in step with bookings, so anyone who books through
 * the website turns up in Contacts without her adding them by hand.
 */
function rememberClient(name: string, email: string, phone: string): void {
  if (!email) return;
  db.prepare(
    `INSERT INTO clients (name, email, phone, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (LOWER(email)) WHERE email <> ''
     DO UPDATE SET name = excluded.name, phone = excluded.phone`,
  ).run(name, email, phone, new Date().toISOString());
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
