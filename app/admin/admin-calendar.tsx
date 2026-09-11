"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking } from "@/lib/bookings";
import { hours as businessHours } from "@/lib/content";
import {
  addDays,
  dateToIndex,
  formatDateLong,
  formatDuration,
  formatTime12,
  indexToDate,
  parseTime,
  weekday,
} from "@/lib/time";
import { updateBookingStatus } from "./actions";
import styles from "./admin-calendar.module.css";

type View = "day" | "week" | "month";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_INITIAL = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Pixels per hour in the day and week grids. */
const HOUR_HEIGHT = 52;

const pad = (n: number) => String(n).padStart(2, "0");

/** Sunday of the week containing `date`. */
function startOfWeek(date: string): string {
  return indexToDate(dateToIndex(date) - weekday(date));
}

/**
 * The visible hour range, derived from her opening hours with an hour of
 * padding either side, so the grid isn't mostly empty space.
 */
const openDays = Object.values(businessHours).filter(Boolean) as {
  open: string;
  close: string;
}[];
const GRID_START = Math.max(
  0,
  Math.min(...openDays.map((h) => parseTime(h.open))) - 60,
);
const GRID_END = Math.min(
  24 * 60,
  Math.max(...openDays.map((h) => parseTime(h.close))) + 60,
);
const HOUR_MARKS = Array.from(
  { length: Math.ceil((GRID_END - GRID_START) / 60) + 1 },
  (_, i) => GRID_START + i * 60,
);

/**
 * Side-by-side placement for appointments that overlap: each gets a lane,
 * and every booking that day is drawn at 1/lanes width.
 */
function assignLanes(items: Booking[]) {
  const lanes: Booking[][] = [];
  const placement = new Map<number, number>();

  for (const booking of items) {
    let lane = 0;
    while (
      lanes[lane] &&
      lanes[lane][lanes[lane].length - 1].end_minutes > booking.start_minutes
    ) {
      lane++;
    }
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(booking);
    placement.set(booking.id, lane);
  }

  return { placement, laneCount: Math.max(1, lanes.length) };
}

export function AdminCalendar({
  bookings,
  today,
  nowMinutes,
}: {
  bookings: Booking[];
  today: string;
  /** Studio-local time of day, for the current-time line. */
  nowMinutes: number;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<Booking | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const list = map.get(booking.date);
      if (list) list.push(booking);
      else map.set(booking.date, [booking]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_minutes - b.start_minutes);
    }
    return map;
  }, [bookings]);

  // Close the detail dialog on Escape, and stop the page behind it scrolling.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [selected]);

  const onDate = (date: string) => byDate.get(date) ?? [];

  function step(direction: number) {
    if (view === "day") return setCursor(addDays(cursor, direction));
    if (view === "week") return setCursor(addDays(cursor, direction * 7));
    const [y, m] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1 + direction, 1));
    setCursor(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`);
  }

  function openDay(date: string) {
    setCursor(date);
    setView("day");
  }

  const [cursorYear, cursorMonth] = cursor.split("-").map(Number);
  const title =
    view === "day"
      ? `${MONTH_NAMES[cursorMonth - 1]} ${Number(cursor.slice(-2))}, ${cursorYear}`
      : `${MONTH_NAMES[cursorMonth - 1]} ${cursorYear}`;

  const days =
    view === "day"
      ? [cursor]
      : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));

  return (
    <section className={styles.wrap} aria-label="Appointment calendar">
      <header className={styles.toolbar}>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => step(-1)}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.todayBtn}
            onClick={() => setCursor(today)}
          >
            Today
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => step(1)}
            aria-label="Next"
          >
            ›
          </button>
          <h2 className={styles.title} aria-live="polite">
            {title}
          </h2>
        </div>

        <div className={styles.segmented} role="group" aria-label="View">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles.segBtn} ${
                view === v ? styles.segBtnActive : ""
              }`}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {view === "month" ? (
        <MonthGrid
          year={cursorYear}
          month={cursorMonth}
          today={today}
          onDate={onDate}
          openDay={openDay}
          onSelect={setSelected}
        />
      ) : (
        <TimeGrid
          days={days}
          today={today}
          nowMinutes={nowMinutes}
          onDate={onDate}
          openDay={openDay}
          onSelect={setSelected}
          singleDay={view === "day"}
        />
      )}

      {selected && (
        <BookingDialog
          booking={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

/* ── Detail dialog ─────────────────────────────────────── */

function BookingDialog({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Appointment for ${booking.client_name}`}
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>{booking.client_name}</p>
            <span className={styles.dialogWhen}>
              {formatDateLong(booking.date)} at{" "}
              {formatTime12(booking.start_minutes)} to{" "}
              {formatTime12(booking.end_minutes)}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
            autoFocus
          >
            ✕
          </button>
        </div>

        <div className={styles.detailBody}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>
              <span className={`badge badge-${booking.status}`}>
                {booking.status}
              </span>
              {booking.first_time === 1 && " · first visit"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Service</span>
            <span className={styles.detailValue}>
              {booking.service_name}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Length</span>
            <span className={styles.detailValue}>
              {formatDuration(booking.duration_minutes)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Price</span>
            <span className={styles.detailValue}>${booking.price}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>
              <a href={`mailto:${booking.email}`}>{booking.email}</a>
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Phone</span>
            <span className={styles.detailValue}>
              <a href={`tel:${booking.phone}`}>{booking.phone}</a>
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Reference</span>
            <span className={styles.detailValue}>{booking.reference}</span>
          </div>
          {booking.notes && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Notes</span>
              <span className={`${styles.detailValue} ${styles.detailNotes}`}>
                {booking.notes}
              </span>
            </div>
          )}
        </div>

        <div className={styles.dialogActions}>
          {booking.status !== "confirmed" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="confirmed" />
              <button type="submit" className="btn btn-sm" onClick={onClose}>
                Confirm
              </button>
            </form>
          )}
          {booking.status !== "cancelled" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="cancelled" />
              <button
                type="submit"
                className="btn btn-outline btn-sm"
                onClick={onClose}
              >
                Cancel appointment
              </button>
            </form>
          )}
          {booking.status === "cancelled" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="pending" />
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
              >
                Reinstate
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Day and week: the hour grid ───────────────────────── */

function TimeGrid({
  days,
  today,
  nowMinutes,
  onDate,
  openDay,
  onSelect,
  singleDay,
}: {
  days: string[];
  today: string;
  nowMinutes: number;
  onDate: (d: string) => Booking[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
  singleDay: boolean;
}) {
  const bodyHeight = ((GRID_END - GRID_START) / 60) * HOUR_HEIGHT;

  return (
    <div className={styles.timeWrap}>
      <div className={styles.timeHeader}>
        <span className={styles.gutterSpacer} />
        <div
          className={styles.headerCols}
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
          {days.map((date) => (
            <button
              key={date}
              type="button"
              className={styles.dayHead}
              onClick={() => openDay(date)}
            >
              <span className={styles.dayName}>
                {WEEKDAY_SHORT[weekday(date)]}
              </span>
              <span
                className={`${styles.dayNum} ${
                  date === today ? styles.dayNumToday : ""
                }`}
              >
                {Number(date.slice(-2))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.timeBody} style={{ height: bodyHeight }}>
        <div className={styles.gutter}>
          {HOUR_MARKS.slice(0, -1).map((minutes) => (
            <span
              key={minutes}
              className={styles.gutterLabel}
              style={{ height: HOUR_HEIGHT }}
            >
              {formatTime12(minutes).replace(":00", "")}
            </span>
          ))}
        </div>

        <div
          className={styles.cols}
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
          {days.map((date) => {
            const items = onDate(date);
            const { placement, laneCount } = assignLanes(items);

            return (
              <div key={date} className={styles.col}>
                {HOUR_MARKS.slice(0, -1).map((minutes) => (
                  <span
                    key={minutes}
                    className={styles.hourLine}
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {items.map((booking) => {
                  const lane = placement.get(booking.id) ?? 0;
                  const top =
                    ((booking.start_minutes - GRID_START) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    22,
                    (booking.duration_minutes / 60) * HOUR_HEIGHT - 2,
                  );
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      className={`${styles.event} ${
                        styles[`event_${booking.status}`]
                      } ${height < 40 ? styles.eventShort : ""}`}
                      style={{
                        top,
                        height,
                        left: `calc(${(lane / laneCount) * 100}% + 2px)`,
                        width: `calc(${100 / laneCount}% - 4px)`,
                      }}
                      onClick={() => onSelect(booking)}
                    >
                      <span className={styles.eventTime}>
                        {formatTime12(booking.start_minutes)}
                      </span>
                      <span className={styles.eventName}>
                        {booking.client_name}
                      </span>
                      {(singleDay || height > 56) && (
                        <span className={styles.eventMeta}>
                          {booking.service_name}
                          {singleDay &&
                            ` · ${formatDuration(booking.duration_minutes)} · $${booking.price}`}
                        </span>
                      )}
                    </button>
                  );
                })}

                {date === today &&
                  nowMinutes >= GRID_START &&
                  nowMinutes <= GRID_END && (
                    <span
                      className={styles.nowLine}
                      style={{
                        top: ((nowMinutes - GRID_START) / 60) * HOUR_HEIGHT,
                      }}
                      aria-hidden
                    />
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Month ─────────────────────────────────────────────── */

function MonthGrid({
  year,
  month,
  today,
  onDate,
  openDay,
  onSelect,
}: {
  year: number;
  month: number;
  today: string;
  onDate: (d: string) => Booking[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
}) {
  // Apple fills the leading and trailing cells with neighbouring months
  // rather than leaving blanks, so the grid is always complete.
  const firstOfMonth = `${year}-${pad(month)}-01`;
  const gridStart = dateToIndex(firstOfMonth) - weekday(firstOfMonth);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeksNeeded = Math.ceil((weekday(firstOfMonth) + daysInMonth) / 7);
  const cells = Array.from({ length: weeksNeeded * 7 }, (_, i) =>
    indexToDate(gridStart + i),
  );

  return (
    <div className={styles.monthWrap}>
      <div className={styles.monthHead} aria-hidden>
        {WEEKDAY_INITIAL.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {cells.map((date) => {
          const items = onDate(date);
          const outside = Number(date.slice(5, 7)) !== month;
          return (
            <div
              key={date}
              className={`${styles.monthCell} ${
                outside ? styles.monthCellOutside : ""
              }`}
            >
              <button
                type="button"
                className={`${styles.monthNum} ${
                  date === today ? styles.monthNumToday : ""
                }`}
                onClick={() => openDay(date)}
                aria-label={`Open ${date}`}
              >
                {Number(date.slice(-2))}
              </button>
              <span className={styles.monthEvents}>
                {items.slice(0, 3).map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className={`${styles.pill} ${
                      styles[`pill_${booking.status}`]
                    }`}
                    onClick={() => onSelect(booking)}
                  >
                    <span className={styles.pillDot} aria-hidden />
                    <span className={styles.pillTime}>
                      {formatTime12(booking.start_minutes).replace(":00", "")}
                    </span>
                    <span className={styles.pillName}>
                      {booking.client_name}
                    </span>
                  </button>
                ))}
                {items.length > 3 && (
                  <span className={styles.more}>{items.length - 3} more</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
