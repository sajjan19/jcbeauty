"use client";

import { useActionState, useState } from "react";
import { services } from "@/lib/content";
import { addBooking, type AddBookingState } from "./actions";
import styles from "./page.module.css";

export type KnownClient = { name: string; email: string; phone: string };

/**
 * For appointments she takes by DM, phone or in person. Looser than the
 * client-facing flow: any date and time is allowed, so long as it doesn't
 * overlap something already booked.
 */
export function AddBookingForm({
  today,
  clients,
  prefill,
  defaultDate,
  defaultTime,
}: {
  today: string;
  clients: KnownClient[];
  /** Set when arriving from a contact's Book button. */
  prefill?: KnownClient | null;
  /** Set when the form opens from a spot on the calendar. */
  defaultDate?: string;
  defaultTime?: string;
}) {
  const [state, action, pending] = useActionState<AddBookingState, FormData>(
    addBooking,
    {},
  );

  // Controlled so a suggestion can fill all three at once.
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Match on name, phone or email, so typing a number finds them too.
  const query = name.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const matches =
    query.length < 2
      ? []
      : clients
          .filter((c) => {
            const byName = c.name.toLowerCase().includes(query);
            const byEmail = c.email.toLowerCase().includes(query);
            const byPhone =
              digits.length >= 2 && c.phone.replace(/\D/g, "").includes(digits);
            return byName || byEmail || byPhone;
          })
          .slice(0, 6);

  function pick(client: KnownClient) {
    setName(client.name);
    setEmail(client.email);
    setPhone(client.phone);
    setShowSuggestions(false);
  }

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
        <label className={`field ${styles.suggestField}`}>
          <span className="label">Client name or number</span>
          <input
            className="input"
            name="name"
            required
            maxLength={100}
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            // Delayed so a click on a suggestion registers first.
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false);
            }}
          />
          {showSuggestions && matches.length > 0 && (
            <ul className={styles.suggestList}>
              {matches.map((client) => (
                <li key={client.email || client.phone}>
                  <button
                    type="button"
                    className={styles.suggestItem}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(client)}
                  >
                    <span className={styles.suggestName}>{client.name}</span>
                    <span className={styles.suggestMeta}>
                      {[client.phone, client.email].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        <label className="field">
          <span className="label">Service</span>
          <select
            className="select"
            name="service"
            defaultValue={services[0].slug}
          >
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} (${s.price})
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Date</span>
          <input
            className="input"
            type="date"
            name="date"
            defaultValue={defaultDate ?? today}
            required
          />
        </label>

        <label className="field">
          <span className="label">Start time</span>
          <input
            className="input"
            type="time"
            name="time"
            defaultValue={defaultTime}
            required
          />
        </label>

        <label className="field">
          <span className="label">Phone</span>
          <input
            className="input"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Status</span>
          <select className="select" name="status" defaultValue="confirmed">
            <option value="confirmed">Confirmed</option>
            <option value="pending">Awaiting confirmation</option>
          </select>
        </label>

        <label className="field">
          <span className="label">Notes (optional)</span>
          <input className="input" name="notes" maxLength={1000} />
        </label>
      </div>

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Adding…" : "Add Appointment"}
      </button>
    </form>
  );
}
