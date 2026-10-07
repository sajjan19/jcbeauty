import "server-only";
import { db } from "./db";

/**
 * Reading and writing signed intake forms.
 *
 * Nothing here updates or deletes a form. A signature records what somebody
 * agreed to on a particular day, so a correction is a new form rather than
 * an edit of the old one.
 */

export type IntakeFormRow = {
  id: number;
  client_name: string;
  email: string;
  phone: string;
  service_slug: string;
  service_name: string;
  answers: string;
  consents: string;
  photo_consent: number;
  signature: string;
  signed_at: string;
};

/** The same row with its JSON columns opened up, for rendering. */
export type SignedIntakeForm = {
  id: number;
  serviceSlug: string;
  serviceName: string;
  signature: string;
  signedAt: string;
  photoConsent: boolean;
  answers: { id: string; label: string; value: string }[];
  consents: string[];
};

function parse(row: IntakeFormRow): SignedIntakeForm {
  let answers: { id: string; label: string; value: string }[] = [];
  let consents: string[] = [];

  // Stored as JSON; a malformed row shouldn't take the whole page down.
  try {
    answers = JSON.parse(row.answers);
  } catch {
    answers = [];
  }
  try {
    consents = JSON.parse(row.consents);
  } catch {
    consents = [];
  }

  return {
    id: row.id,
    serviceSlug: row.service_slug,
    serviceName: row.service_name,
    signature: row.signature,
    signedAt: row.signed_at,
    photoConsent: row.photo_consent === 1,
    answers,
    consents,
  };
}

export function saveIntakeForm(input: {
  clientName: string;
  email: string;
  phone: string;
  serviceSlug: string;
  serviceName: string;
  answers: { id: string; label: string; value: string }[];
  consents: string[];
  photoConsent: boolean;
  signature: string;
}): { ok: true; id: number } {
  const info = db
    .prepare(
      `INSERT INTO intake_forms (
         client_name, email, phone, service_slug, service_name,
         answers, consents, photo_consent, signature, signed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.clientName,
      input.email,
      input.phone,
      input.serviceSlug,
      input.serviceName,
      JSON.stringify(input.answers),
      JSON.stringify(input.consents),
      input.photoConsent ? 1 : 0,
      input.signature,
      new Date().toISOString(),
    );

  return { ok: true, id: Number(info.lastInsertRowid) };
}

/** Everything this client has signed, newest first. */
export function listIntakeFormsForClient(email: string): SignedIntakeForm[] {
  if (!email) return [];

  const rows = db
    .prepare(
      `SELECT * FROM intake_forms
       WHERE LOWER(email) = LOWER(?)
       ORDER BY signed_at DESC`,
    )
    .all(email) as IntakeFormRow[];

  return rows.map(parse);
}

/**
 * Has this client signed for this particular service? The answer is what
 * decides whether a returning client has to fill one in again.
 */
export function hasSignedIntake(email: string, serviceSlug: string): boolean {
  if (!email) return false;

  const row = db
    .prepare(
      `SELECT 1 FROM intake_forms
       WHERE LOWER(email) = LOWER(?) AND service_slug = ?
       LIMIT 1`,
    )
    .get(email, serviceSlug);

  return Boolean(row);
}

/** Which services a client has on file, for the contact pop-up. */
export function signedServiceSlugs(email: string): string[] {
  if (!email) return [];

  const rows = db
    .prepare(
      `SELECT DISTINCT service_slug FROM intake_forms
       WHERE LOWER(email) = LOWER(?)`,
    )
    .all(email) as { service_slug: string }[];

  return rows.map((r) => r.service_slug);
}
