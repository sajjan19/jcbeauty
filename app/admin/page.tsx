import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import {
  getStats,
  listBlockedPeriods,
  listBookings,
  listBookingsForClient,
  listClients,
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
import { AdminCalendar } from "./admin-calendar";
import { AddBookingForm } from "./add-booking-form";
import { AddClientForm } from "./add-client-form";
import { ContactsList } from "./contacts-list";
import {
  addBlockedTime,
  logout,
  removeBlockedTime,
  updateBookingStatus,
} from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Bookings change constantly — never serve this from a cache.
export const dynamic = "force-dynamic";

type Tab = "bookings" | "pending" | "contacts";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    return <LoginForm />;
  }

  const params = await searchParams;
  const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: Tab =
    raw === "pending" || raw === "contacts" ? raw : "bookings";

  const today = studioNow().date;
  const stats = getStats();
  const upcoming = listBookings({ from: today });
  const pending = upcoming.filter((b) => b.status === "pending");
  const past = listBookings({ to: addDays(today, -1), order: "desc" }).slice(
    0,
    20,
  );
  const blocked = listBlockedPeriods(today);
  // The calendar can be paged back through past months, so it gets everything.
  const allBookings = listBookings({});
  // Needed by both the contacts tab and the manual booking form's type-ahead.
  const clients = listClients();

  // Set when arriving from a contact's Book button.
  const clientParam = Array.isArray(params.client)
    ? params.client[0]
    : params.client;
  const prefill = clientParam
    ? (clients.find((c) => String(c.id) === clientParam) ?? null)
    : null;

  // The pop-up shows each contact's appointments, so they travel with the
  // list. Only built for the tab that needs them.
  const contactsWithHistory =
    tab === "contacts"
      ? clients.map((c) => ({ ...c, history: listBookingsForClient(c.email) }))
      : [];

  return (
    <div className={styles.wrap}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Studio admin</p>
            <h1 className={styles.title}>
              {tab === "contacts"
                ? "Contacts"
                : tab === "pending"
                  ? "Awaiting confirmation"
                  : "Bookings"}
            </h1>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-outline btn-sm">
              Sign out
            </button>
          </form>
        </header>

        <div className={styles.stats}>
          <Link
            href="/admin?tab=pending"
            className={`${styles.stat} ${styles.statLink}`}
          >
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Awaiting confirmation</span>
          </Link>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.thisWeek}</span>
            <span className={styles.statLabel}>Next 7 days</span>
          </div>
          <Link
            href="/admin?tab=contacts"
            className={`${styles.stat} ${styles.statLink}`}
          >
            <span className={styles.statValue}>{stats.upcoming}</span>
            <span className={styles.statLabel}>Upcoming total</span>
          </Link>
        </div>

        <nav className={styles.tabs}>
          <Link
            href="/admin"
            className={`${styles.tab} ${tab === "bookings" ? styles.tabActive : ""}`}
          >
            Calendar
          </Link>
          <Link
            href="/admin?tab=pending"
            className={`${styles.tab} ${tab === "pending" ? styles.tabActive : ""}`}
          >
            Awaiting
            <span className={styles.tabCount}>{stats.pending}</span>
          </Link>
          <Link
            href="/admin?tab=contacts"
            className={`${styles.tab} ${tab === "contacts" ? styles.tabActive : ""}`}
          >
            Contacts
          </Link>
        </nav>

        {/* ── Awaiting confirmation ─────────── */}
        {tab === "pending" && (
          <section className={styles.section}>
            <p className={styles.sectionHint}>
              Requests from the website that you haven&apos;t confirmed yet.
            </p>
            {pending.length === 0 ? (
              <p className="muted">Nothing waiting. All caught up.</p>
            ) : (
              <div className={styles.bookingList}>
                {pending.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Contacts ──────────────────────── */}
        {tab === "contacts" && (
          <section className={styles.section}>
            <p className={styles.sectionHint}>
              Your address book. Anyone who books through the website is added
              automatically, and you can save someone here before they book.
              Removing a contact keeps their past appointments.
            </p>

            <AddClientForm />

            <h2 className={`${styles.sectionTitle} ${styles.contactsHeading}`}>
              Saved contacts
            </h2>
            <ContactsList contacts={contactsWithHistory} today={today} />
          </section>
        )}

        {/* ── Calendar and everything else ──── */}
        {tab === "bookings" && (
          <>
            <AdminCalendar
              bookings={allBookings}
              today={today}
              nowMinutes={studioNow().minutes}
            />

            <section className={styles.section} id="add-appointment">
              <h2 className={styles.sectionTitle}>Add an appointment</h2>
              <p className={styles.sectionHint}>
                For bookings taken by DM, phone or in person. Any date and time
                is allowed, as long as it doesn&apos;t overlap something already
                in the book. Start typing a name or number to pull up someone
                who has booked before.
              </p>
              <AddBookingForm
                // Remounts when a different contact is picked, so their
                // details actually replace what's in the fields.
                key={prefill ? `client-${prefill.id}` : "new"}
                today={today}
                prefill={
                  prefill
                    ? {
                        name: prefill.name,
                        email: prefill.email,
                        phone: prefill.phone,
                      }
                    : null
                }
                clients={clients.map((c) => ({
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                }))}
              />
            </section>

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

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Block time off</h2>
              <p className={styles.sectionHint}>
                Block a whole day, or just part of one when you can work the
                rest. Blocked time disappears from the booking calendar straight
                away. Appointments already booked are not cancelled, so handle
                those above.
              </p>

              <form action={addBlockedTime} className={styles.blockForm}>
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
                  <span className="label">Block</span>
                  <select className="select" name="mode" defaultValue="day">
                    <option value="day">The whole day</option>
                    <option value="time">Just these hours</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label">From</span>
                  <input className="input" type="time" name="from" />
                </label>
                <label className="field">
                  <span className="label">To</span>
                  <input className="input" type="time" name="to" />
                </label>
                <label className="field">
                  <span className="label">Reason (optional)</span>
                  <input
                    className="input"
                    name="reason"
                    placeholder="Holiday, school run…"
                    maxLength={120}
                  />
                </label>
                <button type="submit" className="btn">
                  Block Time
                </button>
              </form>

              {blocked.length > 0 && (
                <ul className={styles.blockedList}>
                  {blocked.map((entry) => (
                    <li key={entry.id} className={styles.blockedItem}>
                      <span>
                        <strong>{formatDateLong(entry.date)}</strong>
                        <span className="muted">
                          {" · "}
                          {entry.start_minutes === null ||
                          entry.end_minutes === null
                            ? "whole day"
                            : `${formatTime12(entry.start_minutes)} to ${formatTime12(entry.end_minutes)}`}
                        </span>
                        {entry.reason && (
                          <span className="muted"> ({entry.reason})</span>
                        )}
                      </span>
                      <form action={removeBlockedTime}>
                        <input type="hidden" name="id" value={entry.id} />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          Unblock
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
          </>
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
