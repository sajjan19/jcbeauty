import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { about, business } from "@/lib/content";
import { PageHeader } from "@/components/page-header";
import { LogoLockup } from "@/components/logo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: `About ${business.artist}`,
  description: `Meet ${business.artist}, ${business.tagline.toLowerCase()} — specialising in brow lamination, shaping, waxing and tinting.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={`Meet ${business.artist}.`}
        lede="The person behind the brows — and what to expect when you're in her chair."
      />

      <section className="section-sm">
        <div className="container">
          <div className={styles.intro}>
            <div className={styles.portrait}>
              {about.portrait ? (
                <Image
                  src={about.portrait}
                  alt={`Portrait of ${business.artist}`}
                  fill
                  sizes="(max-width: 860px) 320px, 420px"
                  className={styles.portraitImg}
                  priority
                />
              ) : (
                <LogoLockup size={200} />
              )}
            </div>

            <div className={styles.bio}>
              <h2 className={styles.headline}>{about.headline}</h2>
              {about.paragraphs.map((p) => (
                <p key={p} className={styles.paragraph}>
                  {p}
                </p>
              ))}

              <div className={styles.actions}>
                <Link href="/book" className="btn">
                  Book with Japman
                </Link>
                <a
                  href={business.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  @{business.instagram}
                </a>
              </div>
            </div>
          </div>

          {/* Hidden until real certifications are listed in content.ts. */}
          {about.certifications.length > 0 && (
            <section className={styles.certs} aria-labelledby="certs-title">
              <p className="eyebrow">Training</p>
              <h2 id="certs-title" className={styles.certsTitle}>
                Certifications
              </h2>
              <ul className={styles.certList}>
                {about.certifications.map((cert) => (
                  <li key={`${cert.name}-${cert.issuer}`} className={styles.cert}>
                    <span className={styles.certName}>{cert.name}</span>
                    <span className={styles.certMeta}>
                      {cert.issuer}
                      {cert.year ? ` · ${cert.year}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
