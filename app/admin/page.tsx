import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import {
  getStats,
  listBlockedDates,
  listBookings,
  type Booking,
} from "@/lib/bookings";
import {
  addDays,
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatTime12,
  studioNow,
} from "@/lib/time";
import { LoginForm } from "./login-form";
import {
  addBlockedDate,
  logout,
  removeBlockedDate,
  updateBookingStatus,
} from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Bookings change constantly — never serve this from a cache.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const today = studioNow().date;
  const stats = getStats();
  const upcoming = listBookings({ from: today });
  const past = listBookings({ to: addDays(today, -1), order: "desc" }).slice(
    0,
    20,
  );
  const blocked = listBlockedDates(today);

  return (
    <div className={styles.wrap}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Studio admin</p>
            <h1 className={styles.title}>Bookings</h1>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-outline btn-sm">
              Sign out
            </button>
          </form>
        </header>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Awaiting confirmation</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.thisWeek}</span>
            <span className={styles.statLabel}>Next 7 days</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.upcoming}</span>
            <span className={styles.statLabel}>Upcoming total</span>
          </div>
        </div>

        {/* ── Upcoming ──────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming appointments yet.</p>
          ) : (
            <div className={styles.bookingList}>
              {upcoming.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </section>

        {/* ── Time off ──────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Block time off</h2>
          <p className={styles.sectionHint}>
            Blocked dates disappear from the booking calendar straight away.
            Existing appointments on that date are not cancelled — handle those
            below.
          </p>

          <form action={addBlockedDate} className={styles.blockForm}>
            <label className="field">
              <span className="label">Date</span>
              <input
                className="input"
                type="date"
                name="date"
                min={today}
                required
              />
            </label>
            <label className="field">
              <span className="label">Reason (optional)</span>
              <input
                className="input"
                name="reason"
                placeholder="Holiday, training day…"
                maxLength={120}
              />
            </label>
            <button type="submit" className="btn">
              Block Date
            </button>
          </form>

          {blocked.length > 0 && (
            <ul className={styles.blockedList}>
              {blocked.map((entry) => (
                <li key={entry.date} className={styles.blockedItem}>
                  <span>
                    <strong>{formatDateLong(entry.date)}</strong>
                    {entry.reason && (
                      <span className="muted"> — {entry.reason}</span>
                    )}
                  </span>
                  <form action={removeBlockedDate}>
                    <input type="hidden" name="date" value={entry.date} />
                    <button type="submit" className="btn btn-ghost btn-sm">
                      Unblock
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── History ───────────────────────── */}
        {past.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent history</h2>
            <div className={styles.bookingList}>
              {past.map((booking) => (
                <BookingCard key={booking.id} booking={booking} past />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  past = false,
}: {
  booking: Booking;
  past?: boolean;
}) {
  return (
    <article
      className={`${styles.booking} ${past ? styles.bookingPast : ""} ${
        booking.status === "cancelled" ? styles.bookingCancelled : ""
      }`}
    >
      <div className={styles.bookingWhen}>
        <span className={styles.bookingDate}>
          {formatDateShort(booking.date)}
        </span>
        <span className={styles.bookingTime}>
          {formatTime12(booking.start_minutes)}
        </span>
        <span className={styles.bookingDuration}>
          {formatDuration(booking.duration_minutes)}
        </span>
      </div>

      <div className={styles.bookingBody}>
        <div className={styles.bookingTop}>
          <h3 className={styles.bookingName}>
            {booking.client_name}
            {booking.first_time === 1 && (
              <span className={styles.newFlag}>New client</span>
            )}
          </h3>
          <span className={`badge badge-${booking.status}`}>
            {booking.status}
          </span>
        </div>

        <p className={styles.bookingService}>
          {booking.service_name} · ${booking.price} · Ref{" "}
          <strong>{booking.reference}</strong>
        </p>

        <p className={styles.bookingContact}>
          <a href={`mailto:${booking.email}`}>{booking.email}</a>
          {" · "}
          <a href={`tel:${booking.phone}`}>{booking.phone}</a>
        </p>

        {booking.notes && (
          <p className={styles.bookingNotes}>“{booking.notes}”</p>
        )}
      </div>

      {!past && (
        <div className={styles.bookingActions}>
          {booking.status !== "confirmed" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="confirmed" />
              <button type="submit" className="btn btn-sm">
                Confirm
              </button>
            </form>
          )}
          {booking.status !== "cancelled" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="cancelled" />
              <button type="submit" className="btn btn-outline btn-sm">
                Cancel
              </button>
            </form>
          )}
          {booking.status === "cancelled" && (
            <form action={updateBookingStatus}>
              <input type="hidden" name="id" value={booking.id} />
              <input type="hidden" name="status" value="pending" />
              <button type="submit" className="btn btn-ghost btn-sm">
                Reinstate
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
