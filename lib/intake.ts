/*
 * Client intake and consent form.
 *
 * A separate form is signed per service, not per client: the questions that
 * matter for a lash lift are not the ones that matter for a brow tint,
 * which is why a returning client booking something new fills one in again.
 *
 * SAMPLE WORDING. Japman should read every line and change anything that
 * isn't how she works, and the consent and release section in particular is
 * worth putting in front of someone qualified before it's relied on. It is
 * not legal advice.
 */

export type IntakeQuestion = {
  id: string;
  label: string;
  /**
   * "yesno" asks for a yes or no; "text" is an optional box; "line" is a
   * single required line, for short facts like a phone number.
   */
  type: "yesno" | "text" | "line";
  /** A yes here is worth talking about before starting. */
  flagOnYes?: boolean;
};

export type IntakeSection = {
  id: string;
  title: string;
  blurb?: string;
  questions: IntakeQuestion[];
  /** Service slugs this section applies to. Absent means every service. */
  appliesTo?: string[];
};

const LAMINATION = ["brow-lamination", "brow-lamination-tint"];
const TINT = [
  "brow-sculpt-tint",
  "brow-lamination-tint",
  "korean-lash-lift-tint",
];
const THREADING = ["brow-sculpt", "brow-sculpt-tint"];
const BROWS = [...THREADING, ...LAMINATION];
const LASH = ["korean-lash-lift", "korean-lash-lift-tint"];
const SKIN = [
  "microneedling-pdrn",
  "microneedling-exosomes",
  "nano-infusion-pdrn",
  "nano-infusion-exosomes",
];
const MICRONEEDLING = ["microneedling-pdrn", "microneedling-exosomes"];

export const intakeSections: IntakeSection[] = [
  {
    id: "emergency",
    title: "Emergency contact",
    blurb: "Someone I can call if anything goes wrong during your appointment.",
    questions: [
      { id: "emergency-name", label: "Emergency contact's full name", type: "line" },
      { id: "emergency-phone", label: "Emergency contact's phone number", type: "line" },
      {
        id: "emergency-relationship",
        label: "How you know your emergency contact (partner, parent, friend…)",
        type: "line",
      },
    ],
  },
  {
    id: "health",
    title: "Health and skin",
    blurb:
      "This is about keeping your skin safe, not about turning anyone away. A yes to any of these usually just means we talk it through first.",
    questions: [
      {
        id: "pregnant",
        label: "Are you pregnant or breastfeeding?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "allergies",
        label:
          "Do you have any allergies, including to dyes, latex, adhesives, nickel or fragrance?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "sensitive-skin",
        label:
          "Is your skin sensitive, meaning it goes red or reacts easily to new products?",
        type: "yesno",
      },
      {
        id: "skin-conditions",
        label:
          "Do you have eczema, psoriasis, dermatitis, rosacea, an infection, or any broken or irritated skin in the area being treated?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "cold-sores",
        label: "Do you get cold sores?",
        type: "yesno",
      },
      {
        id: "medication",
        label:
          "Are you taking any medication, supplements or herbal remedies that affect your skin or healing, including blood thinners?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "accutane",
        label:
          "Are you on Accutane or isotretinoin, or any other prescription acne treatment, or have you been in the last six months?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "previous-reaction",
        label:
          "Have you ever reacted badly to a tint, lamination, threading, lash or skin treatment?",
        type: "yesno",
        flagOnYes: true,
      },
    ],
  },
  {
    id: "skin-prep",
    title: "Your brows in the last few weeks",
    blurb:
      "Threading lifts the top layer of skin with it and lamination is a chemical treatment. These make either riskier and are the usual reason an appointment gets rescheduled.",
    appliesTo: BROWS,
    questions: [
      {
        id: "retinoids",
        label:
          "In the last two weeks, have you used retinol, tretinoin, AHAs (like glycolic acid), BHAs (like salicylic acid) or benzoyl peroxide on or near your brows?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "resurfacing",
        label:
          "Have you had a facial, chemical peel, laser, microdermabrasion or microneedling in the last three weeks?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "brow-tattoo",
        label:
          "Have you had your brows tattooed, microbladed or powdered in the last three months?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "sunburn",
        label:
          "Have you had a spray or self tan on your face in the last 48 hours, or is the area sunburnt?",
        type: "yesno",
      },
    ],
  },
  {
    id: "patch-test",
    title: "Patch test",
    blurb:
      "Tint and lamination both use products that a small number of people react to. A patch test is done at least 48 hours beforehand.",
    appliesTo: [...new Set([...TINT, ...LAMINATION])],
    questions: [
      {
        id: "tinted-before",
        label: "Have you had your brows or lashes tinted before?",
        type: "yesno",
      },
      {
        id: "patch-done",
        label: "Have you had a patch test for this service with me before?",
        type: "yesno",
      },
      {
        id: "patch-declined",
        label:
          "If you are choosing to go ahead without a patch test today, please say so here.",
        type: "text",
      },
    ],
  },
  {
    id: "lashes",
    title: "Your eyes",
    blurb:
      "Your eyes stay closed throughout a lash lift and the solution sits close to the lash line.",
    appliesTo: LASH,
    questions: [
      {
        id: "eye-conditions",
        label:
          "Do you have any eye condition or infection, such as conjunctivitis or a stye, or have you had eye surgery, including laser, in the last six months?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "contacts",
        label:
          "Do you wear contact lenses? Please bring your case, as they need to come out.",
        type: "yesno",
      },
      {
        id: "extensions",
        label:
          "Do you currently have lash extensions, or have you had a lash lift in the last six weeks?",
        type: "yesno",
      },
      {
        id: "dry-eye",
        label: "Do you get dry, watery or easily irritated eyes?",
        type: "yesno",
      },
      {
        id: "lash-growth-serum",
        label: "Do you use a lash growth serum?",
        type: "yesno",
      },
    ],
  },
  {
    id: "skin-history",
    title: "Your skin",
    blurb:
      "Skin treatments affect the whole face, so these matter more than they do for brows. A yes doesn't rule anything out, but some mean waiting, or checking with your doctor first.",
    appliesTo: SKIN,
    questions: [
      {
        id: "skin-type",
        label:
          "How would you describe your skin? (Oily, dry, combination, acne-prone, sensitive, normal…)",
        type: "text",
      },
      {
        id: "skin-routine",
        label: "What's your usual skincare routine, morning and night?",
        type: "text",
      },
      {
        id: "skin-retinoids",
        label:
          "In the last ten days, have you used retinol, tretinoin, or any exfoliating acid on your face?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "active-breakout",
        label:
          "Do you have an active breakout, open wound, or any cold sore on your face right now?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "sun-exposure",
        label:
          "Have you had a lot of sun, a sunburn or a tan, including self tan, in the last two weeks?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "recent-procedures",
        label:
          "In the last two weeks, have you had Botox, fillers, a peel, laser or any facial surgery?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "healing",
        label:
          "Do you have diabetes, an autoimmune condition, or anything else that slows healing?",
        type: "yesno",
        flagOnYes: true,
      },
    ],
  },
  {
    id: "needling",
    title: "Before microneedling",
    blurb:
      "Microneedling makes tiny, controlled punctures in the skin, so how your skin heals and scars matters.",
    appliesTo: MICRONEEDLING,
    questions: [
      {
        id: "scarring",
        label:
          "Do you scar easily, or have you ever had keloid or raised scars?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "bruising",
        label: "Do you bruise easily or bleed for longer than usual?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "pigmentation",
        label:
          "Has your skin ever darkened or lightened in patches after a spot, cut or treatment?",
        type: "yesno",
      },
    ],
  },
  {
    id: "today",
    title: "What you're after",
    questions: [
      {
        id: "goal",
        label: "What would you like out of today's appointment?",
        type: "text",
      },
      {
        id: "anything-else",
        label: "Anything else I should know?",
        type: "text",
      },
    ],
  },
];

export type IntakeConsent = {
  id: string;
  label: string;
  /** Service slugs this applies to. Absent means every service. */
  appliesTo?: string[];
};

/** Ticked individually. Every one that applies is required to go ahead. */
export const intakeConsents: IntakeConsent[] = [
  {
    id: "accurate",
    label:
      "Everything I've written here is accurate and complete and I'll tell Japman if my health or medication changes before my appointment.",
  },
  {
    id: "results-vary",
    label:
      "I understand results vary with my own hair and skin and that no particular result is guaranteed.",
  },
  {
    id: "brow-change",
    label:
      "I understand my brows will be reshaped and that any tint can stain the skin around them for a few days.",
    appliesTo: BROWS,
  },
  {
    id: "risks",
    label:
      "I understand there is a small risk of redness, irritation or an allergic reaction and that I should contact a doctor if I'm worried after my appointment.",
  },
  {
    id: "skin-risks",
    label:
      "I understand this treatment can cause redness, swelling, tenderness, pinpoint bleeding, temporary changes in skin colour, breakouts and, rarely, infection or scarring.",
    appliesTo: SKIN,
  },
  {
    id: "not-medical",
    label:
      "I understand this is a cosmetic treatment, not medical care and that Japman may ask me to check with my doctor first.",
    appliesTo: SKIN,
  },
  {
    id: "stop",
    label:
      "I'll speak up about any pain or discomfort. I can ask to stop at any time and Japman may pause or not finish the service if a reaction or safety concern comes up.",
  },
  {
    id: "report-reaction",
    label:
      "If I think I'm reacting to anything after my appointment, I'll let Japman know within 48 hours.",
  },
  {
    id: "aftercare",
    label:
      "I've read the aftercare and understand that following it is my responsibility and that not following it can affect how my results last.",
  },
  {
    id: "policies",
    label:
      "I've read the booking policies, including the deposit and the 24 hours notice needed to change or cancel.",
  },
];

/** Opt in, not required: the appointment goes ahead either way. */
export const intakePhotoConsent = {
  id: "photos",
  label:
    "You may take before and after photos and use them on your website and social media. My face will not be identifiable unless I say otherwise.",
};

/** Which agreement lines a given service asks for. */
export function consentsForService(slug: string): IntakeConsent[] {
  return intakeConsents.filter(
    (consent) => !consent.appliesTo || consent.appliesTo.includes(slug),
  );
}

/** Which sections a given service asks about. */
export function sectionsForService(slug: string): IntakeSection[] {
  return intakeSections.filter(
    (section) => !section.appliesTo || section.appliesTo.includes(slug),
  );
}
