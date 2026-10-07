import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { business } from "@/lib/content";
import { intakeConsents, intakePhotoConsent } from "@/lib/intake";
import { getIntakeForm } from "@/lib/intake-store";
import { PrintButton } from "./print-button";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Signed form",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignedFormPage({
  params,
}: PageProps<"/admin/forms/[id]">) {
  if (!(await isAdmin())) {
    return (
      <div className="container section-sm">
        <p className="muted">Please sign in to view signed forms.</p>
        <Link href="/admin" className="btn btn-sm">
          Go to Admin
        </Link>
      </div>
    );
  }

  const { id } = await params;
  const form = getIntakeForm(Number(id));
  if (!form) notFound();

  const signed = new Date(form.signedAt);
  const signedLabel = signed.toLocaleString("en-CA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Vancouver",
  });

  return (
    <div className={styles.page}>
      {/* Hidden when printing, so the paper copy is only the form. */}
      <div className={styles.bar}>
        <Link href="/admin?tab=contacts" className="btn btn-ghost btn-sm">
          ← Back to contacts
        </Link>
        <PrintButton />
      </div>

      <article className={styles.sheet}>
        <header className={styles.head}>
          <div>
            <p className={styles.brand}>{business.name}</p>
            <p className={styles.sub}>
              {business.artist} · {business.area}
            </p>
          </div>
          <div className={styles.headRight}>
            <p className={styles.docType}>Intake &amp; consent</p>
            <p className={styles.sub}>{form.serviceName}</p>
          </div>
        </header>

        <section className={styles.who}>
          <Field label="Name" value={form.clientName} />
          <Field label="Phone" value={form.phone || "Not given"} />
          <Field label="Email" value={form.email} />
          <Field label="Signed" value={signedLabel} />
        </section>

        <section>
          <h2 className={styles.heading}>Answers</h2>
          {form.answers.length === 0 ? (
            <p className={styles.muted}>No answers recorded.</p>
          ) : (
            <dl className={styles.answers}>
              {form.answers.map((answer) => (
                <div key={answer.id} className={styles.answer}>
                  <dt>{answer.label}</dt>
                  <dd>{answer.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section>
          <h2 className={styles.heading}>Agreed</h2>
          <ul className={styles.consents}>
            {intakeConsents.map((consent) => (
              <li key={consent.id}>
                <span className={styles.tick} aria-hidden>
                  {form.consents.includes(consent.id) ? "✓" : "—"}
                </span>
                <span>{consent.label}</span>
              </li>
            ))}
            <li>
              <span className={styles.tick} aria-hidden>
                {form.photoConsent ? "✓" : "—"}
              </span>
              <span>
                {intakePhotoConsent.label}{" "}
                <strong>
                  {form.photoConsent ? "(agreed)" : "(not agreed)"}
                </strong>
              </span>
            </li>
          </ul>
        </section>

        <section className={styles.signature}>
          <p className={styles.sigLabel}>Signed</p>
          <p className={styles.sigName}>{form.signature}</p>
          <p className={styles.sigMeta}>
            Typed as a signature on {signedLabel}.
          </p>
        </section>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}
