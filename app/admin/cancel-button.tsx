"use client";

import { useState } from "react";
import { updateBookingStatus } from "./actions";
import styles from "./page.module.css";

/**
 * Cancelling asks first. It's the one action here that a client feels, and
 * it sits next to buttons that are safe to press, so a slip is easy.
 */
export function CancelBookingButton({
  id,
  clientName,
  onDone,
}: {
  id: number;
  clientName: string;
  /** Closes the dialog this sits in, once the cancellation is submitted. */
  onDone?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={() => setConfirming(true)}
      >
        Cancel appointment
      </button>
    );
  }

  return (
    <span className={styles.confirmCancel}>
      <span className={styles.confirmCancelText}>
        Cancel {clientName}&apos;s appointment? They aren&apos;t told
        automatically, so let them know.
      </span>
      <span className={styles.confirmCancelActions}>
        <form action={updateBookingStatus}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="cancelled" />
          <button
            type="submit"
            className="btn btn-danger-solid btn-sm"
            onClick={onDone}
          >
            Yes, cancel it
          </button>
        </form>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setConfirming(false)}
        >
          Keep it
        </button>
      </span>
    </span>
  );
}
