import "server-only";
import { db } from "./db";
import { getService } from "./content";
import { intakeConsents, sectionsForService } from "./intake";
import { addDays, studioNow } from "./time";

/*
 * Sample contacts, appointments and signed forms, for showing the admin to
 * someone without inventing it on the spot.
 *
 * Everything written here uses an @example.com address, which is a reserved
 * domain that can never belong to a real client. That is what makes
 * clearSampleData safe: it only ever deletes rows carrying one.
 *
 * Dates are worked out from today each time it runs, so the demo always
 * looks current rather than stranded in whichever month it was written.
 */

const DOMAIN = "@example.com";

type Person = {
  name: string;
  phone: string;
  notes?: string;
  /** Days from today. Negative is past. */
  past: [number, string][];
  upcoming: [number, string][];
  cancelled?: [number, string][];
};

const PEOPLE: Person[] = [
  {
    name: "Gary Singh",
    phone: "604-555-0142",
    past: [
      [-118, "brow-shape-wax"],
      [-96, "signature-brow-lamination"],
      [-74, "brow-shape-tint"],
      [-52, "signature-brow-lamination"],
      [-30, "lash-lift"],
      [-9, "brow-threading"],
    ],
    upcoming: [
      [2, "signature-brow-lamination"],
      [11, "brow-shape-tint"],
      [23, "naked-brow-lamination"],
    ],
    cancelled: [[-61, "brow-lamination-only"]],
  },
  {
    name: "Darren Raj",
    phone: "604-555-0188",
    notes:
      "Sensitive skin. Dislikes waxing, so thread or use the gentlest option and patch test anything new.",
    past: [
      [-112, "signature-brow-lamination"],
      [-83, "brow-shape-wax"],
      [-55, "naked-brow-lamination"],
      [-27, "brow-threading"],
      [-6, "brow-lamination-only"],
    ],
    upcoming: [
      [3, "brow-shape-wax"],
      [9, "signature-brow-lamination"],
      [17, "brow-threading"],
    ],
    cancelled: [[-40, "brow-shape-wax"]],
  },
  {
    name: "Chani Sahota",
    phone: "778-555-0133",
    past: [[-56, "lash-lift"]],
    upcoming: [
      [1, "brow-threading"],
      [8, "naked-brow-lamination"],
      [19, "signature-brow-lamination"],
    ],
  },
  {
    name: "Charan Randhawa",
    phone: "604-555-0175",
    past: [[-18, "brow-lamination-only"]],
    upcoming: [
      [4, "lash-lift"],
      [15, "brow-shape-wax"],
    ],
  },
  {
    name: "Gagan Chera",
    phone: "778-555-0107",
    past: [[-24, "brow-shape-wax"]],
    upcoming: [
      [1, "signature-brow-lamination"],
      [12, "naked-brow-lamination"],
    ],
  },
  {
    name: "Harpreet Saini",
    phone: "778-555-0190",
    notes: "Mild eczema on the brow bone in winter. Keep an eye on redness.",
    past: [[-17, "brow-shape-tint"]],
    upcoming: [
      [5, "brow-shape-wax"],
      [13, "brow-lamination-only"],
    ],
    cancelled: [[18, "lash-lift"]],
  },
];

/** A few yes answers each, so the sample forms don't all read the same. */
const FLAGS: Record<string, Record<string, string>> = {
  "Gary Singh": {
    medication: "Yes",
    goal: "Keep the shape I had last time, it suited me.",
    "anything-else": "On blood thinners, bruises easily.",
  },
  "Darren Raj": {
    "previous-reaction": "Yes",
    goal: "Clean shape, as gentle as possible.",
    "anything-else": "Waxing left me red for two days once, threading was fine.",
  },
  "Chani Sahota": { allergies: "Yes", contacts: "Yes", goal: "Something soft." },
  "Harpreet Saini": {
    "skin-conditions": "Yes",
    goal: "Fuller through the front.",
  },
  "Charan Randhawa": { "cold-sores": "Yes", goal: "Tidy up, nothing drastic." },
  "Gagan Chera": { goal: "Lifted but still natural." },
};

/** Times of day used in order, so two on one day never overlap. */
const SLOTS = [10 * 60, 13 * 60, 15 * 60 + 30];

const emailFor = (name: string) =>
  `${name.split(" ")[0].toLowerCase()}.sample${DOMAIN}`;

function reference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `JC-${out}`;
}

export function sampleDataLoaded(): boolean {
  const row = db
    .prepare(`SELECT 1 FROM clients WHERE email LIKE ? LIMIT 1`)
    .get(`%${DOMAIN}`);
  return Boolean(row);
}

export function loadSampleData(): {
  clients: number;
  bookings: number;
  forms: number;
} {
  const today = studioNow().date;

  const insertClient = db.prepare(
    `INSERT INTO clients (name, email, phone, notes, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (LOWER(email)) WHERE email <> '' DO NOTHING`,
  );
  const insertBooking = db.prepare(
    `INSERT INTO bookings (reference, service_slug, service_name, price,
       duration_minutes, date, start_minutes, end_minutes, client_name,
       email, phone, notes, first_time, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)`,
  );
  const insertForm = db.prepare(
    `INSERT INTO intake_forms (client_name, email, phone, service_slug,
       service_name, answers, consents, photo_consent, signature, signed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let clients = 0;
  let bookings = 0;
  let forms = 0;

  const run = db.transaction(() => {
    for (const person of PEOPLE) {
      const email = emailFor(person.name);
      const now = new Date().toISOString();

      insertClient.run(person.name, email, person.phone, person.notes ?? null, now);
      clients++;

      // Count how many are already on a date, so a second one that day
      // starts later instead of landing on top.
      const perDay = new Map<string, number>();
      const place = (offset: number, slug: string, status: string) => {
        const service = getService(slug);
        if (!service) return;
        const date = addDays(today, offset);
        const used = perDay.get(date) ?? 0;
        perDay.set(date, used + 1);
        const start = SLOTS[Math.min(used, SLOTS.length - 1)];

        insertBooking.run(
          reference(),
          service.slug,
          service.name,
          service.price,
          service.durationMinutes,
          date,
          start,
          start + service.durationMinutes,
          person.name,
          email,
          person.phone,
          status,
          now,
        );
        bookings++;
      };

      for (const [offset, slug] of person.past) place(offset, slug, "confirmed");
      person.upcoming.forEach(([offset, slug], i) =>
        // One pending each, so the awaiting tab isn't empty.
        place(offset, slug, i === 1 ? "pending" : "confirmed"),
      );
      for (const [offset, slug] of person.cancelled ?? []) {
        place(offset, slug, "cancelled");
      }

      // A signed form for every service they've had or booked.
      const slugs = new Set(
        [...person.past, ...person.upcoming].map(([, slug]) => slug),
      );
      for (const slug of slugs) {
        const service = getService(slug);
        if (!service) continue;

        const flags = FLAGS[person.name] ?? {};
        const answers: { id: string; label: string; value: string }[] = [];
        for (const section of sectionsForService(slug)) {
          for (const question of section.questions) {
            const value =
              flags[question.id] ?? (question.type === "yesno" ? "No" : "");
            if (value) {
              answers.push({ id: question.id, label: question.label, value });
            }
          }
        }

        insertForm.run(
          person.name,
          email,
          person.phone,
          slug,
          service.name,
          JSON.stringify(answers),
          JSON.stringify(intakeConsents.map((c) => c.id)),
          person.name === "Gagan Chera" ? 0 : 1,
          person.name,
          `${addDays(today, -120)}T09:30:00.000Z`,
        );
        forms++;
      }
    }
  });

  run();
  return { clients, bookings, forms };
}

/** Removes only the sample rows: everything on the reserved domain. */
export function clearSampleData(): {
  clients: number;
  bookings: number;
  forms: number;
} {
  const like = `%${DOMAIN}`;

  let clients = 0;
  let bookings = 0;
  let forms = 0;

  const run = db.transaction(() => {
    bookings = db
      .prepare(`DELETE FROM bookings WHERE email LIKE ?`)
      .run(like).changes;
    forms = db
      .prepare(`DELETE FROM intake_forms WHERE email LIKE ?`)
      .run(like).changes;
    clients = db
      .prepare(`DELETE FROM clients WHERE email LIKE ?`)
      .run(like).changes;
  });

  run();
  return { clients, bookings, forms };
}
