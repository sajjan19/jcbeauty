"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { CancelBookingButton } from "./cancel-button";
import { EditBookingFields } from "./edit-booking-form";
import {
  editAppointment,
  moveAppointment,
  updateBookingStatus,
  type EditBookingState,
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
 * The hours the grid shows by default: her opening hours with an hour of
 * padding either side, so it isn't mostly empty space.
 */
const openDays = Object.values(businessHours).filter(Boolean) as {
  open: string;
  close: string;
}[];
const BASE_START = Math.max(
  0,
  Math.min(...openDays.map((h) => parseTime(h.open))) - 60,
);
const BASE_END = Math.min(
  24 * 60,
  Math.max(...openDays.map((h) => parseTime(h.close))) + 60,
);

/**
 * She can book outside opening hours by hand, so the grid stretches to take
 * in anything on the days being shown. Without this an early or late
 * appointment would sit off the top or bottom of the column and simply not
 * be there when she looked.
 */
function gridRangeFor(
  days: string[],
  bookingsOn: (d: string) => Booking[],
  blockedOn: (d: string) => BlockedPeriod[],
): { start: number; end: number } {
  let start = BASE_START;
  let end = BASE_END;

  for (const date of days) {
    for (const booking of bookingsOn(date)) {
      start = Math.min(start, booking.start_minutes);
      end = Math.max(end, booking.end_minutes);
    }
    for (const period of blockedOn(date)) {
      if (period.start_minutes !== null) {
        start = Math.min(start, period.start_minutes);
      }
      if (period.end_minutes !== null) {
        end = Math.max(end, period.end_minutes);
      }
    }
  }

  // Whole hours, so the gutter labels stay on the hour.
  return {
    start: Math.max(0, Math.floor(start / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
  };
}

function hourMarksFor(start: number, end: number): number[] {
  return Array.from(
    { length: Math.ceil((end - start) / 60) + 1 },
    (_, i) => start + i * 60,
  );
}

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

/**
 * Splits her note into bullet points. One per line is what the notes box
 * asks for, but older notes are a paragraph, so those fall back to splitting
 * on sentences rather than showing one long bullet.
 */
function notePoints(note: string): string[] {
  const lines = note
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) return lines;

  return (
    note
      .split(/(?<=\.)\s+/)
      .map((part) => part.trim())
      .filter(Boolean) || [note]
  );
}

/** Turns a pointer position inside a day column into a snapped start time. */
function timeAtPointer(
  clientY: number,
  element: HTMLElement,
  gridStart: number,
  gridEnd: number,
): number {
  const rect = element.getBoundingClientRect();
  const raw = gridStart + ((clientY - rect.top) / HOUR_HEIGHT) * 60;
  const step = scheduling.slotIntervalMinutes;
  const snapped = Math.round(raw / step) * step;
  return Math.min(Math.max(snapped, gridStart), gridEnd - step);
}

export function AdminCalendar({
  bookings,
  blocked,
  today,
  nowMinutes,
  clients,
  clientNotes,
  prefillClient,
}: {
  bookings: Booking[];
  /** Time off, shaded behind the appointments. */
  blocked: BlockedPeriod[];
  today: string;
  /** Studio-local time of day, for the current-time line. */
  nowMinutes: number;
  clients: KnownClient[];
  /** Her notes about each client, keyed by lowercased email. */
  clientNotes: Record<string, string>;
  /** Set when arriving from a contact's Book button: opens the form filled in. */
  prefillClient?: KnownClient | null;
}) {
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, startMove] = useTransition();
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

  /*
   * Dropping an appointment somewhere new. The move can be refused — it
   * might land on top of something — so say why rather than letting the
   * appointment silently spring back to where it was.
   */
  function handleDrop(booking: Booking, date: string, minutes: number) {
    setMoveError(null);
    startMove(async () => {
      try {
        const result = await moveAppointment(
          booking.id,
          date,
          formatTime24(minutes),
        );
        if (!result.ok) setMoveError(result.error ?? "That move didn't work.");
      } catch {
        // A signed-out session or a dropped connection throws rather than
        // returning. Say so in place, instead of taking the page down.
        setMoveError(
          "Couldn't move that appointment. Check you're still signed in, then try again.",
        );
      }
    });
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

  // Widens past opening hours when something is booked outside them.
  const { start: gridStart, end: gridEnd } = gridRangeFor(
    days,
    onDate,
    onBlocked,
  );

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
          gridStart={gridStart}
          gridEnd={gridEnd}
          onDate={onDate}
          onBlocked={onBlocked}
          openDay={openDay}
          onSelect={setSelected}
          onCreate={(date, minutes) =>
            setCreating({ date, time: formatTime24(minutes) })
          }
          singleDay={view === "day"}
          onDrop={handleDrop}
          ghost={
            creating
              ? { date: creating.date, minutes: parseTime(creating.time) }
              : null
          }
        />
      )}

      {moveError && (
        <p className={styles.moveError} role="alert">
          {moveError}
        </p>
      )}

      <p className={styles.gestureHint}>
        Drag an appointment to move it{moving ? ", saving…" : ""}. Double click
        or press and hold anywhere on the calendar to add an appointment at
        that time.
      </p>

      {selected && (
        <BookingDialog
          booking={selected}
          clientNote={clientNotes[selected.email.toLowerCase()] ?? null}
          onClose={() => setSelected(null)}
        />
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
  clientNote,
  onClose,
}: {
  booking: Booking;
  /** Her own note about this client, if she's written one. */
  clientNote: string | null;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<EditBookingState, FormData>(
    editAppointment,
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
              <span className={styles.detailLabel}>Their note</span>
              <span className={`${styles.detailValue} ${styles.detailNotes}`}>
                {booking.notes}
              </span>
            </div>
          )}

          {booking.status === "cancelled" && booking.cancel_reason && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Cancelled</span>
              <span className={styles.detailValue}>
                {booking.cancel_reason}
              </span>
            </div>
          )}

          {/* What she's written about this client, which is where the useful
              detail lives after a few visits. Bulleted so there's no mistaking
              it for what the client wrote. */}
          {clientNote && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Your note</span>
              <ul className={styles.ownNotes}>
                {notePoints(clientNote).map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {editing && (
            <form action={action} className={styles.rescheduleForm}>
              {state.error && (
                <div className="notice notice-error" role="alert">
                  {state.error}
                </div>
              )}
              {state.saved && (
                <div className="notice notice-success" role="status">
                  {state.saved}
                </div>
              )}
              <EditBookingFields booking={booking} />
              <p className={styles.createHint}>
                Keeps the same service. Give a client more or less time than
                usual by changing the length, and the finish time follows.
              </p>
              <button type="submit" className="btn btn-sm" disabled={pending}>
                {pending ? "Saving…" : "Save Changes"}
              </button>
            </form>
          )}
        </div>

        <div className={styles.dialogActions}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Cancel edit" : "Edit"}
          </button>
          {booking.status !== "confirmed" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="confirmed" />
              <button
                type="submit"
                className="btn btn-success btn-sm"
                onClick={onClose}
              >
                Confirm
              </button>
            </form>
          )}
          {booking.status !== "cancelled" && (
            <CancelBookingButton
              id={booking.id}
              clientName={booking.client_name}
              onDone={onClose}
            />
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
  gridStart,
  gridEnd,
  onDate,
  onBlocked,
  openDay,
  onSelect,
  onCreate,
  singleDay,
  ghost,
  onDrop,
}: {
  days: string[];
  today: string;
  nowMinutes: number;
  gridStart: number;
  gridEnd: number;
  onDate: (d: string) => Booking[];
  onBlocked: (d: string) => BlockedPeriod[];
  openDay: (d: string) => void;
  onSelect: (b: Booking) => void;
  onCreate: (date: string, minutes: number) => void;
  singleDay: boolean;
  /** The spot picked for a new appointment, marked in blue. */
  ghost: { date: string; minutes: number } | null;
  onDrop: (booking: Booking, date: string, minutes: number) => void;
}) {
  const hourMarks = hourMarksFor(gridStart, gridEnd);
  const colsRef = useRef<HTMLDivElement>(null);

  // Where the dragged appointment currently sits, for the preview block.
  const [drag, setDrag] = useState<{
    booking: Booking;
    date: string;
    minutes: number;
  } | null>(null);

  // The pointer gesture itself. A ref rather than state: it changes on every
  // move and nothing renders from it directly.
  const gesture = useRef<{
    booking: Booking;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  // Kept in a ref so the pointerup handler reads the latest landing spot
  // rather than the one captured when the listener was attached. Written in
  // an effect, since refs mustn't be touched during render.
  const latest = useRef<typeof drag>(null);
  useEffect(() => {
    latest.current = drag;
  }, [drag]);

  /** Which day column and which minute the pointer is over. */
  const slotAt = (clientX: number, clientY: number) => {
    const el = colsRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const columnWidth = rect.width / days.length;
    const index = Math.min(
      days.length - 1,
      Math.max(0, Math.floor((clientX - rect.left) / columnWidth)),
    );

    const step = scheduling.slotIntervalMinutes;
    const raw = gridStart + ((clientY - rect.top) / HOUR_HEIGHT) * 60;
    const snapped = Math.round(raw / step) * step;

    return {
      date: days[index],
      minutes: Math.min(Math.max(snapped, gridStart), gridEnd - step),
    };
  };

  /* Dragging is tracked on the window, so the pointer can leave the column
     it started in — which is the whole point when moving to another day. */
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const g = gesture.current;
      if (!g) return;

      if (!g.moved) {
        const far =
          Math.abs(e.clientX - g.startX) > 5 || Math.abs(e.clientY - g.startY) > 5;
        if (!far) return;
        g.moved = true;
      }

      const slot = slotAt(e.clientX, e.clientY);
      if (slot) setDrag({ booking: g.booking, ...slot });
    }

    function onPointerUp() {
      const g = gesture.current;
      const landed = latest.current;
      gesture.current = null;
      setDrag(null);

      if (!g?.moved || !landed) return;

      const unchanged =
        landed.date === g.booking.date &&
        landed.minutes === g.booking.start_minutes;
      if (!unchanged) onDrop(g.booking, landed.date, landed.minutes);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  });

  const beginDrag = (booking: Booking, e: React.PointerEvent) => {
    gesture.current = {
      booking,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  /** True once the pointer has actually moved, so the drop isn't read as a click. */
  const didDrag = () => Boolean(gesture.current?.moved);
  const bodyHeight = ((gridEnd - gridStart) / 60) * HOUR_HEIGHT;

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
          {hourMarks.slice(0, -1).map((minutes) => (
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
          ref={colsRef}
          className={styles.cols}
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
          {days.map((date) => (
            <DayColumn
              key={date}
              date={date}
              today={today}
              nowMinutes={nowMinutes}
              gridStart={gridStart}
              gridEnd={gridEnd}
              hourMarks={hourMarks}
              items={onDate(date)}
              blocked={onBlocked(date)}
              dragging={drag?.booking.id ?? null}
              dropMinutes={drag && drag.date === date ? drag.minutes : null}
              dropDuration={drag?.booking.duration_minutes ?? 0}
              onDragStart={beginDrag}
              didDrag={didDrag}
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
  gridStart,
  gridEnd,
  hourMarks,
  items,
  blocked,
  dragging,
  dropMinutes,
  dropDuration,
  onDragStart,
  didDrag,
  onSelect,
  onCreate,
  singleDay,
  ghostMinutes,
}: {
  date: string;
  today: string;
  nowMinutes: number;
  gridStart: number;
  gridEnd: number;
  hourMarks: number[];
  items: Booking[];
  blocked: BlockedPeriod[];
  /** Id of the appointment being dragged, wherever it currently is. */
  dragging: number | null;
  /** Where it would land on this day, if it's over this column. */
  dropMinutes: number | null;
  dropDuration: number;
  onDragStart: (booking: Booking, e: React.PointerEvent) => void;
  didDrag: () => boolean;
  onSelect: (b: Booking) => void;
  onCreate: (date: string, minutes: number) => void;
  singleDay: boolean;
  ghostMinutes: number | null;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const { placement, laneCount } = assignLanes(items);

  const createAt = (clientY: number) => {
    if (!columnRef.current) return;
    onCreate(date, timeAtPointer(clientY, columnRef.current, gridStart, gridEnd));
  };

  const longPress = useLongPress(createAt);

  return (
    <div
      ref={columnRef}
      className={`${styles.col} ${isWeekend(date) ? styles.weekend : ""}`}
      onDoubleClick={(e) => createAt(e.clientY)}
      {...longPress}
    >
      {hourMarks.slice(0, -1).map((minutes) => (
        <span
          key={minutes}
          className={styles.hourLine}
          style={{ height: HOUR_HEIGHT }}
        />
      ))}

      {blocked.map((period) => {
        // A whole day off has no hours of its own, so it fills the grid.
        const from = Math.max(period.start_minutes ?? gridStart, gridStart);
        const to = Math.min(period.end_minutes ?? gridEnd, gridEnd);
        if (to <= from) return null;
        return (
          <span
            key={period.id}
            className={styles.blocked}
            style={{
              top: ((from - gridStart) / 60) * HOUR_HEIGHT,
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
        const top = ((booking.start_minutes - gridStart) / 60) * HOUR_HEIGHT;
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
            } ${dragging === booking.id ? styles.eventDragging : ""}`}
            style={{
              top,
              height,
              left: `calc(${(lane / laneCount) * 100}% + 2px)`,
              width: `calc(${100 / laneCount}% - 4px)`,
            }}
            // Keep the create gestures from firing on an existing appointment,
            // and start a drag from here instead.
            onPointerDown={(e) => {
              e.stopPropagation();
              onDragStart(booking, e);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            // A drop isn't a click: without this, moving one would also open it.
            onClick={() => {
              if (!didDrag()) onSelect(booking);
            }}
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

      {/* Where the dragged appointment would land. */}
      {dropMinutes !== null && (
        <span
          className={styles.dropPreview}
          style={{
            top: ((dropMinutes - gridStart) / 60) * HOUR_HEIGHT,
            height: Math.max(22, (dropDuration / 60) * HOUR_HEIGHT - 2),
          }}
          aria-hidden
        >
          <span className={styles.dropLabel}>{formatTime12(dropMinutes)}</span>
        </span>
      )}

      {ghostMinutes !== null && (
        <span
          className={styles.ghost}
          style={{
            top: ((ghostMinutes - gridStart) / 60) * HOUR_HEIGHT,
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
        nowMinutes >= gridStart &&
        nowMinutes <= gridEnd && (
          <span
            className={styles.nowLine}
            style={{ top: ((nowMinutes - gridStart) / 60) * HOUR_HEIGHT }}
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
