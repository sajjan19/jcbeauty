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
}: {
  today: string;
  clients: KnownClient[];
}) {
  const [state, action, pending] = useActionState<AddBookingState, FormData>(
    addBooking,
    {},
  );

  // Controlled so picking a past client can fill them in.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [picked, setPicked] = useState("");

  function choose(value: string) {
    setPicked(value);
    const client = clients.find((c) => c.email === value);
    setName(client ? client.name : "");
    setEmail(client ? client.email : "");
    setPhone(client ? client.phone : "");
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

      {clients.length > 0 && (
        <label className={`field ${styles.clientPicker}`}>
          <span className="label">Returning client</span>
          <select
            className="select"
            value={picked}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">Someone new</option>
            {clients.map((c) => (
              <option key={c.email} value={c.email}>
                {c.name} ({c.phone || c.email})
              </option>
            ))}
          </select>
          <span className="hint">
            Picking someone fills in their details below.
          </span>
        </label>
      )}

      <div className={styles.addGrid}>
        <label className="field">
          <span className="label">Client name</span>
          <input
            className="input"
            name="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            defaultValue={today}
            required
          />
        </label>

        <label className="field">
          <span className="label">Start time</span>
          <input className="input" type="time" name="time" required />
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
