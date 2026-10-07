"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  formatDateLong,
  formatDatePlain,
  formatDateShort,
  formatDuration,
  formatTime12,
} from "@/lib/time";
import {
  removeClient,
  saveClientDetails,
  saveClientNotes,
  type SaveClientState,
  type SaveNotesState,
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

export type ContactIntake = {
  id: number;
  serviceName: string;
  signature: string;
  signedAt: string;
  photoConsent: boolean;
  answers: { id: string; label: string; value: string }[];
  consents: string[];
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
  intake: ContactIntake[];
};

export function ContactsList({
  contacts,
  today,
}: {
  contacts: Contact[];
  today: string;
}) {
  const [open, setOpen] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [search, setSearch] = useState("");

  // Close on Escape, and stop the page behind the pop-up scrolling.
  const anyDialogOpen = Boolean(open || editing);

  useEffect(() => {
    if (!anyDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      setEditing(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [anyDialogOpen]);

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
          /* The whole card opens the contact. The buttons inside it stop the
             click travelling, so Edit and Remove still do their own thing. */
          <article
            key={client.id}
            className={styles.contact}
            onClick={() => setOpen(client)}
          >
            <div>
              <div className={styles.contactNameRow}>
                <p className={styles.contactName}>
                  <button
                    type="button"
                    className={styles.contactNameBtn}
                    onClick={() => setOpen(client)}
                  >
                    {client.name}
                  </button>
                </p>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(client);
                  }}
                  aria-label={`Edit ${client.name}`}
                >
                  Edit
                </button>
              </div>
              <span className={styles.contactSince}>
                {client.firstVisit
                  ? `Since ${formatDatePlain(client.firstVisit)}`
                  : "No bookings yet"}
              </span>
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

            <div
              className={styles.contactActions}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/admin?client=${client.id}`}
                className="btn btn-outline btn-sm"
              >
                Book
              </Link>
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

      {editing && (
        <EditClientDialog
          client={editing}
          onClose={() => setEditing(null)}
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
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>
                {client.phone ? (
                  <a href={`tel:${client.phone}`}>{client.phone}</a>
                ) : (
                  <span className="muted">Not recorded</span>
                )}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>
                {client.email ? (
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                ) : (
                  <span className="muted">Not recorded</span>
                )}
              </span>
            </div>
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
              <span className={styles.detailLabel}>Total visits</span>
              <span className={styles.detailValue}>
                {client.visits}
                {client.upcoming > 0 && (
                  <span className="muted"> ({client.upcoming} still to come)</span>
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

          <h3 className={styles.dialogSection}>Notes</h3>
          <ClientNotesForm client={client} />

          <h3 className={styles.dialogSection}>
            Upcoming <span className={styles.sectionCount}>{upcoming.length}</span>
          </h3>
          {upcoming.length === 0 ? (
            <p className="muted">Nothing booked.</p>
          ) : (
            <ul className={styles.historyList}>
              {upcoming.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}

          <h3 className={styles.dialogSection}>
            History <span className={styles.sectionCount}>{previous.length}</span>
          </h3>
          {previous.length === 0 ? (
            <p className="muted">No past appointments yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {previous.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}

          <h3 className={styles.dialogSection}>
            Signed forms{" "}
            <span className={styles.sectionCount}>{client.intake.length}</span>
          </h3>
          {client.intake.length === 0 ? (
            <p className="muted">
              Nothing signed yet. Each service is signed for separately, so a
              returning client booking something new signs again.
            </p>
          ) : (
            <ul className={styles.intakeList}>
              {client.intake.map((form) => (
                <li key={form.id}>
                  <details className={styles.intake}>
                    <summary className={styles.intakeHead}>
                      <span className={styles.intakeService}>
                        {form.serviceName}
                      </span>
                      <span className={styles.intakeWhen}>
                        signed {formatDateShort(form.signedAt.slice(0, 10))}
                      </span>
                    </summary>

                    <div className={styles.intakeBody}>
                      {form.answers.map((answer) => (
                        <div key={answer.id} className={styles.intakeAnswer}>
                          <span className={styles.intakeQuestion}>
                            {answer.label}
                          </span>
                          <span className={styles.intakeValue}>
                            {answer.value}
                          </span>
                        </div>
                      ))}

                      <div className={styles.intakeAnswer}>
                        <span className={styles.intakeQuestion}>
                          Photos for social media
                        </span>
                        <span className={styles.intakeValue}>
                          {form.photoConsent ? "Agreed" : "Not agreed"}
                        </span>
                      </div>

                      <p className={styles.intakeSign}>
                        Agreed to all {form.consents.length} terms and signed{" "}
                        <strong>{form.signature}</strong>.
                      </p>

                      <Link
                        href={`/admin/forms/${form.id}`}
                        className="btn btn-outline btn-sm"
                        target="_blank"
                      >
                        Open as PDF
                      </Link>
                    </div>
                  </details>
                </li>
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

function EditClientDialog({
  client,
  onClose,
}: {
  client: Contact;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${client.name}`}
      onClick={onClose}
    >
      <div
        className={styles.contactDialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.dialogTitle}>Edit contact</p>
            <span className={styles.dialogSub}>{client.name}</span>
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
          <ClientDetailsForm client={client} />

          {/* Tucked in here rather than on the card, where it sat one slip
              away from the Book button. */}
          <div className={styles.removeRow}>
            <form action={removeClient}>
              <input type="hidden" name="id" value={client.id} />
              <button
                type="submit"
                className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
                aria-label={`Remove ${client.name} from contacts`}
              >
                Remove this contact
              </button>
            </form>
            <span className={styles.removeNote}>
              Their appointments and signed forms are kept.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Notes live here rather than in the edit form: they change after every
 * appointment, while a name or number almost never does.
 */
function ClientNotesForm({ client }: { client: Contact }) {
  const [state, action, pending] = useActionState<SaveNotesState, FormData>(
    saveClientNotes,
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

      <label className="field">
        <span className="label">
          What to remember for next time — one point per line
        </span>
        <textarea
          className="textarea"
          name="notes"
          rows={5}
          defaultValue={client.notes ?? ""}
          maxLength={4000}
          placeholder={
            "Sensitive skin, threading only\nLikes the tail kept long\nTint a shade warmer than it looks"
          }
        />
      </label>
      <p className={styles.notesHint}>
        Each line shows as its own bullet on an appointment, so your notes
        never read as something the client wrote.
      </p>

      <button type="submit" className="btn btn-sm" disabled={pending}>
        {pending ? "Saving…" : "Save Notes"}
      </button>
    </form>
  );
}

/** Editable name, phone and email for one contact. */
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
