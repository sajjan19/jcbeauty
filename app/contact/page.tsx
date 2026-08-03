import type { Metadata } from "next";
import Link from "next/link";
import { business, dayNames, hours } from "@/lib/content";
import { formatTime12, parseTime } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${business.artist} — ${business.tagline} in ${business.city}.`,
};

const hasEmail = !business.email.startsWith("TODO");

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch."
        lede="The fastest way to reach me is Instagram — I check messages daily. For appointments, the booking page is quicker than a DM."
      >
        <Link href="/book" className="btn">
          Book an Appointment
        </Link>
      </PageHeader>

      <section className="section-sm">
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.cards}>
              <a
                href={business.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.card}
              >
                <span className="eyebrow">Instagram</span>
                <span className={styles.cardValue}>@{business.instagram}</span>
                <span className={styles.cardNote}>
                  Best for questions and shade advice
                </span>
              </a>

              {hasEmail && (
                <a href={`mailto:${business.email}`} className={styles.card}>
                  <span className="eyebrow">Email</span>
                  <span className={styles.cardValue}>{business.email}</span>
                  <span className={styles.cardNote}>
                    For anything that needs a paper trail
                  </span>
                </a>
              )}

              {business.phone && (
                <a href={`tel:${business.phone}`} className={styles.card}>
                  <span className="eyebrow">Phone</span>
                  <span className={styles.cardValue}>{business.phone}</span>
                  <span className={styles.cardNote}>
                    Calls and texts during studio hours
                  </span>
                </a>
              )}

              <div className={styles.card}>
                <span className="eyebrow">Studio</span>
                <span className={styles.cardValue}>{business.city}</span>
                <span className={styles.cardNote}>
                  {business.showAddress
                    ? business.address
                    : business.addressNote}
                </span>
              </div>
            </div>

            <aside className={styles.hoursPanel}>
              <p className="eyebrow">Studio hours</p>
              <ul className={styles.hoursList}>
                {[2, 3, 4, 5, 6, 0, 1].map((day) => {
                  const h = hours[day];
                  return (
                    <li key={day} className={styles.hoursRow}>
                      <span className={styles.dayName}>{dayNames[day]}</span>
                      {h ? (
                        <span>
                          {formatTime12(parseTime(h.open))} –{" "}
                          {formatTime12(parseTime(h.close))}
                        </span>
                      ) : (
                        <span className={styles.closed}>Closed</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className={`hint ${styles.hoursNote}`}>
                Appointments are by booking only — please don&apos;t drop in.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
