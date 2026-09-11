import type { Metadata } from "next";
import Link from "next/link";
import {
  business,
  dayNames,
  hours,
  mapEmbedUrl,
  mapsUrl,
  phoneHref,
} from "@/lib/content";
import { formatTime12, parseTime } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${business.artist}, a brow artist in ${business.city}.`,
};

const hasEmail = !business.email.startsWith("TODO");
const telHref = phoneHref();

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch."
        lede="The fastest way to reach me is Instagram. I check messages daily. For appointments, the booking page is quicker than a DM."
      >
        <Link href="/book" className="btn">
          Book an Appointment
        </Link>
      </PageHeader>

      <section className="section-sm">
        <div className="container">
          <div className={styles.grid}>
            <div className={styles.column}>
              <div className={styles.cards}>
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.card}
                >
                  <span className="eyebrow">Instagram</span>
                  <span className={styles.cardValue}>
                    @{business.instagram}
                  </span>
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

                {business.phone && telHref && (
                  <a href={telHref} className={styles.card}>
                    <span className="eyebrow">Phone</span>
                    <span className={styles.cardValue}>{business.phone}</span>
                    <span className={styles.cardNote}>
                      Calls and texts during studio hours
                    </span>
                  </a>
                )}

                {/* With the address public the map carries it, so there's no
                    separate Studio card. Hidden addresses still need one. */}
                {!business.showAddress && (
                  <div className={styles.card}>
                    <span className="eyebrow">Studio</span>
                    <span className={styles.cardValue}>{business.city}</span>
                    <span className={styles.cardNote}>
                      {business.addressNote}
                    </span>
                  </div>
                )}
              </div>

              {business.showAddress && (
                <div className={styles.mapBlock}>
                  <div className={styles.mapHead}>
                    <div>
                      <span className="eyebrow">Studio</span>
                      <p className={styles.mapTitle}>{business.street}</p>
                      <p className={styles.mapSub}>{business.city}</p>
                    </div>
                    <a
                      href={mapsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      Directions
                    </a>
                  </div>

                  <div className={styles.mapFrame}>
                    <iframe
                      src={mapEmbedUrl()}
                      title={`Map showing ${business.address}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
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
                          {formatTime12(parseTime(h.open))} to{" "}
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
                Appointments are by booking only, so please don&apos;t drop in.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
