"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Service } from "@/lib/content";
import {
  intakeConsents,
  intakePhotoConsent,
  sectionsForService,
} from "@/lib/intake";
import { submitIntakeForm, type IntakeState } from "./actions";
import styles from "./page.module.css";

export function IntakeForm({ service }: { service: Service }) {
  const [state, action, pending] = useActionState<IntakeState, FormData>(
    submitIntakeForm,
    { status: "idle" },
  );

  const sections = sectionsForService(service.slug);
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <p className="eyebrow">Signed</p>
        <h2 className={styles.doneTitle}>Thank you.</h2>
        <p className={styles.doneBody}>
          Your form for {state.signedFor} is on file. You won&apos;t need to
          fill this one in again, though a different service will have its own
          form to sign.
        </p>
        <Link href="/book" className="btn">
          Book an Appointment
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="service" value={service.slug} />

      {state.status === "error" && state.message && (
        <div className="notice notice-error" role="alert">
          {state.message}
        </div>
      )}

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Your details</h2>
        <div className={styles.grid}>
          <label className="field">
            <span className="label">Full name</span>
            <input
              className="input"
              name="name"
              required
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span className="label">Phone</span>
            <input
              className="input"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
            />
          </label>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.id} className={styles.block}>
          <h2 className={styles.blockTitle}>{section.title}</h2>
          {section.blurb && <p className={styles.blurb}>{section.blurb}</p>}

          <div className={styles.questions}>
            {section.questions.map((question) =>
              question.type === "yesno" ? (
                <fieldset key={question.id} className={styles.yesno}>
                  <legend className={styles.question}>{question.label}</legend>
                  <div className={styles.choices}>
                    {["Yes", "No"].map((option) => (
                      <label key={option} className={styles.choice}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          required
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label key={question.id} className="field">
                  <span className={styles.question}>{question.label}</span>
                  <textarea
                    className="textarea"
                    name={question.id}
                    rows={3}
                    maxLength={1000}
                  />
                </label>
              ),
            )}
          </div>
        </section>
      ))}

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Agreement</h2>
        <p className={styles.blurb}>
          Please read each line. All of them have to be ticked before your
          appointment can go ahead.
        </p>

        <div className={styles.consents}>
          {intakeConsents.map((consent) => (
            <label key={consent.id} className={styles.consent}>
              <input type="checkbox" name={`consent-${consent.id}`} required />
              <span>{consent.label}</span>
            </label>
          ))}
        </div>

        <p className={styles.optionalHead}>Optional</p>
        <label className={styles.consent}>
          <input type="checkbox" name={`consent-${intakePhotoConsent.id}`} />
          <span>{intakePhotoConsent.label}</span>
        </label>
      </section>

      <section className={styles.block}>
        <h2 className={styles.blockTitle}>Signature</h2>
        <p className={styles.blurb}>
          Typing your full name below counts as your signature, and records
          that you agreed to the above on {today}.
        </p>
        <label className="field">
          <span className="label">Type your full name</span>
          <input
            className={`input ${styles.signature}`}
            name="signature"
            required
            maxLength={100}
            autoComplete="off"
          />
        </label>
      </section>

      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Signing…" : "Sign and Send"}
      </button>
    </form>
  );
}
