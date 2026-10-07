# To do

Things that are known and deliberately not done yet. Each one says what it
needs, so none of it has to be worked out again from scratch.

## Appointment reminders, by email and text

Decided: fully automatic, sent 24 hours before the appointment, by both
email and text.

Not started, because it can't run on the current hosting. What it needs
first, none of which is code:

- **A paid Render instance with a disk** (~$7/month). Free instances sleep
  and lose their database, so anything scheduled is lost with it. This is the
  same change the database needs anyway (see below).
- **A domain**, around $15/year. Email providers will only send from an
  address at a domain you control — a Hotmail address can't be the sender.
- **A Twilio account** for texts: a Canadian number is roughly $1–2/month
  plus about a cent a message. Carriers also require the number to be
  registered for business messaging before they will deliver, which takes a
  few days.
- **Something to run on a schedule.** A Render cron job is the simplest once
  the instance is paid.

When those exist, the build is roughly: a `reminders_sent` table with a
unique index on (booking, channel) so nothing sends twice; message templates;
a function that finds appointments due a reminder; provider calls behind
environment variables; and a scheduled endpoint protected by a secret.

In the meantime she can text or email clients herself from her phone. If that
gets tedious before the above is sorted, a one-tap version — tomorrow's
appointments with the message pre-written, opening her own Messages or Mail
app — needs no accounts and no monthly cost.

## Bookings disappear from the live site

Free Render instances have no persistent disk, so the database is wiped on
every deploy and whenever the instance restarts after idling. Fine for
demonstrating, not for real clients.

`render.yaml` carries the exact five lines to fix it. It needs a paid
instance, around $7/month, and no code changes.

## Confirm the appointment lengths

Every `durationMinutes` in `lib/content.ts` is an estimate, not Japman's
number:

| Service | Assumed |
| --- | --- |
| Brow Sculpt | 15 min |
| Brow Sculpt + Tint | 30 min |
| Brow Lamination | 45 min |
| Brow Lamination + Tint | 60 min |
| Korean Lash Lift | 60 min |
| Korean Lash Lift + Tint | 75 min |

These decide how much of her day each booking blocks out and how many times a
client is offered. Worth ten minutes of her time.

## Have the intake form read properly

`lib/intake.ts` is a first draft written by me. The health questions and
particularly the consent and release section should be read line by line, and
the release wording is worth a professional eye before she relies on it. It
is not legal advice.

## Microneedling

Announced as coming soon with no price or length. Moving it into `services`
in `lib/content.ts` makes it bookable; it needs both numbers first.

## Smaller things

- **The admin login has no rate limiting.** One password, unlimited guesses.
  The live password is also guessable: a common phrase plus the street
  number that used to be on the contact page.
- **The business card designs still show the street address**, which is now
  deliberately private on the site. The cards live in a Claude artifact.
- **The certifications on the About page are lorem ipsum.**
- **The hero photograph is AI generated.**
- **No sitemap, robots file or structured data**, which is most of what would
  help her show up in local searches for brows in Vancouver.
- **Nothing is tested.** The scheduling rules — overlaps, buffers, blocked
  time, timezones — are pure functions and would be straightforward to cover.
