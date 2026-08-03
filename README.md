# JC Beauty

Website and booking app for **Japman Chera** — brow lamination, shaping, waxing
and tinting in Vancouver.

Built with Next.js 16 (App Router) and SQLite.

---

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

On the very first run, copy the environment template and fill it in:

```bash
cp .env.example .env.local
```

| Variable         | What it's for                                                   |
| ---------------- | --------------------------------------------------------------- |
| `ADMIN_PASSWORD` | The password for `/admin`. Make it long.                        |
| `ADMIN_SECRET`   | Random string signing the admin cookie. `openssl rand -hex 32`. |
| `DATABASE_PATH`  | Optional. Moves the SQLite file (e.g. a mounted disk in prod).  |

---

## Changing the site content

**Almost everything lives in one file: [`lib/content.ts`](lib/content.ts).**
You do not need to touch any other file to change:

- Business name, tagline, city, email, phone, Instagram handle
- Services — names, prices, descriptions, and **how long each takes**
- Opening hours for each day of the week
- Pre-appointment requirements, aftercare, booking policies, FAQs
- Which photos appear in the gallery

Anything still marked `TODO` in that file is a placeholder waiting on a real
value.

### Still to confirm with Japman

1. **Appointment durations.** Prices and descriptions come straight from her
   Instagram price list, but the `durationMinutes` values are estimates. These
   decide how much time each booking blocks off, so getting them right matters
   more than anything else in the file.
2. **Business email** — `business.email` is still a placeholder.
3. **Studio address** — hidden by default (`showAddress: false`). Clients are
   told the address comes once their appointment is confirmed.
4. **Opening hours** — currently Tue–Sat with Thursday running late. A guess.

### Adding gallery photos

Drop image files into `public/gallery/`, then list them in the `gallery` array
in `lib/content.ts`. Square images look best. Delete the `placeholder-*.svg`
entries once real photos are in.

---

## How booking works

A client picks a service → a date → a time → enters their details. The request
is saved with status **pending** and shows up in the admin dashboard, where
Japman confirms or cancels it. Nothing is auto-confirmed.

Availability is worked out in [`lib/bookings.ts`](lib/bookings.ts) from four
things:

- the opening hours for that weekday
- the length of the chosen service
- appointments already booked, plus a cleanup buffer either side
- the minimum-notice and how-far-ahead limits

All of those knobs live under `scheduling` in `lib/content.ts`:

| Setting               | Default           | Meaning                                    |
| --------------------- | ----------------- | ------------------------------------------ |
| `slotIntervalMinutes` | 15                | Appointments start on 15-minute boundaries |
| `minimumNoticeHours`  | 24                | No same-day surprise bookings              |
| `maximumDaysAhead`    | 60                | How far ahead the calendar opens           |
| `bufferMinutes`       | 15                | Cleanup gap between appointments           |
| `timezone`            | America/Vancouver | All times are studio-local                 |

Double-booking is prevented inside the database transaction, not just in the
UI — so if two people request the same slot at the same moment, only one gets
it.

---

## The admin dashboard

Go to **`/admin`** and sign in with `ADMIN_PASSWORD`.

From there you can:

- see how many requests are awaiting confirmation
- confirm, cancel, or reinstate any appointment
- read each client's contact details and notes
- block off whole dates (holidays, training days) — they disappear from the
  booking calendar immediately

The admin area is excluded from search engines. Sessions last 14 days.

---

## Deploying

The database is a single SQLite file, so the host **must give you a persistent
disk**. Render, Railway, Fly.io, or any VPS work as-is with no code changes.

> **Careful:** on Vercel or Netlify's serverless runtime the filesystem is
> ephemeral — every booking would be wiped on redeploy. To use those, the data
> layer in `lib/bookings.ts` needs swapping to a hosted database such as Turso
> or Postgres first.

Whichever host you pick, set `ADMIN_PASSWORD` and `ADMIN_SECRET` in its
environment settings, and point `DATABASE_PATH` at the mounted disk.

### Backups

The whole database is one file. Copy `data/jcbeauty.db` somewhere safe on a
schedule — that's a complete backup of every booking.

---

## Project layout

```
app/
  page.tsx            Home
  services/           Services & price list
  gallery/            Before & after
  info/               Pre-appointment, aftercare, policies, FAQs
  contact/            Contact details and hours
  book/               The 4-step booking flow + its server actions
  admin/              Password-gated dashboard + its server actions
components/           Header, footer, logo, calendar, gallery tile
lib/
  content.ts          ← everything editable lives here
  bookings.ts         Availability rules and booking reads/writes
  db.ts               SQLite connection and schema
  auth.ts             Admin password and session cookie
  time.ts             Date/time helpers, all timezone-aware
```
