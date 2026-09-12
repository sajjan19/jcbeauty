"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { BlockedPeriod, Booking } from "@/lib/bookings";
import { hours as businessHours, scheduling } from "@/lib/content";
import {
  addDays,
  dateToIndex,
  formatDateLong,
  formatDuration,
  formatTime12,
  formatTime24,
  indexToDate,
  parseTime,
  weekday,
} from "@/lib/time";
import { AddBookingForm, type KnownClient } from "./add-booking-form";
import {
  rescheduleAppointment,
  updateBookingStatus,
  type RescheduleState,
} from "./actions";
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
/** How long a press counts as a long press, in milliseconds. */
const LONG_PRESS_MS = 500;

const pad = (n: number) => String(n).padStart(2, "0");

/** Sunday of the week containing `date`. */
function startOfWeek(date: string): string {
  return indexToDate(dateToIndex(date) - weekday(date));
}

/** Saturday or Sunday, shaded so the weekend is easy to pick out. */
function isWeekend(date: string): boolean {
  const day = weekday(date);
  return day === 0 || day === 6;
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

/** Where a whole-day slot starts when no time was pointed at. */
const DEFAULT_START = Math.min(...openDays.map((h) => parseTime(h.open)));

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

/** Turns a pointer position inside a day column into a snapped start time. */
function timeAtPointer(clientY: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const raw = GRID_START + ((clientY - rect.top) / HOUR_HEIGHT) * 60;
  const step = scheduling.slotIntervalMinutes;
  const snapped = Math.round(raw / step) * step;
  return Math.min(Math.max(snapped, GRID_START), GRID_END - step);
}

export function AdminCalendar({
  bookings,
  blocked,
  today,
  nowMinutes,
  clients,
  prefillClient,
}: {
  bookings: Booking[];
  /** Time off, shaded behind the appointments. */
  blocked: BlockedPeriod[];
  today: string;
  /** Studio-local time of day, for the current-time line. */
  nowMinutes: number;
  clients: KnownClient[];
  /** Set when arriving from a contact's Book button: opens the form filled in. */
  prefillClient?: KnownClient | null;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState<{
    date: string;
    time: string;
    client?: KnownClient | null;
  } | null>(
    prefillClient
      ? {
          date: today,
          time: formatTime24(DEFAULT_START),
          client: prefillClient,
        }
      : null,
  );

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

  const blockedByDate = useMemo(() => {
    const map = new Map<string, BlockedPeriod[]>();
    for (const period of blocked) {
      const list = map.get(period.date);
      if (list) list.push(period);
      else map.set(period.date, [period]);
    }
    return map;
  }, [blocked]);

  const anyDialogOpen = Boolean(selected || creating);

  // Close whichever panel is open on Escape, and stop the page behind it
  // from scrolling.
  useEffect(() => {
    if (!anyDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelected(null);
      setCreating(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [anyDialogOpen]);

  const onDate = (date: string) => byDate.get(date) ?? [];
  const onBlocked = (date: string) => blockedByDate.get(date) ?? [];

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
        <h2 className={styles.title} aria-live="polite">
          {title}
        </h2>

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

        <div className={styles.toolbarRight}>
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
          </div>

          <button
            type="button"
            className={styles.addBtn}
            onClick={() =>
              setCreating({
                date: view === "month" ? today : cursor,
                time: formatTime24(DEFAULT_START),
              })
            }
          >
            + Add Appointment
          </button>
        </div>
      </header>

      {view === "month" ? (
        <MonthGrid
          year={cursorYear}
          month={cursorMonth}
          today={today}
          onDate={onDate}
          onBlocked={onBlocked}
          openDay={openDay}
          onSelect={setSelected}
          onCreate={(date) =>
            setCreating({ date, time: formatTime24(DEFAULT_START) })
          }
          selectedDate={creating?.date ?? null}
        />
      ) : (
        <TimeGrid
          days={days}
          today={today}
          nowMinutes={nowMinutes}
          onDate={onDate}
          onBlocked={onBlocked}
          openDay={openDay}
          onSelect={setSelected}
          onCreate={(date, minutes) =>
            setCreating({ date, time: formatTime24(minutes) })
          }
          singleDay={view === "day"}
          ghost={
            creating
              ? { date: creating.date, minutes: parseTime(creating.time) }
              : null
          }
        />
      )}

      <p className={styles.gestureHint}>
        Double click or press and hold anywhere on the calendar to add an
        appointment at that time.
      </p>

      {selected && (
        <BookingDialog booking={selected} onClose={() => setSelected(null)} />
      )}

      {creating && (
        <CreateDialog
          date={creating.date}
          time={creating.time}
          today={today}
          clients={clients}
          prefill={creating.client ?? null}
          onClose={() => setCreating(null)}
        />
      )}
    </section>
  );
}

/* ── New appointment ───────────────────────────────────── */

function CreateDialog({
  date,
  time,
  today,
  clients,
  prefill,
  onClose,
}: {
  date: string;
  time: string;
  today: string;
  clients: KnownClient[];
  prefill: KnownClient | null;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="New appointment"
      onClick={onClose}
    >
      <div className={styles.createDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>New appointment</p>
            <span className={styles.dialogWhen}>
              {formatDateLong(date)} at {formatTime12(parseTime(time))}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.createBody}>
          <p className={styles.createHint}>
            Date and time are filled from the spot you picked. Change them here
            if you need to.
          </p>
          <AddBookingForm
            today={today}
            clients={clients}
            prefill={prefill}
            defaultDate={date}
            defaultTime={time}
          />
        </div>
      </div>
    </div>
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
  const [rescheduling, setRescheduling] = useState(false);
  const [state, action, pending] = useActionState<RescheduleState, FormData>(
    rescheduleAppointment,
    {},
  );

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
            <span className={styles.detailValue}>{booking.service_name}</span>
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

          {rescheduling && (
            <form action={action} className={styles.rescheduleForm}>
              <input type="hidden" name="id" value={booking.id} />
              {state.error && (
                <div className="notice notice-error" role="alert">
                  {state.error}
                </div>
              )}
              {state.moved && (
                <div className="notice notice-success" role="status">
                  {state.moved}
                </div>
              )}
              <div className={styles.rescheduleRow}>
                <label className="field">
                  <span className="label">New date</span>
                  <input
                    className="input"
                    type="date"
                    name="date"
                    defaultValue={booking.date}
                    required
                  />
                </label>
                <label className="field">
                  <span className="label">New start time</span>
                  <input
                    className="input"
                    type="time"
                    name="time"
                    defaultValue={formatTime24(booking.start_minutes)}
                    required
                  />
                </label>
              </div>
              <p className={styles.createHint}>
                Keeps the same service and length, so only the start moves.
              </p>
              <button type="submit" className="btn btn-sm" disabled={pending}>
                {pending ? "Moving…" : "Save New Time"}
              </button>
            </form>
          )}
        </div>

        <div className={styles.dialogActions}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setRescheduling((v) => !v)}
          >
            {rescheduling ? "Cancel reschedule" : "Reschedule"}
          </button>
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

/* ── Long press ────────────────────────────────────────── */

/** Fires `onLongPress` if the pointer is held still for long enough. */
function useLongPress(onLongPress: (clientY: number) => void) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      origin.current = { x: e.clientX, y: e.clientY };
      const y = e.clientY;
      timer.current = window.setTimeout(() => onLongPress(y), LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!origin.current) return;
      const moved =
        Math.abs(e.clientX - origin.current.x) > 8 ||
        Math.abs(e.clientY - origin.current.y) > 8;
      if (moved) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}

/* ── Day and week: the hour grid ───────────────────────── */

function TimeGrid({
  days,
  today,
  nowMinutes,
  onDate,
  onBlocked,
  openDay,
  onSelect,
  onCreate,
  singleDay,
  ghost,
}: {
  days: string[];
  today: string;
  nowMinutes: number;
  onDate: (d: string) => Booking[];
  onBlocked: (d: string) => BlockedPeriod[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
  onCreate: (date: string, minutes: number) => void;
  singleDay: boolean;
  /** The spot picked for a new appointment, marked in blue. */
  ghost: { date: string; minutes: number } | null;
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
              className={`${styles.dayHead} ${
                isWeekend(date) ? styles.weekend : ""
              }`}
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
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              today={today}
              nowMinutes={nowMinutes}
              items={onDate(date)}
              blocked={onBlocked(date)}
              onSelect={onSelect}
              onCreate={onCreate}
              singleDay={singleDay}
              ghostMinutes={ghost && ghost.date === date ? ghost.minutes : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  date,
  today,
  nowMinutes,
  items,
  blocked,
  onSelect,
  onCreate,
  singleDay,
  ghostMinutes,
}: {
  date: string;
  today: string;
  nowMinutes: number;
  items: Booking[];
  blocked: BlockedPeriod[];
  onSelect: (b: Booking) => void;
  onCreate: (date: string, minutes: number) => void;
  singleDay: boolean;
  ghostMinutes: number | null;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const { placement, laneCount } = assignLanes(items);

  const createAt = (clientY: number) => {
    if (!columnRef.current) return;
    onCreate(date, timeAtPointer(clientY, columnRef.current));
  };

  const longPress = useLongPress(createAt);

  return (
    <div
      ref={columnRef}
      className={`${styles.col} ${isWeekend(date) ? styles.weekend : ""}`}
      onDoubleClick={(e) => createAt(e.clientY)}
      {...longPress}
    >
      {HOUR_MARKS.slice(0, -1).map((minutes) => (
        <span
          key={minutes}
          className={styles.hourLine}
          style={{ height: HOUR_HEIGHT }}
        />
      ))}

      {blocked.map((period) => {
        // A whole day off has no hours of its own, so it fills the grid.
        const from = Math.max(period.start_minutes ?? GRID_START, GRID_START);
        const to = Math.min(period.end_minutes ?? GRID_END, GRID_END);
        if (to <= from) return null;
        return (
          <span
            key={period.id}
            className={styles.blocked}
            style={{
              top: ((from - GRID_START) / 60) * HOUR_HEIGHT,
              height: ((to - from) / 60) * HOUR_HEIGHT,
            }}
            aria-hidden
          >
            <span className={styles.blockedLabel}>
              {period.reason || "Time off"}
            </span>
          </span>
        );
      })}

      {items.map((booking) => {
        const lane = placement.get(booking.id) ?? 0;
        const top = ((booking.start_minutes - GRID_START) / 60) * HOUR_HEIGHT;
        const height = Math.max(
          22,
          (booking.duration_minutes / 60) * HOUR_HEIGHT - 2,
        );
        return (
          <button
            key={booking.id}
            type="button"
            className={`${styles.event} ${styles[`event_${booking.status}`]} ${
              height < 40 ? styles.eventShort : ""
            }`}
            style={{
              top,
              height,
              left: `calc(${(lane / laneCount) * 100}% + 2px)`,
              width: `calc(${100 / laneCount}% - 4px)`,
            }}
            // Keep the create gestures from firing on an existing appointment.
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={() => onSelect(booking)}
          >
            <span className={styles.eventTime}>
              {formatTime12(booking.start_minutes)}
            </span>
            <span className={styles.eventName}>{booking.client_name}</span>
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

      {ghostMinutes !== null && (
        <span
          className={styles.ghost}
          style={{
            top: ((ghostMinutes - GRID_START) / 60) * HOUR_HEIGHT,
            height: HOUR_HEIGHT,
          }}
          aria-hidden
        >
          <span className={styles.ghostLabel}>
            {formatTime12(ghostMinutes)}
          </span>
        </span>
      )}

      {date === today &&
        nowMinutes >= GRID_START &&
        nowMinutes <= GRID_END && (
          <span
            className={styles.nowLine}
            style={{ top: ((nowMinutes - GRID_START) / 60) * HOUR_HEIGHT }}
            aria-hidden
          />
        )}
    </div>
  );
}

/* ── Month ─────────────────────────────────────────────── */

function MonthGrid({
  year,
  month,
  today,
  onDate,
  onBlocked,
  openDay,
  onSelect,
  onCreate,
  selectedDate,
}: {
  year: number;
  month: number;
  today: string;
  onDate: (d: string) => Booking[];
  onBlocked: (d: string) => BlockedPeriod[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
  onCreate: (date: string) => void;
  /** The day picked for a new appointment, marked in blue. */
  selectedDate: string | null;
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
        {cells.map((date) => (
          <MonthCell
            key={date}
            date={date}
            today={today}
            inMonth={Number(date.slice(5, 7)) === month}
            items={onDate(date)}
            blocked={onBlocked(date)}
            openDay={openDay}
            onSelect={onSelect}
            onCreate={onCreate}
            selected={date === selectedDate}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCell({
  date,
  today,
  inMonth,
  items,
  blocked,
  openDay,
  onSelect,
  onCreate,
  selected,
}: {
  date: string;
  today: string;
  inMonth: boolean;
  items: Booking[];
  blocked: BlockedPeriod[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
  onCreate: (date: string) => void;
  selected: boolean;
}) {
  const longPress = useLongPress(() => onCreate(date));

  return (
    <div
      className={`${styles.monthCell} ${!inMonth ? styles.monthCellOutside : ""} ${
        isWeekend(date) ? styles.weekend : ""
      } ${selected ? styles.monthCellSelected : ""}`}
      onDoubleClick={() => onCreate(date)}
      {...longPress}
    >
      <button
        type="button"
        className={`${styles.monthNum} ${
          date === today ? styles.monthNumToday : ""
        }`}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onClick={() => openDay(date)}
        aria-label={`Open ${date}`}
      >
        {Number(date.slice(-2))}
      </button>
      <span className={styles.monthEvents}>
        {blocked.map((period) => (
          <span key={period.id} className={styles.monthBlocked}>
            <span className={styles.monthBlockedText}>
              {period.start_minutes === null
                ? period.reason || "Time off"
                : `${formatTime12(period.start_minutes).replace(":00", "")} ${
                    period.reason || "Time off"
                  }`}
            </span>
          </span>
        ))}
        {items.slice(0, 3).map((booking) => (
          <button
            key={booking.id}
            type="button"
            className={`${styles.pill} ${styles[`pill_${booking.status}`]}`}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={() => onSelect(booking)}
          >
            <span className={styles.pillDot} aria-hidden />
            <span className={styles.pillTime}>
              {formatTime12(booking.start_minutes).replace(":00", "")}
            </span>
            <span className={styles.pillName}>{booking.client_name}</span>
          </button>
        ))}
        {items.length > 3 && (
          <span className={styles.more}>{items.length - 3} more</span>
        )}
      </span>
    </div>
  );
}
