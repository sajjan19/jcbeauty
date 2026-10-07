import type { Metadata } from "next";
import Link from "next/link";
import { getService, services } from "@/lib/content";
import { formatDuration } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import { IntakeForm } from "./intake-form";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Intake Form",
  description:
    "The health, consent and aftercare form signed before a brow or lash appointment at JC Beauty.",
  robots: { index: false, follow: false },
};

export default async function IntakePage({
  searchParams,
}: PageProps<"/intake">) {
  const params = await searchParams;
  const requested = Array.isArray(params.service)
    ? params.service[0]
    : params.service;
  const service = requested ? getService(requested) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Before your appointment"
        title={service ? service.name : "Intake form."}
        lede={
          service
            ? "A few questions about your skin and health, then the agreement to sign. It takes a couple of minutes and only needs doing once per service."
            : "Each service has its own form, because the questions that matter for a lash lift aren't the ones that matter for a brow tint. Pick what you're booking."
        }
      />

      <section className="section-sm">
        <div className="container-narrow">
          {service ? (
            <>
              <IntakeForm service={service} />
              <p className={styles.switch}>
                Booking something else?{" "}
                <Link href="/intake">Choose a different service</Link>.
              </p>
            </>
          ) : (
            <ul className={styles.picker}>
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/intake?service=${s.slug}`} className={styles.pick}>
                    <span className={styles.pickName}>{s.name}</span>
                    <span className={styles.pickMeta}>
                      ${s.price} · {formatDuration(s.durationMinutes)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
