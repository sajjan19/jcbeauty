"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  deposit,
  policies,
  preAppointment,
  services,
  type Service,
} from "@/lib/content";
import {
  formatDateLong,
  formatDuration,
  formatTime12,
  parseTime,
} from "@/lib/time";
import { Calendar } from "@/components/calendar";
import {
  fetchMonthAvailability,
  fetchSlots,
  submitBooking,
  type BookingFormState,
} from "./actions";
import styles from "./booking-flow.module.css";

const STEPS = ["Service", "Date", "Time", "Details"] as const;

export function BookingFlow({
  initialService,
  minDate,
  maxDate,
}: {
  initialService: string | null;
  minDate: string;
  maxDate: string;
}) {
  const [step, setStep] = useState(initialService ? 1 : 0);
  const [service, setService] = useState<Service | null>(
    services.find((s) => s.slug === initialService) ?? null,
  );
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const [cursor, setCursor] = useState(() => {
    const [y, m] = minDate.split("-").map(Number);
    return { year: y, month: m };
  });
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingMonth, startMonthLoad] = useTransition();
  const [loadingSlots, startSlotLoad] = useTransition();

  const [state, formAction, submitting] = useActionState<
    BookingFormState,
    FormData
  >(submitBooking, { status: "idle" });

  // Refresh the month grid whenever the service or visible month changes.
  useEffect(() => {
    if (!service) return;
    startMonthLoad(async () => {
      const result = await fetchMonthAvailability(
        service.slug,
        cursor.year,
        cursor.month,
      );
      setAvailability(result);
    });
  }, [service, cursor.year, cursor.month]);

  // Reload the times whenever the chosen day changes. Clearing stale slots is
  // handled by whoever changes the date, so this effect only ever fetches.
  useEffect(() => {
    if (!service || !date) return;
    startSlotLoad(async () => {
      setSlots(await fetchSlots(service.slug, date));
    });
  }, [service, date]);

  /* ── Confirmation ─────────────────────── */
  if (state.status === "success") {
    return (
      <Confirmation
        reference={state.reference!}
        service={service}
        date={date}
        time={time}
      />
    );
  }

  function chooseService(next: Service) {
    setService(next);
    // A different duration changes which slots fit, so start the time over.
    setDate(null);
    setTime(null);
    setSlots([]);
    setStep(1);
  }

  function chooseDate(next: string) {
    setDate(next);
    setTime(null);
    setSlots([]);
    setStep(2);
  }

  function chooseTime(next: string) {
    setTime(next);
    setStep(3);
  }

  const canReachStep = (i: number) => {
    if (i === 0) return true;
    if (i === 1) return Boolean(service);
    if (i === 2) return Boolean(service && date);
    return Boolean(service && date && time);
  };

  return (
    <div className={styles.wrap}>
      {/* ── Step rail ───────────────────── */}
      <ol className={styles.rail}>
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className={styles.railItem}>
              <button
                type="button"
                className={`${styles.railBtn} ${active ? styles.railActive : ""} ${
                  done ? styles.railDone : ""
                }`}
                disabled={!canReachStep(i)}
                onClick={() => setStep(i)}
              >
                <span className={styles.railNum}>{i + 1}</span>
                <span className={styles.railLabel}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.panel}>
        {/* ── Step 1 — service ──────────── */}
        {step === 0 && (
          <section>
            <h2 className={styles.stepTitle}>Which service?</h2>
            <p className={styles.stepHint}>
              Appointment length is set by the service, so this decides which
              times are available.
            </p>
            <div className={styles.serviceList}>
              {services.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={`${styles.serviceOption} ${
                    service?.slug === s.slug ? styles.serviceSelected : ""
                  }`}
                  onClick={() => chooseService(s)}
                >
                  <span className={styles.serviceMain}>
                    <span className={styles.serviceName}>{s.name}</span>
                    <span className={styles.serviceSummary}>{s.summary}</span>
                  </span>
                  <span className={styles.serviceMeta}>
                    <span className={styles.servicePrice}>${s.price}</span>
                    <span className={styles.serviceDuration}>
                      {formatDuration(s.durationMinutes)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Step 2 — date ─────────────── */}
        {step === 1 && service && (
          <section>
            <h2 className={styles.stepTitle}>Pick a date</h2>
            <p className={styles.stepHint}>
              Showing days with room for {service.name} —{" "}
              {formatDuration(service.durationMinutes)}.
            </p>
            <Calendar
              year={cursor.year}
              month={cursor.month}
              availability={availability}
              selected={date}
              loading={loadingMonth}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={chooseDate}
              onMonthChange={(year, month) => setCursor({ year, month })}
            />
            <div className={styles.stepNav}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(0)}
              >
                ← Change service
              </button>
            </div>
          </section>
        )}

        {/* ── Step 3 — time ─────────────── */}
        {step === 2 && service && date && (
          <section>
            <h2 className={styles.stepTitle}>Pick a time</h2>
            <p className={styles.stepHint}>{formatDateLong(date)}</p>

            {loadingSlots ? (
              <p className="muted">Loading times…</p>
            ) : slots.length === 0 ? (
              <div className="notice notice-warn">
                No times left on this date. Please choose another day.
              </div>
            ) : (
              <div className={styles.slotGrid}>
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`${styles.slot} ${
                      time === slot ? styles.slotSelected : ""
                    }`}
                    onClick={() => chooseTime(slot)}
                  >
                    {formatTime12(parseTime(slot))}
                  </button>
                ))}
              </div>
            )}

            <div className={styles.stepNav}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(1)}
              >
                ← Change date
              </button>
            </div>
          </section>
        )}

        {/* ── Step 4 — details ──────────── */}
        {step === 3 && service && date && time && (
          <section>
            <h2 className={styles.stepTitle}>Your details</h2>
            <p className={styles.stepHint}>
              I&apos;ll confirm your appointment by email once I&apos;ve had a
              look at the request.
            </p>

            <div className={styles.summary}>
              <div>
                <span className={styles.summaryLabel}>Service</span>
                <span className={styles.summaryValue}>{service.name}</span>
              </div>
              <div>
                <span className={styles.summaryLabel}>When</span>
                <span className={styles.summaryValue}>
                  {formatDateLong(date)} at {formatTime12(parseTime(time))}
                </span>
              </div>
              <div>
                <span className={styles.summaryLabel}>Length</span>
                <span className={styles.summaryValue}>
                  {formatDuration(service.durationMinutes)}
                </span>
              </div>
              <div>
                <span className={styles.summaryLabel}>Price</span>
                <span className={styles.summaryValue}>${service.price}</span>
              </div>
            </div>

            {state.status === "error" && state.message && (
              <div
                className={`notice notice-error ${styles.formNotice}`}
                role="alert"
              >
                {state.message}
              </div>
            )}

            <form action={formAction} className={styles.form}>
              <input type="hidden" name="service" value={service.slug} />
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="time" value={time} />

              <div className={styles.formRow}>
                <label className="field">
                  <span className="label">Full name</span>
                  <input
                    className="input"
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                  {state.fieldErrors?.name && (
                    <span className="error-text">{state.fieldErrors.name}</span>
                  )}
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
                  {state.fieldErrors?.phone && (
                    <span className="error-text">
                      {state.fieldErrors.phone}
                    </span>
                  )}
                </label>
              </div>

              <label className="field">
                <span className="label">Email</span>
                <input
                  className="input"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
                {state.fieldErrors?.email && (
                  <span className="error-text">{state.fieldErrors.email}</span>
                )}
              </label>

              <label className="field">
                <span className="label">Anything I should know? (optional)</span>
                <textarea
                  className="textarea"
                  name="notes"
                  maxLength={1000}
                  placeholder="Allergies, skin sensitivities, the look you're after…"
                />
                {state.fieldErrors?.notes && (
                  <span className="error-text">{state.fieldErrors.notes}</span>
                )}
              </label>

              <label className={styles.check}>
                <input type="checkbox" name="firstTime" />
                <span>This is my first appointment with JC Beauty</span>
              </label>

              <div className={styles.policyBox}>
                <p className={styles.policyHead}>Before you confirm</p>
                <ul className={styles.policyList}>
                  {preAppointment.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li>
                    A non-refundable ${deposit.amount} deposit secures your
                    appointment.
                  </li>
                  <li>{policies[2].body}</li>
                </ul>
                <Link href="/info" className={styles.policyLink}>
                  Read the full policies →
                </Link>
              </div>

              <label className={styles.check}>
                <input type="checkbox" name="agree" required />
                <span>
                  I&apos;ve read the pre-appointment requirements and booking
                  policies.
                </span>
              </label>
              {state.fieldErrors?.agree && (
                <span className="error-text">{state.fieldErrors.agree}</span>
              )}

              <div className={styles.submitRow}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  ← Change time
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? "Requesting…" : "Request Appointment"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Confirmation screen ─────────────────────────────────── */

function Confirmation({
  reference,
  service,
  date,
  time,
}: {
  reference: string;
  service: Service | null;
  date: string | null;
  time: string | null;
}) {
  return (
    <div className={styles.confirmation}>
      <p className="eyebrow">Request received</p>
      <h2 className={styles.confirmTitle}>Thank you — you&apos;re on my list.</h2>
      <p className={styles.confirmBody}>
        Your appointment is <strong>pending confirmation</strong>. I&apos;ll
        email you shortly to confirm the time and send deposit details. It
        isn&apos;t locked in until you hear back from me.
      </p>

      <div className={styles.confirmCard}>
        <div className={styles.refRow}>
          <span className={styles.summaryLabel}>Reference</span>
          <span className={styles.refValue}>{reference}</span>
        </div>
        {service && date && time && (
          <div className={styles.summary}>
            <div>
              <span className={styles.summaryLabel}>Service</span>
              <span className={styles.summaryValue}>{service.name}</span>
            </div>
            <div>
              <span className={styles.summaryLabel}>When</span>
              <span className={styles.summaryValue}>
                {formatDateLong(date)} at {formatTime12(parseTime(time))}
              </span>
            </div>
            <div>
              <span className={styles.summaryLabel}>Length</span>
              <span className={styles.summaryValue}>
                {formatDuration(service.durationMinutes)}
              </span>
            </div>
            <div>
              <span className={styles.summaryLabel}>Price</span>
              <span className={styles.summaryValue}>${service.price}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.confirmActions}>
        <Link href="/info" className="btn btn-outline">
          Read Pre-appointment Info
        </Link>
        <Link href="/" className="btn btn-ghost">
          Back to home
        </Link>
      </div>
    </div>
  );
}
