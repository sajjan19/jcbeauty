"use client";

import { useActionState, useEffect, useState } from "react";
import type { Booking } from "@/lib/bookings";
import { formatDateLong, formatTime12, formatTime24 } from "@/lib/time";
import { editAppointment, type EditBookingState } from "./actions";
import styles from "./page.module.css";

/**
 * The editable part of an appointment. Shared by the pop-up below and the
 * calendar's detail dialog, so both offer the same fields.
 */
export function EditBookingFields({ booking }: { booking: Booking }) {
  return (
    <>
      <input type="hidden" name="id" value={booking.id} />
      <div className={styles.editRow}>
        <label className="field">
          <span className="label">Date</span>
          <input
            className="input"
            type="date"
            name="date"
            defaultValue={booking.date}
            required
          />
        </label>
        <label className="field">
          <span className="label">Start time</span>
          <input
            className="input"
            type="time"
            name="time"
            defaultValue={formatTime24(booking.start_minutes)}
            required
          />
        </label>
        <label className="field">
          <span className="label">Length (min)</span>
          <input
            className="input"
            type="number"
            name="duration"
            min={5}
            max={480}
            step={5}
            defaultValue={booking.duration_minutes}
            required
          />
        </label>
        <label className="field">
          <span className="label">Price ($)</span>
          <input
            className="input"
            type="number"
            name="price"
            min={0}
            step={1}
            defaultValue={booking.price}
            required
          />
        </label>
      </div>
      <label className="field">
        <span className="label">Notes</span>
        <textarea
          className="textarea"
          name="notes"
          defaultValue={booking.notes ?? ""}
          maxLength={1000}
          placeholder="Anything to remember about this appointment…"
        />
      </label>
    </>
  );
}

/**
 * Edits an appointment from a list. The card is a narrow column of buttons,
 * so the form opens in a pop-up rather than squeezing in beside them.
 */
export function EditBookingButton({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
      {open && (
        <EditBookingDialog booking={booking} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function EditBookingDialog({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<EditBookingState, FormData>(
    editAppointment,
    {},
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
      aria-label={`Edit ${booking.client_name}'s appointment`}
      onClick={onClose}
    >
      <div
        className={styles.contactDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>Edit appointment</p>
            <span className={styles.dialogSub}>
              {booking.client_name} · {formatDateLong(booking.date)} at{" "}
              {formatTime12(booking.start_minutes)}
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

            <p className={styles.blockHint}>
              Keeps the same service. Give a client more or less time than
              usual by changing the length, and the finish time follows.
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
                {pending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
