"use client";

import { useActionState, useEffect, useState } from "react";
import type { BlockedPeriod } from "@/lib/bookings";
import { formatTime24 } from "@/lib/time";
import { blockTime, editBlockedTime, type BlockTimeState } from "./actions";
import styles from "./page.module.css";

/**
 * Books time off. The form lives in a pop-up so the list of time already
 * blocked is what you see when you open the tab.
 */
export function BlockTimeButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        Block Time
      </button>
      {open && (
        <BlockTimeDialog
          today={today}
          entry={null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Reopens the same pop-up filled in, to fix a day or time entered wrong. */
export function EditBlockTimeButton({ entry }: { entry: BlockedPeriod }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(true)}
        aria-label={`Edit the time blocked on ${entry.date}`}
      >
        Edit
      </button>
      {open && (
        <BlockTimeDialog
          today={null}
          entry={entry}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function BlockTimeDialog({
  today,
  entry,
  onClose,
}: {
  /** Earliest date that can be picked. Null when editing, so a block that has
      already started can still be corrected. */
  today: string | null;
  entry: BlockedPeriod | null;
  onClose: () => void;
}) {
  const editing = entry !== null;
  const [state, action, pending] = useActionState<BlockTimeState, FormData>(
    editing ? editBlockedTime : blockTime,
    {},
  );
  // Whole day is the common case, so the hours only appear when they matter.
  const [mode, setMode] = useState(
    entry && entry.start_minutes !== null ? "time" : "day",
  );

  // Close on Escape, and stop the page behind the pop-up scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit time off" : "Block time off"}
      onClick={onClose}
    >
      <div
        className={styles.contactDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>
              {editing ? "Edit time off" : "Block time off"}
            </p>
            <span className={styles.dialogSub}>
              {editing
                ? "Change the day or the hours."
                : "A whole day, part of one, or a run of days."}
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

        <div className={styles.dialogBody}>
          <form action={action}>
            {entry && <input type="hidden" name="id" value={entry.id} />}

            {state.error && (
              <div className="notice notice-error" role="alert">
                {state.error}
              </div>
            )}
            {state.done && (
              <div className="notice notice-success" role="status">
                {state.done}
              </div>
            )}

            <div className={styles.addGrid}>
              <label className="field">
                <span className="label">Date</span>
                <input
                  className="input"
                  type="date"
                  name="date"
                  min={today ?? undefined}
                  defaultValue={entry?.date}
                  required
                />
              </label>
              {!editing && (
                <label className="field">
                  <span className="label">To (optional)</span>
                  <input
                    className="input"
                    type="date"
                    name="until"
                    min={today ?? undefined}
                  />
                </label>
              )}
              <label className="field">
                <span className="label">Block</span>
                <select
                  className="select"
                  name="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="day">The whole day</option>
                  <option value="time">Just these hours</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Reason (optional)</span>
                <input
                  className="input"
                  name="reason"
                  placeholder="Holiday, school run…"
                  defaultValue={entry?.reason ?? ""}
                  maxLength={120}
                />
              </label>
              {mode === "time" && (
                <>
                  <label className="field">
                    <span className="label">From</span>
                    <input
                      className="input"
                      type="time"
                      name="from"
                      defaultValue={
                        entry?.start_minutes != null
                          ? formatTime24(entry.start_minutes)
                          : ""
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="label">To</span>
                    <input
                      className="input"
                      type="time"
                      name="to"
                      defaultValue={
                        entry?.end_minutes != null
                          ? formatTime24(entry.end_minutes)
                          : ""
                      }
                      required
                    />
                  </label>
                </>
              )}
            </div>

            <p className={styles.blockHint}>
              {editing
                ? "A run of days is stored a day at a time, so this changes only this one."
                : "Add a To date to block a run of days, such as a holiday."}{" "}
              Appointments already booked are not cancelled, so handle those
              from the Upcoming tab.
            </p>

            <div className={styles.dialogFoot}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
              >
                Close
              </button>
              <button type="submit" className="btn" disabled={pending}>
                {pending
                  ? editing
                    ? "Saving…"
                    : "Blocking…"
                  : editing
                    ? "Save Changes"
                    : "Block Time"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
