import type { Metadata } from "next";
import Link from "next/link";
import { deposit, services } from "@/lib/content";
import { formatDuration } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Services & Prices",
  description:
    "Brow lamination, shaping, waxing and tinting in Vancouver — full service list with prices and appointment lengths.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Brow services & price list."
        lede="Every appointment includes a consultation and mapping to your facial proportions. Not sure which to pick? Message me and I'll help you choose."
      >
        <Link href="/book" className="btn">
          Book an Appointment
        </Link>
      </PageHeader>

      <section className="section-sm">
        <div className="container">
          <div className={styles.list}>
            {services.map((service) => (
              <article
                key={service.slug}
                id={service.slug}
                className={`${styles.row} ${
                  service.popular ? styles.rowPopular : ""
                }`}
              >
                <div>
                  <div className={styles.head}>
                    <h2 className={styles.name}>{service.name}</h2>
                    {service.popular && (
                      <span className={styles.flag}>Most Booked</span>
                    )}
                  </div>
                  <p className={styles.summary}>{service.summary}</p>
                  <ul className={styles.details}>
                    {service.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.aside}>
                  <span className={styles.price}>${service.price}</span>
                  <span className={styles.duration}>
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <Link
                    href={`/book?service=${service.slug}`}
                    className="btn btn-outline btn-sm"
                  >
                    Book
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className={`notice notice-warn ${styles.note}`}>
            <strong>Booking a deposit:</strong> a non-refundable $
            {deposit.amount} deposit secures your appointment. Payment is by
            e-transfer or cash, completed before you leave. Full{" "}
            <Link href="/info#policies">booking policies</Link> are worth a read
            before you book.
          </div>
        </div>
      </section>
    </>
  );
}
