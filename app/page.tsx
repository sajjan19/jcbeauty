import Link from "next/link";
import { business, gallery, services } from "@/lib/content";
import { formatDuration } from "@/lib/time";
import { LogoLockup } from "@/components/logo";
import { GalleryTile } from "@/components/gallery-tile";
import styles from "./page.module.css";

export default function HomePage() {
  const featured = services.filter((s) => s.popular);
  const showcase = [...featured, ...services.filter((s) => !s.popular)].slice(
    0,
    3,
  );
  const fromPrice = Math.min(...services.map((s) => s.price));

  return (
    <>
      {/* ── Hero ─────────────────────────────── */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className="eyebrow">{business.tagline}</p>
              <h1 className={styles.heroTitle}>
                Brows that suit <em>you</em>.
              </h1>
              <p className={`lede ${styles.heroLede}`}>{business.intro}</p>

              <div className={styles.heroActions}>
                <Link href="/book" className="btn">
                  Book an Appointment
                </Link>
                <Link href="/services" className="btn btn-outline">
                  View Prices
                </Link>
              </div>

              <div className={styles.heroMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaValue}>${fromPrice}+</span>
                  <span className={styles.metaLabel}>Services from</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaValue}>6 to 8</span>
                  <span className={styles.metaLabel}>Weeks of results</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaValue}>{business.city}</span>
                  <span className={styles.metaLabel}>Private studio</span>
                </div>
              </div>
            </div>

            <div className={styles.heroArt}>
              <LogoLockup size={220} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadText}>
              <p className="eyebrow">Services</p>
              <h2>Shaped, laminated, tinted.</h2>
            </div>
            <Link href="/services" className="btn btn-outline btn-sm">
              All Services
            </Link>
          </div>

          <div className={styles.services}>
            {showcase.map((service) => (
              <Link
                key={service.slug}
                href={`/services#${service.slug}`}
                className={styles.serviceCard}
              >
                {service.popular && (
                  <span className={styles.popularFlag}>Most Booked</span>
                )}
                <div className={styles.serviceTop}>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.servicePrice}>${service.price}</span>
                </div>
                <p className={styles.serviceSummary}>{service.summary}</p>
                <div className={styles.serviceFoot}>
                  <span>{formatDuration(service.durationMinutes)}</span>
                  <span aria-hidden>Details →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────── */}
      <section className={`section ${styles.process}`}>
        <div className="container">
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadText}>
              <p className="eyebrow">What to expect</p>
              <h2>Every appointment, start to finish.</h2>
            </div>
          </div>

          <div className={styles.steps}>
            <div>
              <span className={styles.stepNumber}>01</span>
              <h3 className={styles.stepTitle}>Consultation</h3>
              <p className={styles.stepBody}>
                We talk through what you want and what your natural brow can
                hold, so there are no surprises later.
              </p>
            </div>
            <div>
              <span className={styles.stepNumber}>02</span>
              <h3 className={styles.stepTitle}>Mapping</h3>
              <p className={styles.stepBody}>
                Your brows are measured and mapped to your facial proportions
                before a single hair is touched.
              </p>
            </div>
            <div>
              <span className={styles.stepNumber}>03</span>
              <h3 className={styles.stepTitle}>The service</h3>
              <p className={styles.stepBody}>
                Lamination, shaping, waxing, or tinting. Whichever you booked, it&apos;s
                done unhurried in a private studio.
              </p>
            </div>
            <div>
              <span className={styles.stepNumber}>04</span>
              <h3 className={styles.stepTitle}>Aftercare</h3>
              <p className={styles.stepBody}>
                You leave knowing exactly how to look after them, so the results
                last as long as they should.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className={styles.sectionHead}>
            <div className={styles.sectionHeadText}>
              <p className="eyebrow">Recent work</p>
              <h2>Before &amp; after.</h2>
            </div>
            <Link href="/gallery" className="btn btn-outline btn-sm">
              Full Gallery
            </Link>
          </div>

          <div className={styles.galleryStrip}>
            {gallery.slice(0, 4).map((item) => (
              <GalleryTile key={item.src} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────── */}
      <section className={styles.cta}>
        <div className="container-narrow">
          <h2 className={styles.ctaTitle}>Ready when you are.</h2>
          <p className={styles.ctaBody}>
            Pick your service, choose a time that works and I&apos;ll confirm
            your appointment. New clients welcome.
          </p>
          <Link href="/book" className={`btn ${styles.ctaBtn}`}>
            Book an Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
