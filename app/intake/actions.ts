"use server";

import { getService } from "@/lib/content";
import {
  intakeConsents,
  intakePhotoConsent,
  sectionsForService,
} from "@/lib/intake";
import { saveIntakeForm } from "@/lib/intake-store";

export type IntakeState = {
  status: "idle" | "error" | "success";
  message?: string;
  signedFor?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitIntakeForm(
  _prev: IntakeState,
  formData: FormData,
): Promise<IntakeState> {
  const serviceSlug = String(formData.get("service") ?? "");
  const service = getService(serviceSlug);
  if (!service) {
    return { status: "error", message: "Please choose a service." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();

  if (!name) return { status: "error", message: "Please add your name." };
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Please add a valid email address." };
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return { status: "error", message: "Please add a phone number." };
  }

  // Every consent has to be ticked; the photo one is deliberately optional.
  const consents = intakeConsents
    .filter((c) => formData.get(`consent-${c.id}`) === "on")
    .map((c) => c.id);

  if (consents.length !== intakeConsents.length) {
    return {
      status: "error",
      message:
        "Please tick every box in the agreement. Anything you can't agree to is worth a message before your appointment instead.",
    };
  }

  if (!signature) {
    return {
      status: "error",
      message: "Please type your full name to sign.",
    };
  }

  // Keeps the question wording alongside the answer, so a form read back in
  // a year still makes sense even if the questions have changed since.
  const answers: { id: string; label: string; value: string }[] = [];
  for (const section of sectionsForService(serviceSlug)) {
    for (const question of section.questions) {
      const value = String(formData.get(question.id) ?? "").trim();
      if (value) answers.push({ id: question.id, label: question.label, value });
    }
  }

  saveIntakeForm({
    clientName: name,
    email,
    phone,
    serviceSlug,
    serviceName: service.name,
    answers,
    consents,
    photoConsent: formData.get(`consent-${intakePhotoConsent.id}`) === "on",
    signature,
  });

  return { status: "success", signedFor: service.name };
}
