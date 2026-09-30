import Link from "next/link";
import { business, dayNames, hours, mapsUrl, phoneHref } from "@/lib/content";
import { formatTime12, parseTime } from "@/lib/time";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const telHref = phoneHref();
  const hasEmail = !business.email.startsWith("TODO");

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <p className={styles.colTitle}>Contact</p>
            <ul className={styles.list}>
              {business.phone && telHref && (
                <li>
                  <a href={telHref}>{business.phone}</a>
                </li>
              )}
              {hasEmail && (
                <li>
                  <a className={styles.wrap} href={`mailto:${business.email}`}>
                    {business.email}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{business.instagram}
                </a>
              </li>
              {business.showAddress && (
                <li>
                  <a
                    className={styles.wrap}
                    href={mapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {business.street}, {business.city}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className={styles.colTitle}>Explore</p>
            <ul className={styles.list}>
              <li>
                <Link href="/about">About Japman</Link>
              </li>
              <li>
                <Link href="/services">Services &amp; Prices</Link>
              </li>
              <li>
                <Link href="/gallery">Gallery</Link>
              </li>
              <li>
                <Link href="/info">Before &amp; Aftercare</Link>
              </li>
              <li>
                <Link href="/book">Book an Appointment</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className={styles.colTitle}>Hours</p>
            <ul className={styles.list}>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const h = hours[day];
                return (
                  <li key={day} className={styles.hoursRow}>
                    <strong>{dayNames[day].slice(0, 3)}</strong>
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
          </div>
        </div>

        <div className={styles.bottom}>
          <span>
            © {year} {business.name}. All rights reserved.
          </span>
          {/* The handle moved up into Contact, so it isn't said twice. */}
          <span>{business.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
