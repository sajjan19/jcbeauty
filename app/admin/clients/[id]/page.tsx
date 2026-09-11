import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getClient, listBookingsForClient } from "@/lib/bookings";
import {
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatTime12,
  studioNow,
} from "@/lib/time";
import { LoginForm } from "../../login-form";
import { removeClient, saveClientNotes } from "../../actions";
import styles from "../../page.module.css";

export const metadata: Metadata = {
  title: "Contact",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: PageProps<"/admin/clients/[id]">) {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const { id } = await params;
  const client = getClient(Number(id));
  if (!client) notFound();

  const history = listBookingsForClient(client.email);
  const today = studioNow().date;
  const upcoming = history.filter(
    (b) => b.date >= today && b.status !== "cancelled",
  );
  const previous = history.filter(
    (b) => b.date < today || b.status === "cancelled",
  );

  return (
    <div className={styles.wrap}>
      <div className="container">
        <p className={styles.backLink}>
          <Link href="/admin?tab=contacts">← Back to contacts</Link>
        </p>

        <header className={styles.header}>
          <div>
            <p className="eyebrow">Contact</p>
            <h1 className={styles.title}>{client.name}</h1>
          </div>
          <div className={styles.contactActions}>
            <Link
              href={`/admin?client=${client.id}#add-appointment`}
              className="btn btn-sm"
            >
              Book Appointment
            </Link>
            <form action={removeClient}>
              <input type="hidden" name="id" value={client.id} />
              <button
                type="submit"
                className={`btn btn-ghost btn-sm ${styles.removeBtn}`}
              >
                Remove
              </button>
            </form>
          </div>
        </header>

        {/* ── About ─────────────────────────── */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{client.bookings}</span>
            <span className={styles.statLabel}>Appointments</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{client.upcoming}</span>
            <span className={styles.statLabel}>Upcoming</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>${client.value}</span>
            <span className={styles.statLabel}>Booked value</span>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
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
          </div>

          <form action={saveClientNotes} className={styles.notesForm}>
            <input type="hidden" name="id" value={client.id} />
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
            <button type="submit" className="btn btn-outline btn-sm">
              Save Notes
            </button>
          </form>
        </section>

        {/* ── History ───────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="muted">Nothing booked.</p>
          ) : (
            <ul className={styles.historyList}>
              {upcoming.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>History</h2>
          {previous.length === 0 ? (
            <p className="muted">No past appointments yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {previous.map((b) => (
                <HistoryRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function HistoryRow({
  booking,
}: {
  booking: ReturnType<typeof listBookingsForClient>[number];
}) {
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
