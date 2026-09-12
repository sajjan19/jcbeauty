"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatTime12,
} from "@/lib/time";
import {
  removeClient,
  saveClientDetails,
  type SaveClientState,
} from "./actions";
import styles from "./page.module.css";

export type ContactBooking = {
  id: number;
  date: string;
  start_minutes: number;
  duration_minutes: number;
  service_name: string;
  price: number;
  reference: string;
  status: string;
  notes: string | null;
};

export type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  bookings: number;
  visits: number;
  upcoming: number;
  firstVisit: string | null;
  lastVisit: string | null;
  spent: number;
  history: ContactBooking[];
};

export function ContactsList({
  contacts,
  today,
}: {
  contacts: Contact[];
  today: string;
}) {
  const [open, setOpen] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");

  // Close on Escape, and stop the page behind the pop-up scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Matches name, email or phone, so typing digits finds someone by number.
  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const filtered = query
    ? contacts.filter((c) => {
        const byName = c.name.toLowerCase().includes(query);
        const byEmail = c.email.toLowerCase().includes(query);
        const byPhone =
          digits.length >= 2 && c.phone.replace(/\D/g, "").includes(digits);
        return byName || byEmail || byPhone;
      })
    : contacts;

  if (contacts.length === 0) {
    return <p className="muted">No contacts yet.</p>;
  }

  return (
    <>
      <div className={styles.contactSearch}>
        <input
          type="search"
          className="input"
          placeholder="Search by name, phone or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search contacts"
        />
        <span className={styles.contactCount}>
          {query
            ? `${filtered.length} of ${contacts.length}`
            : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="muted">No contacts match “{search.trim()}”.</p>
      )}

      <div className={styles.contactList}>
        {filtered.map((client) => (
          <article key={client.id} className={styles.contact}>
            <div>
              <p className={styles.contactName}>
                <button
                  type="button"
                  className={styles.contactNameBtn}
                  onClick={() => setOpen(client)}
                >
                  {client.name}
                </button>
              </p>
              <span className={styles.contactSince}>
                {client.firstVisit
                  ? `Since ${formatDateShort(client.firstVisit)}`
                  : "No bookings yet"}
              </span>
            </div>

            <div className={styles.contactLinks}>
              {client.email && (
                <a href={`mailto:${client.email}`}>{client.email}</a>
              )}
              {client.phone && <a href={`tel:${client.phone}`}>{client.phone}</a>}
            </div>

            <div className={styles.contactStats}>
              <div className={styles.contactStat}>
                <span className={styles.contactStatValue}>{client.visits}</span>
                <span className={styles.contactStatLabel}>Visits</span>
              </div>
              <div className={styles.contactStat}>
                <span className={styles.contactStatValue}>
                  {client.upcoming}
                </span>
                <span className={styles.contactStatLabel}>Upcoming</span>
              </div>
            </div>

            <div className={styles.contactActions}>
              <Link
                href={`/admin?client=${client.id}`}
                className="btn btn-outline btn-sm"
              >
                Book
              </Link>
              <form action={removeClient}>
                <input type="hidden" name="id" value={client.id} />
                <button
                  type="submit"
                  className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
                  aria-label={`Remove ${client.name} from contacts`}
                >
                  Remove
                </button>
              </form>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <ContactDialog
          client={open}
          today={today}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function ContactDialog({
  client,
  today,
  onClose,
}: {
  client: Contact;
  today: string;
  onClose: () => void;
}) {
  // Upcoming reads best soonest-first; history reads best most-recent-first,
  // which is the order the query already returns.
  const upcoming = client.history
    .filter((b) => b.date >= today && b.status !== "cancelled")
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.start_minutes - b.start_minutes,
    );
  const previous = client.history.filter(
    (b) => b.date < today || b.status === "cancelled",
  );

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${client.name}, history and details`}
      onClick={onClose}
    >
      <div
        className={styles.contactDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>{client.name}</p>
            <span className={styles.dialogSub}>
              {client.visits} visit{client.visits === 1 ? "" : "s"} ·{" "}
              {client.upcoming} upcoming
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
          <h3 className={styles.dialogSection}>About</h3>
          <div className={styles.aboutGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>First visit</span>
              <span className={styles.detailValue}>
                {client.firstVisit ? (
                  formatDateLong(client.firstVisit)
                ) : (
                  <span className="muted">Hasn&apos;t booked yet</span>
                )}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Last visit</span>
              <span className={styles.detailValue}>
                {client.lastVisit ? (
                  formatDateLong(client.lastVisit)
                ) : (
                  <span className="muted">Hasn&apos;t booked yet</span>
                )}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Total spent</span>
              <span className={styles.detailValue}>
                ${client.spent}
                {client.upcoming > 0 && (
                  <span className="muted">
                    {" "}
                    (excludes {client.upcoming} upcoming)
                  </span>
                )}
              </span>
            </div>
          </div>

          <ClientDetailsForm client={client} />

          <h3 className={styles.dialogSection}>Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="muted">Nothing booked.</p>
          ) : (
            <ul className={styles.historyList}>
              {upcoming.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}

          <h3 className={styles.dialogSection}>History</h3>
          {previous.length === 0 ? (
            <p className="muted">No past appointments yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {previous.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </div>

        <div className={styles.dialogFoot}>
          <Link
            href={`/admin?client=${client.id}`}
            className="btn btn-sm"
          >
            Book Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Editable name, phone, email and notes for one contact. */
function ClientDetailsForm({ client }: { client: Contact }) {
  const [state, action, pending] = useActionState<SaveClientState, FormData>(
    saveClientDetails,
    {},
  );

  return (
    <form action={action} className={styles.notesForm} key={client.id}>
      <input type="hidden" name="id" value={client.id} />

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

      <div className={styles.addGrid}>
        <label className="field">
          <span className="label">Name</span>
          <input
            className="input"
            name="name"
            defaultValue={client.name}
            required
            maxLength={100}
          />
        </label>
        <label className="field">
          <span className="label">Phone</span>
          <input
            className="input"
            name="phone"
            type="tel"
            defaultValue={client.phone}
          />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            name="email"
            type="email"
            defaultValue={client.email}
          />
        </label>
      </div>

      <label className="field">
        <span className="label">Notes</span>
        <textarea
          className="textarea"
          name="notes"
          defaultValue={client.notes ?? ""}
          maxLength={1000}
          placeholder="Allergies, preferred shape, what they usually book…"
        />
      </label>

      <button
        type="submit"
        className="btn btn-outline btn-sm"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save Details"}
      </button>
    </form>
  );
}

function HistoryRow({ booking }: { booking: ContactBooking }) {
  return (
    <li className={styles.historyRow}>
      <span className={styles.historyDate}>
        {formatDateShort(booking.date)}
        <span className={styles.historyTime}>
          {formatTime12(booking.start_minutes)}
        </span>
      </span>
      <span className={styles.historyService}>
        {booking.service_name}
        <span className={styles.historyMeta}>
          {formatDuration(booking.duration_minutes)} · ${booking.price} · Ref{" "}
          {booking.reference}
        </span>
        {booking.notes && (
          <span className={styles.historyNotes}>“{booking.notes}”</span>
        )}
      </span>
      <span className={`badge badge-${booking.status}`}>{booking.status}</span>
    </li>
  );
}
