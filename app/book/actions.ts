"use server";

import { getService } from "@/lib/content";
import {
  createBooking,
  getAvailableSlots,
  getMonthAvailability,
} from "@/lib/bookings";

/**
 * Read-side helpers the booking client calls as the user moves through the
 * steps. These are public on purpose — they only ever expose whether a slot
 * is free, never who booked it.
 */

export async function fetchMonthAvailability(
  serviceSlug: string,
  year: number,
  month: number,
): Promise<Record<string, boolean>> {
  if (!getService(serviceSlug)) return {};
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return {};
  if (!Number.isInteger(month) || month < 1 || month > 12) return {};
  return getMonthAvailability(serviceSlug, year, month);
}

export async function fetchSlots(
  serviceSlug: string,
  date: string,
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return getAvailableSlots(serviceSlug, date);
}

/* ── Submission ────────────────────────────────────────── */

export type BookingFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  reference?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const serviceSlug = String(formData.get("service") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const firstTime = formData.get("firstTime") === "on";
  const agreed = formData.get("agree") === "on";

  const fieldErrors: Record<string, string> = {};

  if (!name) fieldErrors.name = "Please tell me your name.";
  else if (name.length > 100) fieldErrors.name = "That name is too long.";

  if (!email) fieldErrors.email = "An email is needed to confirm your booking.";
  else if (!EMAIL_RE.test(email))
    fieldErrors.email = "That doesn't look like a valid email.";

  if (!phone) fieldErrors.phone = "A phone number is needed for reminders.";
  else if (phone.replace(/\D/g, "").length < 7)
    fieldErrors.phone = "That doesn't look like a full phone number.";

  if (notes.length > 1000)
    fieldErrors.notes = "Please keep notes under 1000 characters.";

  if (!agreed)
    fieldErrors.agree = "Please confirm you've read the booking policies.";

  if (!serviceSlug || !date || !time) {
    return {
      status: "error",
      message: "Something went missing. Please pick your service and time again.",
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  // The database re-checks availability inside a transaction, so a slot taken
  // while this form was open is caught here rather than double-booked.
  const result = createBooking({
    serviceSlug,
    date,
    time,
    name,
    email,
    phone,
    notes,
    firstTime,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  return {
    status: "success",
    reference: result.booking.reference,
  };
}
