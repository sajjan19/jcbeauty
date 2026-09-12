/**
 * ─────────────────────────────────────────────────────────────
 *  EDIT THIS FILE TO CHANGE THE SITE.
 *
 *  Everything a non-developer would want to change lives here:
 *  business details, services, prices, hours, and policy text.
 *  Nothing else needs to be touched.
 *
 *  Anything marked TODO is a placeholder — swap in the real value.
 * ─────────────────────────────────────────────────────────────
 */

export const business = {
  name: "JC Beauty",
  artist: "Japman Chera",
  tagline: "Vancouver Brow and Lash Artist",
  /** Shown in the hero. One or two sentences. */
  intro:
    "Brow lamination, shaping, tinting and lash lifts in Vancouver. Fuller, softer, more defined brows, tailored to your face.",
  city: "Vancouver, BC",

  /**
   * Set `showAddress` back to false to hide the street address everywhere —
   * the site then falls back to `addressNote` and only the city is public.
   */
  showAddress: true,
  street: "8138 Prince Edward Street",
  address: "8138 Prince Edward Street, Vancouver, BC",
  addressNote: "Exact address is sent once your appointment is confirmed.",

  instagram: "jcbeauty.van",
  instagramUrl: "https://www.instagram.com/jcbeauty.van/",

  // TODO: replace with her real business email
  email: "TODO@example.com",
  /** Display format. The tel: link is derived from the digits. */
  phone: "(778) 994-8138" as string | null,
};

/** A `tel:` href built from whatever digits are in `business.phone`. */
export function phoneHref(): string | null {
  if (!business.phone) return null;
  const digits = business.phone.replace(/\D/g, "");
  return `tel:+1${digits}`;
}

/** Opens the studio address in whichever maps app the device prefers. */
export function mapsUrl(): string {
  return `https://maps.google.com/?q=${encodeURIComponent(business.address)}`;
}

/**
 * Embeddable map of the studio. Uses Google's keyless embed, so there's no
 * API key to manage or bill. If it ever stops working, the official
 * replacement is the Maps Embed API, which does need a (free) key.
 */
export function mapEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    business.address,
  )}&output=embed`;
}

/**
 * Services offered.
 *
 * `durationMinutes` drives the booking calendar — a 60 minute service
 * only offers slots with 60 free minutes after them. Keep it accurate.
 *
 * `price` is in whole dollars.
 */
export type Service = {
  slug: string;
  name: string;
  price: number;
  durationMinutes: number;
  summary: string;
  details: string[];
  popular?: boolean;
};

// Prices and descriptions are taken from her Instagram price list.
// TODO: the `durationMinutes` values are estimates — she needs to confirm
// them, because they decide how much time each booking blocks off.
export const services: Service[] = [
  {
    slug: "brow-shape-wax",
    name: "Brow Shape & Wax",
    price: 35,
    durationMinutes: 30,
    summary:
      "Simple brow package option that includes brow mapping and waxing. (Threading also available)",
    details: [
      "Brows mapped to your facial proportions",
      "Waxing, or threading if you prefer",
      "Great as a standalone maintenance visit",
    ],
  },
  {
    slug: "brow-shape-tint",
    name: "Brow Shape & Tint",
    price: 45,
    durationMinutes: 45,
    summary:
      "Brow package option that includes brow mapping, tinting and waxing.",
    details: [
      "Everything in the shape & wax, plus a custom tint",
      "Tint shade matched to your hair and skin tone",
      "Tint typically lasts 2 to 4 weeks",
    ],
  },
  {
    slug: "brow-lamination-only",
    name: "Brow Lamination Only",
    price: 65,
    durationMinutes: 45,
    summary:
      "Perfect for clients that want the lifted effect from a lamination. Does NOT include shape, wax or tint.",
    details: [
      "The lifted, brushed-up effect on its own",
      "No shaping, waxing, or tinting included",
      "Results typically last 6 to 8 weeks",
    ],
  },
  {
    slug: "naked-brow-lamination",
    name: "Naked Brow Lamination",
    price: 95,
    durationMinutes: 60,
    summary:
      "Brow lamination, mapping and waxing. Perfect for those wanting a natural look.",
    details: [
      "Lamination with a full shape and wax",
      "No tint, which keeps things soft and natural",
      "Results typically last 6 to 8 weeks",
    ],
    popular: true,
  },
  {
    slug: "signature-brow-lamination",
    name: "Signature Brow Lamination Package",
    price: 105,
    durationMinutes: 75,
    summary:
      "A full package including brow lamination, mapping, tinting and waxing. Perfect for those wanting the lifted effect of brow lamination with a little more definition.",
    details: [
      "The complete service: lamination, mapping, tint and wax",
      "Most definition of any option",
      "Results typically last 6 to 8 weeks",
    ],
    popular: true,
  },
  {
    slug: "lash-lift",
    name: "Lash Lift",
    // TODO: PLACEHOLDER price and length, both invented. Confirm with Japman
    // before quoting anyone. The length matters most, since it decides how
    // much time each booking blocks off in her calendar.
    price: 75,
    durationMinutes: 60,
    summary:
      "A lift and set for your natural lashes, curling them upward so your eyes look more open. No extensions involved.",
    details: [
      "Works with your own lashes",
      "No extensions and no daily upkeep",
      "Results typically last 6 to 8 weeks",
      "Keep lashes dry for 24 hours afterwards",
    ],
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/**
 * Weekly availability.
 *
 * Times are 24-hour "HH:MM" in the studio's local timezone.
 * Set a day to `null` to close it entirely.
 */
export type DayHours = { open: string; close: string } | null;

export const hours: Record<number, DayHours> = {
  0: { open: "10:00", close: "18:00" }, // Sunday
  1: { open: "10:00", close: "18:00" }, // Monday
  2: { open: "10:00", close: "18:00" }, // Tuesday
  3: { open: "10:00", close: "18:00" }, // Wednesday
  4: { open: "10:00", close: "18:00" }, // Thursday
  5: { open: "10:00", close: "18:00" }, // Friday
  6: { open: "10:00", close: "18:00" }, // Saturday
};

export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const scheduling = {
  /** Booking slots start every N minutes (e.g. 10:00, 10:15, 10:30…). */
  slotIntervalMinutes: 15,
  /** Clients can't book anything sooner than this many hours from now. */
  minimumNoticeHours: 24,
  /** How far ahead the calendar opens. */
  maximumDaysAhead: 60,
  /** Buffer added after each appointment for cleanup. */
  bufferMinutes: 15,
  /** IANA timezone the studio operates in. */
  timezone: "America/Vancouver",
};

/**
 * Shown on the info page and at the last booking step.
 * Taken from her PRE-APPT Instagram highlight.
 */
export const preAppointment = [
  "Do NOT tweeze or trim your brows 3 to 4 weeks prior to your appointment.",
  "Avoid retinol, AHAs and exfoliants for at least 2 weeks prior to your appointment.",
  "You must be off Accutane for 6+ months.",
  "Avoid spray tans for 48 hours before and after your appointment.",
  "You must not be pregnant or breastfeeding.",
];

/** Shown on the info page. Taken from her AFTERCARE Instagram highlight. */
export const aftercare = [
  "Keep your brows dry for 24 hours.",
  "Avoid steam, saunas and heavy workouts for 24 hours.",
  "Apply castor oil every night and brush your brows.",
  "Please be gentle with your brows!",
];

/**
 * The deposit amount, surfaced in the booking flow as well as the info page.
 * Set to null if she ever stops taking deposits.
 */
export const deposit = {
  amount: 25,
  refundable: false,
};

/** Shown on the info page and at the final booking step. */
export const policies = [
  {
    title: "Deposit",
    body: "A non-refundable $25 deposit is required to secure your appointment.",
  },
  {
    title: "Late policy",
    body: "A 10-minute grace period will be given to clients running late. If you arrive more than 15 minutes late, your appointment will be cancelled and your deposit will be forfeited.",
  },
  {
    title: "Cancellation & rescheduling",
    body: "A minimum of 24 hours' notice is required to cancel or reschedule your appointment. If less than 24 hours' notice is given, your deposit will be forfeited.",
  },
  {
    title: "Payment",
    body: "Payments may be made by e-transfer or cash. Payment must be completed before leaving your appointment.",
  },
];

/**
 * Gallery images.
 *
 * Drop files into /public/gallery/ and list them here.
 * TODO: replace these placeholders with her real before/after photos.
 */
export type GalleryImage = { src: string; alt: string };

export type GalleryItem = {
  /** The tile image. For a pair, this is the combined side-by-side shot. */
  src: string;
  alt: string;
  caption: string;
  /**
   * When present, tapping the tile opens both shots full size with
   * before/after labels.
   */
  pair?: { before: GalleryImage; after: GalleryImage };
};

export const gallery: GalleryItem[] = [
  // Real client work. Everything below marked "placeholder" is still artwork
  // waiting to be replaced the same way: drop the file into public/gallery/
  // and swap the src, alt and caption here.
  {
    // The tile always shows the finished result; the before is revealed on tap.
    src: "/gallery/brow-shape-wax-after.jpeg",
    alt: "A client's brow after shaping and waxing, with a clean arch and a defined edge",
    caption: "Brow Shape & Wax",
    pair: {
      before: {
        src: "/gallery/brow-shape-wax-before.jpeg",
        alt: "A client's natural brow before shaping and waxing, with stray hairs and a soft, undefined edge",
      },
      after: {
        src: "/gallery/brow-shape-wax-after.jpeg",
        alt: "The same client's brow after shaping and waxing, with a clean arch and a defined edge",
      },
    },
  },
  {
    src: "/gallery/placeholder-1.svg",
    alt: "Placeholder artwork for a brow lamination before and after",
    caption: "Brow Lamination",
  },
  {
    src: "/gallery/placeholder-2.svg",
    alt: "Placeholder artwork for a lamination and tint before and after",
    caption: "Lamination + Tint",
  },
  {
    src: "/gallery/placeholder-4.svg",
    alt: "Placeholder artwork for a brow shape and tint before and after",
    caption: "Brow Shape & Tint",
  },
  {
    src: "/gallery/placeholder-5.svg",
    alt: "Placeholder artwork for a men's brow shaping before and after",
    caption: "Men's Brow Shaping",
  },
  {
    src: "/gallery/placeholder-6.svg",
    alt: "Placeholder artwork for a naked lamination before and after",
    caption: "Naked Lamination",
  },
];

/** Short answers shown on the info page. */
/**
 * The About page.
 *
 * TODO: the bio below is written only from facts already confirmed (her
 * Instagram, services and studio). Replace it with Japman's own words.
 */
export type Certification = {
  name: string;
  /** The academy, brand or body that issued it. */
  issuer: string;
  year?: number;
};

/**
 * The home page hero.
 *
 * Drop a photo into public/home/ and set `photo` to its path, e.g.
 * "/home/hero.jpg". Leave it null and the logo lockup shows instead.
 * Portrait orientation suits the arch best (4:5, at least 1200x1500).
 *
 * Use a real photograph. An AI-generated image here would misrepresent
 * Japman, her studio and her work to people deciding whether to book.
 */
export const home = {
  // NOTE: this hero image is AI-generated, not a photograph of Japman or
  // her studio. Swap in a real photo when one is available.
  photo: "/home/hero.jpg" as string | null,
  photoAlt: "Brow threading in progress at the JC Beauty studio",
};

export const about = {
  headline: "Hi, I'm Japman.",
  paragraphs: [
    "I'm a brow and lash artist working from a private studio in Vancouver, specialising in brow lamination, shaping, waxing, tinting and lash lifts.",
    "Every appointment starts with mapping your brows to your features, so the shape we land on suits your face rather than a template.",
    "I keep the studio small and book by appointment only, so you have my full attention from consultation to aftercare.",
    "Outside the studio, I love technology and travelling. Discovering new tools at home and new beauty traditions abroad keeps inspiring the way I work.",
  ],
  /**
   * Put a portrait in public/about/ and set the path, e.g. "/about/japman.jpg".
   * Leave null to show the logo instead.
   */
  portrait: "/about/japman.jpg" as string | null,
  /**
   * TODO: lorem ipsum placeholders — replace with her real certifications.
   * Keep them obviously fake until then, so nothing reads as a real
   * credential. Emptying the list hides the section entirely.
   */
  certifications: [
    { name: "Lorem Ipsum Dolor", issuer: "Consectetur Academy", year: 2024 },
    { name: "Sit Amet Certificate", issuer: "Adipiscing Institute", year: 2024 },
    { name: "Elit Sed Do", issuer: "Eiusmod Tempor Studio", year: 2025 },
  ] as Certification[],
};

export const faqs = [
  {
    q: "How long does brow lamination last?",
    a: "Usually 6 to 8 weeks, depending on your hair type and how well you follow the aftercare. Most clients rebook around the 8 week mark.",
  },
  {
    q: "Does it hurt?",
    a: "Lamination and tinting are painless. Shaping involves waxing or tweezing, which some people find briefly uncomfortable, but it's over quickly.",
  },
  {
    q: "Can I wear makeup afterwards?",
    a: "Keep the brow area dry and product-free for the first 24 hours. After that, you're free to do your usual routine, though most clients find they need much less brow product.",
  },
  {
    q: "Which service should I pick?",
    a: "If you just want a clean shape, start with Brow Shape & Wax. If you want the lifted, fuller look, the Signature package is the complete option, while Naked Lamination gives the same lift with a softer, untinted finish. Message me if you're not sure and I'll help you choose.",
  },
  {
    q: "Is a deposit required?",
    a: "Yes, a non-refundable $25 deposit secures your appointment. I'll send the details once your requested time is confirmed.",
  },
  {
    q: "Do you do men's brows?",
    a: "Absolutely. Men's shaping and lamination are a regular part of what I do, with a focus on keeping things natural.",
  },
  {
    q: "What if I've never had my brows done before?",
    a: "That's very common. We'll talk through what you want at the start of the appointment and map your shape together before anything begins.",
  },
];
