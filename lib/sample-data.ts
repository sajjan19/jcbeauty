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
    notes:
      "On blood thinners, so bruises easily around the arch. Work slower on the inner corners. Likes a strong, defined shape and always asks to keep the tail long. Tint one shade warmer than it looks like it should be.",
    past: [
      [-118, "brow-sculpt"],
      [-96, "brow-lamination-tint"],
      [-74, "brow-sculpt-tint"],
      [-52, "brow-lamination-tint"],
      [-30, "korean-lash-lift"],
      [-9, "brow-sculpt"],
    ],
    upcoming: [
      [2, "brow-lamination-tint"],
      [11, "brow-sculpt-tint"],
      [23, "brow-lamination"],
    ],
    cancelled: [[-61, "brow-lamination"]],
  },
  {
    name: "Darren Raj",
    phone: "604-555-0188",
    notes:
      "Sensitive skin. Threading only, never wax: a wax years ago left him red for two days. Patch test anything new. Prefers a softer, straighter shape and no tint. Books roughly every four weeks.",
    past: [
      [-112, "brow-lamination-tint"],
      [-83, "brow-sculpt"],
      [-55, "brow-lamination"],
      [-27, "brow-sculpt"],
      [-6, "brow-lamination"],
    ],
    upcoming: [
      [3, "brow-sculpt"],
      [9, "brow-lamination-tint"],
      [17, "brow-sculpt"],
    ],
    cancelled: [[-40, "brow-sculpt"]],
  },
  {
    name: "Chani Sahota",
    phone: "778-555-0133",
    notes:
      "Reacts to nickel, so keep tools clean and avoid anything plated. Wears contacts, takes them out before a lash lift. Wanted something soft last time and was pleased with it.",
    past: [[-56, "korean-lash-lift"]],
    upcoming: [
      [1, "brow-sculpt"],
      [8, "brow-lamination"],
      [19, "brow-lamination-tint"],
    ],
  },
  {
    name: "Charan Randhawa",
    phone: "604-555-0175",
    notes:
      "Gets cold sores around the brow area, so check before threading near the inner corner. Asks for a tidy-up rather than a change of shape. Usually runs five minutes late.",
    past: [[-18, "brow-lamination"]],
    upcoming: [
      [4, "korean-lash-lift"],
      [15, "brow-sculpt"],
    ],
  },
  {
    name: "Gagan Chera",
    phone: "778-555-0107",
    notes:
      "Wants lifted but natural, nothing too done. Hasn't agreed to photos, so don't post hers. New to lamination as of this year and happy with how it sat.",
    past: [[-24, "brow-sculpt"]],
    upcoming: [
      [1, "brow-lamination-tint"],
      [12, "brow-lamination"],
    ],
  },
  {
    name: "Harpreet Saini",
    phone: "778-555-0190",
    notes:
      "Mild eczema on the brow bone in winter, so check the skin before starting and keep an eye on redness afterwards. Wants more fullness through the front. Pays cash.",
    past: [[-17, "brow-sculpt-tint"]],
    upcoming: [
      [5, "brow-sculpt"],
      [13, "brow-lamination"],
    ],
    cancelled: [[18, "korean-lash-lift"]],
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
    "anything-else":
      "A wax years ago left me red for two days, threading has always been fine.",
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
