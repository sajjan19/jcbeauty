"use client";

import { useActionState, useEffect, useState } from "react";
import { addClient, type AddClientState } from "./actions";
import styles from "./page.module.css";

/**
 * Saves someone to the address book before they've booked anything.
 *
 * The form lives in a pop-up so it isn't sitting above the contact list
 * taking up room when it isn't being used.
 */
export function AddClientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => setOpen(true)}
      >
        Add Contact
      </button>
      {open && <AddClientDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddClientDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<AddClientState, FormData>(
    addClient,
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
      aria-label="Add a contact"
      onClick={onClose}
    >
      <div
        className={styles.contactDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>Add a contact</p>
            <span className={styles.dialogSub}>
              For someone who hasn&apos;t booked through the website.
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
            {state.added && (
              <div className="notice notice-success" role="status">
                {state.added}
              </div>
            )}

            <div className={styles.addGrid}>
              <label className="field">
                <span className="label">Name</span>
                <input className="input" name="name" required maxLength={100} />
              </label>
              <label className="field">
                <span className="label">Phone</span>
                <input className="input" name="phone" type="tel" />
              </label>
              <label className="field">
                <span className="label">Email</span>
                <input className="input" name="email" type="email" />
              </label>
              <label className="field">
                <span className="label">Notes (optional)</span>
                <input className="input" name="notes" maxLength={500} />
              </label>
            </div>

            <div className={styles.dialogFoot}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
              >
                Close
              </button>
              <button type="submit" className="btn" disabled={pending}>
                {pending ? "Saving…" : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
