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
  tagline: "Vancouver Esthetician",
  /** Shown in the hero, under the headline. */
  intro:
    "Brow lamination, threading, tinting, lash lifts and skin treatments in Vancouver.",
  /**
   * The longer version, for search results and link previews only. Those
   * want a fuller sentence than the page itself does.
   */
  description:
    "Brow lamination, threading, tinting, Korean lash lifts, microneedling and nano infusion in Vancouver. Fuller, softer, more defined brows, tailored to your face.",
  city: "Vancouver, BC",

  /**
   * Set `showAddress` back to true to publish the street address again —
   * the contact page swaps the area note for the address and a map, and the
   * calendar invite carries the full address rather than the area.
   */
  showAddress: false,
  /** How far the public location goes: enough to place her, no doorstep. */
  area: "South Vancouver, BC",
  street: "8138 Prince Edward Street",
  address: "8138 Prince Edward Street, Vancouver, BC",
  addressNote: "The exact address is sent once your appointment is confirmed.",

  instagram: "jcbeauty.van",
  instagramUrl: "https://www.instagram.com/jcbeauty.van/",

  email: "japman_chera@hotmail.com",
  /** Display format. The tel: link is derived from the digits. */
  phone: "(604) 396-3072" as string | null,
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
export type ServiceCategory = "brows" | "lashes" | "skin";

/** In the order they're listed on the site. */
export const serviceCategories: { id: ServiceCategory; label: string }[] = [
  { id: "brows", label: "Brows" },
  { id: "lashes", label: "Lashes" },
  { id: "skin", label: "Skin" },
];

export type Service = {
  slug: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  summary: string;
  details: string[];
  popular?: boolean;
};

/*
 * Prices and appointment lengths are Japman's, from October 2026. Waxing is
 * no longer offered at all, lamination clean-ups included: every brow
 * service is threading only.
 */
export const services: Service[] = [
  {
    slug: "brow-sculpt",
    name: "Brow Sculpt",
    category: "brows",
    price: 15,
    durationMinutes: 30,
    summary:
      "Brow mapping and threading, for a clean shape without any wax.",
    details: [
      "Brows mapped to your facial proportions",
      "Threaded rather than waxed, which suits more sensitive skin",
      "Great as a standalone maintenance visit",
    ],
  },
  {
    slug: "brow-sculpt-tint",
    name: "Brow Sculpt + Tint",
    category: "brows",
    price: 30,
    durationMinutes: 45,
    summary:
      "Brow mapping and threading, finished with a tint matched to your colouring.",
    details: [
      "Everything in the sculpt, plus a custom tint",
      "Tint shade matched to your hair and skin tone",
      "Tint typically lasts 2 to 4 weeks",
    ],
  },
  {
    slug: "brow-lamination",
    name: "Brow Lamination",
    category: "brows",
    price: 70,
    durationMinutes: 90,
    summary:
      "The lifted, brushed-up effect, for brows that sit fuller and softer.",
    details: [
      "Brows set in a lifted, brushed-up shape",
      "Strays tidied by threading, never wax",
      "Suits sparse or unruly brows particularly well",
      "Results typically last 6 to 8 weeks",
    ],
  },
  {
    slug: "brow-lamination-tint",
    name: "Brow Lamination + Tint",
    category: "brows",
    price: 80,
    durationMinutes: 105,
    summary:
      "Lamination with a tint, for the lifted effect with a little more definition.",
    details: [
      "The lift of a lamination, plus a custom tint",
      "Strays tidied by threading, never wax",
      "Most definition of any brow option",
      "Results typically last 6 to 8 weeks",
    ],
  },
  {
    slug: "korean-lash-lift",
    name: "Korean Lash Lift",
    category: "lashes",
    price: 70,
    durationMinutes: 90,
    summary:
      "A lift and set for your natural lashes, curling them upward so your eyes look more open. No extensions involved.",
    details: [
      "Works with your own lashes",
      "No extensions and no daily upkeep",
      "Results typically last 6 to 8 weeks",
      "Keep lashes dry for 24 hours afterwards",
    ],
  },
  {
    slug: "korean-lash-lift-tint",
    name: "Korean Lash Lift + Tint",
    category: "lashes",
    price: 80,
    durationMinutes: 105,
    summary:
      "A lash lift finished with a tint, so the lashes read darker and fuller without mascara.",
    details: [
      "Everything in the lash lift, plus a tint",
      "Darker lashes without daily mascara",
      "Results typically last 6 to 8 weeks",
    ],
  },
  /*
   * Skin. TODO: the summaries and details below are my wording, not
   * Japman's. Worth her reading them, particularly anything that sounds
   * like a promise about results.
   */
  {
    slug: "microneedling-pdrn",
    name: "Microneedling with PDRN",
    category: "skin",
    price: 150,
    durationMinutes: 90,
    summary:
      "Microneedling finished with a PDRN serum, for skin that looks smoother and more even.",
    details: [
      "Fine needles create tiny channels in the skin",
      "PDRN serum applied while those channels are open",
      "Expect some redness for a day or two afterwards",
    ],
  },
  {
    slug: "microneedling-exosomes",
    name: "Microneedling with Exosomes",
    category: "skin",
    price: 200,
    durationMinutes: 90,
    summary:
      "Microneedling finished with an exosome serum, for a brighter, more refreshed look.",
    details: [
      "Fine needles create tiny channels in the skin",
      "Exosome serum applied while those channels are open",
      "Expect some redness for a day or two afterwards",
    ],
  },
  {
    slug: "nano-infusion-pdrn",
    name: "Nano Infusion with PDRN",
    category: "skin",
    price: 150,
    durationMinutes: 90,
    summary:
      "A gentler, needle-free alternative to microneedling, pressing a PDRN serum into the skin's surface.",
    details: [
      "No needles, so little to no downtime",
      "PDRN serum worked into the skin's surface",
      "Suits more sensitive skin",
    ],
  },
  {
    slug: "nano-infusion-exosomes",
    name: "Nano Infusion with Exosomes",
    category: "skin",
    price: 200,
    durationMinutes: 90,
    summary:
      "A gentler, needle-free alternative to microneedling, pressing an exosome serum into the skin's surface.",
    details: [
      "No needles, so little to no downtime",
      "Exosome serum worked into the skin's surface",
      "Suits more sensitive skin",
    ],
  },
];

/**
 * Announced, but not bookable yet. Deliberately separate from `services`:
 * that array feeds the booking engine, so everything in it needs a real
 * price and length. Move an entry across once those are settled.
 */
export type UpcomingService = {
  name: string;
  summary: string;
};

export const comingSoon: UpcomingService[] = [];

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
 * Before and aftercare, per kind of service. Shown on the info page, and the
 * list for whatever someone is booking shows at the last booking step.
 *
 * The brow lists are from her PRE-APPT and AFTERCARE Instagram highlights.
 * TODO: the lash and skin lists are my wording, from standard practice.
 * Japman should check them against how she works.
 */
export type CareGuide = {
  category: ServiceCategory;
  before: string[];
  after: string[];
};

export const careGuides: CareGuide[] = [
  {
    category: "brows",
    before: [
      "Do NOT tweeze or trim your brows 3 to 4 weeks prior to your appointment.",
      "Avoid retinol, AHAs and exfoliants for at least 2 weeks prior to your appointment.",
      "You must be off Accutane for 6+ months.",
      "Avoid spray tans for 48 hours before and after your appointment.",
      "You must not be pregnant or breastfeeding.",
    ],
    after: [
      "Keep your brows dry for 24 hours.",
      "Avoid steam, saunas and heavy workouts for 24 hours.",
      "Apply castor oil every night and brush your brows.",
      "Please be gentle with your brows!",
    ],
  },
  {
    category: "lashes",
    before: [
      "Come without mascara or eye makeup.",
      "Contact lenses need to come out, so bring your case or wear glasses.",
      "Avoid a lash lift or perm in the 6 weeks before your appointment.",
      "You must not be pregnant or breastfeeding.",
    ],
    after: [
      "Keep your lashes dry for 24 hours.",
      "No mascara for 24 hours.",
      "Avoid steam, saunas and heavy workouts for 24 hours.",
      "Try not to sleep face down for the first night.",
      "Brush your lashes upward each morning.",
    ],
  },
  {
    category: "skin",
    before: [
      "Avoid retinol, exfoliating acids and scrubs for 10 days prior to your appointment.",
      "No Botox, fillers, peels or laser in the 2 weeks before.",
      "Stay out of the sun and avoid tanning, including self tan, for 2 weeks before.",
      "If you have a cold sore or breakout on your face, message me to reschedule.",
      "You must be off Accutane for 6+ months.",
      "You must not be pregnant or breastfeeding.",
    ],
    after: [
      "No makeup for 24 hours.",
      "Avoid sweating, saunas and heavy workouts for 48 hours.",
      "Wear SPF every day and stay out of direct sun for at least a week.",
      "Skip retinol, acids and exfoliants for 5 to 7 days.",
      "Use a gentle cleanser and keep your skin hydrated.",
      "Let any flaking come away on its own, no picking.",
    ],
  },
];

/** The care guide for whichever kind of service this is. */
export function careGuideFor(slug: string): CareGuide | undefined {
  const service = getService(slug);
  return service && careGuides.find((g) => g.category === service.category);
}

/**
 * The deposit amount, surfaced in the booking flow as well as the info page.
 * Set to null if she ever stops taking deposits.
 */
export const deposit = {
  /** The same on every service, including the $15 sculpt. */
  amount: 10,
  refundable: false,
  /** Where the deposit is sent. Follows her contact address unless changed. */
  etransferEmail: business.email,
};

/** Shown on the info page and at the final booking step. */
export const policies = [
  {
    title: "Deposit",
    body: `A non-refundable $${deposit.amount} deposit is required to secure your appointment.`,
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
    body: `Payments may be made by e-transfer to ${business.email}, or by cash. Payment must be completed before leaving your appointment.`,
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
   * Which part of the image the square tile keeps, as a CSS
   * object-position ("23% 50%"). Defaults to the centre, which on a wide
   * two-eye shot lands on the nose.
   */
  focus?: string;
  /**
   * When present, tapping the tile opens both shots full size with
   * before/after labels.
   */
  pair?: {
    before: GalleryImage;
    after: GalleryImage;
    /**
     * Width over height, when the pair isn't square. The comparison box is
     * one fixed shape for both shots, so a portrait pair needs telling or
     * it gets cropped top and bottom.
     */
    aspect?: number;
  };
};

export const gallery: GalleryItem[] = [
  // Real client work. Everything below marked "placeholder" is still artwork
  // waiting to be replaced the same way: drop the file into public/gallery/
  // and swap the src, alt and caption here.
  /*
   * Every real pair below has been aligned: the two shots were taken at
   * different distances and angles, so one is warped onto the other and
   * both are cropped to the brow, eye and nose bridge. Laid over each other
   * as they came, the face jumped as the slider moved. `aspect` is the
   * shape of that crop.
   */
  {
    // The tile always shows the finished result; the before is revealed on tap.
    src: "/gallery/brow-shaping-after.jpg",
    alt: "A client's brow after shaping, with a clean arch and a defined edge",
    caption: "Brow Shaping",
    pair: {
      aspect: 929 / 700,
      before: {
        src: "/gallery/brow-shaping-before.jpg",
        alt: "A client's natural brow before shaping, with stray hairs and a soft, undefined edge",
      },
      after: {
        src: "/gallery/brow-shaping-after.jpg",
        alt: "The same client's brow after shaping, with a clean arch and a defined edge",
      },
    },
  },  {
    src: "/gallery/korean-lash-lift-v4-after.jpg",
    alt: "A client's lashes after a Korean lash lift, curled upward and separated",
    caption: "Korean Lash Lift",
    pair: {
      aspect: 560 / 440,
      before: {
        src: "/gallery/korean-lash-lift-v4-before.jpg",
        alt: "A client's natural lashes before a Korean lash lift, straight and pointing down",
      },
      after: {
        src: "/gallery/korean-lash-lift-v4-after.jpg",
        alt: "The same client's lashes after a Korean lash lift, curled upward and separated",
      },
    },
  },
  {
    src: "/gallery/brow-sculpt-tint-after.jpg",
    alt: "A client's brow after sculpting and tinting, darker and cleanly shaped",
    caption: "Brow Sculpt + Tint",
    pair: {
      aspect: 1058 / 750,
      before: {
        src: "/gallery/brow-sculpt-tint-before.jpg",
        alt: "A client's brow before sculpting and tinting, fuller and softer with stray hairs above and below the arch",
      },
      after: {
        src: "/gallery/brow-sculpt-tint-after.jpg",
        alt: "The same client's brow after sculpting and tinting, darker and cleanly shaped",
      },
    },
  },
  {
    src: "/gallery/brow-lamination-after.jpg",
    alt: "A client's brow after lamination, brushed up, glossy and set in a lifted shape",
    caption: "Brow Lamination",
    pair: {
      // The two shots were taken at different distances with her head
      // slightly turned, so the after is warped onto the before and both are
      // cropped to the brow, eye and nose bridge, which is what lines up.
      aspect: 10 / 7,
      before: {
        src: "/gallery/brow-lamination-before.jpg",
        alt: "A client's natural brow before lamination, softer and growing in different directions",
      },
      after: {
        src: "/gallery/brow-lamination-after.jpg",
        alt: "The same client's brow after lamination, brushed up, glossy and set in a lifted shape",
      },
    },
  },
  {
    src: "/gallery/mens-brow-sculpt-v2-after.jpg",
    alt: "A client's brow after a men's sculpt, cleaned up and defined while staying natural",
    caption: "Men's Brow Sculpt",
    pair: {
      aspect: 870 / 600,
      before: {
        src: "/gallery/mens-brow-sculpt-v2-before.jpg",
        alt: "A client's brow before a men's sculpt, full with stray hairs between and around the brows",
      },
      after: {
        src: "/gallery/mens-brow-sculpt-v2-after.jpg",
        alt: "The same client's brow after a men's sculpt, cleaned up and defined while staying natural",
      },
    },
  },
  {
    src: "/gallery/brow-lamination-tint-close-after.jpg",
    alt: "A client's brows after lamination and tint, darker, fuller and brushed into a lifted shape",
    caption: "Brow Lamination + Tint",
    pair: {
      aspect: 410 / 310,
      before: {
        src: "/gallery/brow-lamination-tint-close-before.jpg",
        alt: "A client's natural brows before lamination and tint, light and sparse",
      },
      after: {
        src: "/gallery/brow-lamination-tint-close-after.jpg",
        alt: "The same client's brows after lamination and tint, darker, fuller and brushed into a lifted shape",
      },
    },
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
    "I'm an esthetician working from a private studio in Vancouver, specialising in brow lamination, sculpting, tinting, Korean lash lifts, microneedling and nano infusion.",
    "Every brow appointment starts with mapping your brows to your features, so the shape we land on suits your face rather than a template.",
    "I keep the studio small and book by appointment only, so you have my full attention from consultation to aftercare.",
    "Outside the studio, I love all things beauty, from makeup and hair to skin and I care just as much about health and fitness. I love cooking, being out in nature and travelling.",
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
    a: "Usually 6 to 8 weeks, depending on your hair type and how well you follow the aftercare. Most clients rebook around the 8 week mark. A lash lift lasts about as long.",
  },
  {
    q: "Does it hurt?",
    a: "Lamination, tinting and lash lifts are painless. Threading is a quick pinch for some people, though it's over in minutes. Microneedling feels like a light prickling. Nano infusion is gentler still.",
  },
  {
    q: "Can I wear makeup afterwards?",
    a: "Give the treated area 24 hours first, so no brow product after a brow service, no mascara after a lash lift and no makeup after a skin treatment. After that you're free to go back to your usual routine.",
  },
  {
    q: "Which service should I pick?",
    a: "For brows, start with the Brow Sculpt if you just want a clean shape. For the lifted, fuller look, Brow Lamination is the one and adding a tint gives the most definition. For lashes, the Korean Lash Lift curls your own lashes. For skin, nano infusion is the gentler, needle-free option while microneedling works deeper. Message me if you're not sure and I'll help you choose.",
  },
  {
    q: "How many skin treatments will I need?",
    a: "It depends on your skin and what you're after. Many people book a short course a few weeks apart. We'll talk it through at your consultation.",
  },
  {
    q: "Is a deposit required?",
    a: `Yes, a non-refundable $${deposit.amount} deposit secures your appointment, sent by e-transfer to ${deposit.etransferEmail}.`,
  },
  {
    q: "Do you see men?",
    a: "Absolutely. Men's brows, lash lifts and skin treatments are a regular part of what I do, with a focus on keeping things natural.",
  },
  {
    q: "What if I've never had a treatment like this before?",
    a: "That's very common. We'll talk through what you want at the start of the appointment and plan it together before anything begins.",
  },
];
