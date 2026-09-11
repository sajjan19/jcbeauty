import type { Metadata } from "next";
import Link from "next/link";
import { aftercare, faqs, policies, preAppointment } from "@/lib/content";
import { PageHeader } from "@/components/page-header";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Before & Aftercare",
  description:
    "How to prepare for your brow appointment, how to care for your brows afterwards and the booking policies.",
};

export default function InfoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Good to know"
        title="Before, after & the fine print."
        lede="A few minutes of prep makes a real difference to your results. Please read the pre-appointment list before booking, since some points decide whether a service can go ahead at all."
      />

      <section className="section-sm">
        <div className="container">
          <div className={styles.columns}>
            {/* ── Pre-appointment ───────────── */}
            <section id="pre-appointment" className={styles.block}>
              <p className="eyebrow">Pre-appointment</p>
              <h2 className={styles.blockTitle}>Before you come in</h2>
              <ul className={styles.checkList}>
                {preAppointment.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={`hint ${styles.blockNote}`}>
                Not sure whether something applies to you? Message me before
                booking and we&apos;ll work it out.
              </p>
            </section>

            {/* ── Aftercare ─────────────────── */}
            <section id="aftercare" className={styles.block}>
              <p className="eyebrow">Aftercare</p>
              <h2 className={styles.blockTitle}>Once you leave</h2>
              <ul className={styles.checkList}>
                {aftercare.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={`hint ${styles.blockNote}`}>
                The first 24 hours matter most, since that&apos;s when the shape
                sets.
              </p>
            </section>
          </div>

          <hr className="rule" />

          {/* ── Policies ────────────────────── */}
          <section id="policies" className={styles.policies}>
            <p className="eyebrow">Booking policies</p>
            <h2 className={styles.blockTitle}>The fine print</h2>
            <div className={styles.policyGrid}>
              {policies.map((policy) => (
                <div key={policy.title} className={styles.policy}>
                  <h3 className={styles.policyTitle}>{policy.title}</h3>
                  <p className={styles.policyBody}>{policy.body}</p>
                </div>
              ))}
            </div>
          </section>

          <hr className="rule" />

          {/* ── FAQs ────────────────────────── */}
          <section id="faq">
            <p className="eyebrow">Questions</p>
            <h2 className={styles.blockTitle}>Frequently asked</h2>
            <div className={styles.faqs}>
              {faqs.map((faq) => (
                <details key={faq.q} className={styles.faq}>
                  <summary className={styles.faqQ}>{faq.q}</summary>
                  <p className={styles.faqA}>{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className={styles.cta}>
            <Link href="/book" className="btn">
              Book an Appointment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
