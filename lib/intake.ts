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
  /** "yesno" asks for a yes or no with room to explain; "text" is a box. */
  type: "yesno" | "text";
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
const LASH = ["korean-lash-lift", "korean-lash-lift-tint"];

export const intakeSections: IntakeSection[] = [
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
        id: "skin-conditions",
        label:
          "Do you have eczema, psoriasis, dermatitis, rosacea, or any broken or irritated skin near the brows or eyes?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "cold-sores",
        label: "Do you get cold sores around the eyes or brows?",
        type: "yesno",
      },
      {
        id: "medication",
        label:
          "Are you taking any medication that affects your skin or healing, including blood thinners?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "previous-reaction",
        label:
          "Have you ever reacted badly to a tint, lamination, threading or lash treatment?",
        type: "yesno",
        flagOnYes: true,
      },
    ],
  },
  {
    id: "skin-prep",
    title: "Skin in the last few weeks",
    blurb:
      "Threading lifts the top layer of skin with it. These make that riskier, and are the usual reason an appointment gets rescheduled.",
    appliesTo: THREADING,
    questions: [
      {
        id: "accutane",
        label:
          "Are you on Accutane or isotretinoin, or have you been in the last six months?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "retinoids",
        label:
          "Are you using retinol, tretinoin, AHAs, BHAs or benzoyl peroxide on or near the brow area?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "resurfacing",
        label:
          "Have you had a chemical peel, laser, microdermabrasion or microneedling in the last two weeks?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "sunburn",
        label: "Is the area sunburnt, newly tanned, or recently treated?",
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
      "Your eyes stay closed throughout a lash lift, and the solution sits close to the lash line.",
    appliesTo: LASH,
    questions: [
      {
        id: "eye-conditions",
        label:
          "Do you have any eye condition, infection, or recent eye surgery, including laser?",
        type: "yesno",
        flagOnYes: true,
      },
      {
        id: "contacts",
        label: "Do you wear contact lenses?",
        type: "yesno",
      },
      {
        id: "extensions",
        label: "Do you currently have lash extensions or a previous lift?",
        type: "yesno",
      },
      {
        id: "dry-eye",
        label: "Do you get dry, watery or easily irritated eyes?",
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

/** Ticked individually. Every one of these is required to go ahead. */
export const intakeConsents: { id: string; label: string }[] = [
  {
    id: "accurate",
    label:
      "Everything I've written here is accurate and complete, and I'll tell Japman if my health or medication changes before my appointment.",
  },
  {
    id: "results-vary",
    label:
      "I understand results vary with my own hair and skin, and that no particular result is guaranteed.",
  },
  {
    id: "aftercare",
    label:
      "I've read the aftercare and understand that following it is my responsibility, and that not following it can affect how my results last.",
  },
  {
    id: "risks",
    label:
      "I understand there is a small risk of redness, irritation or an allergic reaction, and that I should contact a doctor if I'm worried after my appointment.",
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
    "You may take before and after photos of my brows or lashes and use them on your website and social media. My face will not be identifiable unless I say otherwise.",
};

/** Which sections a given service asks about. */
export function sectionsForService(slug: string): IntakeSection[] {
  return intakeSections.filter(
    (section) => !section.appliesTo || section.appliesTo.includes(slug),
  );
}
