"use client";

import { useActionState } from "react";
import { addClient, type AddClientState } from "./actions";
import styles from "./page.module.css";

/** Saves someone to the address book before they've booked anything. */
export function AddClientForm() {
  const [state, action, pending] = useActionState<AddClientState, FormData>(
    addClient,
    {},
  );

  return (
    <form action={action} className={styles.addForm}>
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

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Saving…" : "Add Contact"}
      </button>
    </form>
  );
}
