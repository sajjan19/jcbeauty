"use server";

import { revalidatePath } from "next/cache";
import {
  endAdminSession,
  isPasswordValid,
  requireAdmin,
  startAdminSession,
} from "@/lib/auth";
import {
  blockPeriod,
  blockPeriodRange,
  createBookingAsAdmin,
  createClient,
  deleteClient,
  rescheduleBooking,
  setBookingStatus,
  updateClient,
  unblockPeriod,
  updateBlockedPeriod,
  type BookingStatus,
} from "@/lib/bookings";
import { formatDateLong, formatTime12, parseTime } from "@/lib/time";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!password) return { error: "Please enter your password." };

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
    return {
      error:
        "Admin isn't configured yet. Set ADMIN_PASSWORD and ADMIN_SECRET in .env.local.",
    };
  }

  if (!isPasswordValid(password)) {
    return { error: "That password isn't right." };
  }

  await startAdminSession();
  revalidatePath("/admin");
  return {};
}

export async function logout(): Promise<void> {
  await endAdminSession();
  revalidatePath("/admin");
}

/*
 * Every mutation below re-checks the session. Server Functions can be POSTed
 * to directly, so the button being hidden is not protection on its own.
 */

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));

  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid booking.");
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    throw new Error("Invalid status.");
  }

  setBookingStatus(id, status as BookingStatus);
  revalidatePath("/admin");
}

export type AddBookingState = { error?: string; added?: string };

/** Records an appointment she took by phone, DM or in person. */
export async function addBooking(
  _prev: AddBookingState,
  formData: FormData,
): Promise<AddBookingState> {
  await requireAdmin();

  const serviceSlug = String(formData.get("service") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? "confirmed");

  if (!name) return { error: "Add a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Pick a start time." };
  if (!["pending", "confirmed"].includes(status)) {
    return { error: "Invalid status." };
  }

  const result = createBookingAsAdmin({
    serviceSlug,
    date,
    time,
    name,
    email,
    phone,
    notes,
    status: status as BookingStatus,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { added: `${name} booked in for ${date} at ${time}.` };
}

export type RescheduleState = { error?: string; moved?: string };

/** Moves an appointment to a new date and time. */
export async function rescheduleAppointment(
  _prev: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid appointment." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Pick a start time." };

  const result = rescheduleBooking(id, date, time);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { moved: `Moved to ${date} at ${time}.` };
}

export type AddClientState = { error?: string; added?: string };

export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Add a name." };
  if (!email && !phone) {
    return { error: "Add an email or a phone number so you can reach them." };
  }

  const result = createClient(name, email, phone, notes || null);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { added: `${name} saved to contacts.` };
}

export type SaveClientState = { error?: string; saved?: string };

/** Edits a contact's name, phone, email and notes. */
export async function saveClientDetails(
  _prev: SaveClientState,
  formData: FormData,
): Promise<SaveClientState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid contact." };
  if (!name) return { error: "Add a name." };
  if (!email && !phone) {
    return { error: "Add an email or a phone number so you can reach them." };
  }

  const result = updateClient(id, name, email, phone, notes || null);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { saved: "Details saved." };
}

/** Removes the contact. Their past bookings are kept. */
export async function removeClient(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid contact.");

  deleteClient(id);
  revalidatePath("/admin");
}

export type BlockTimeState = { error?: string; done?: string };

/** The date, hours and reason shared by blocking time and editing it. */
function readBlockFields(formData: FormData):
  | { ok: true; date: string; start: number | null; end: number | null; reason: string | null; window: string }
  | { ok: false; error: string } {
  const date = String(formData.get("date") ?? "");
  const mode = String(formData.get("mode") ?? "day");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Pick a date." };

  if (mode !== "time") {
    return { ok: true, date, start: null, end: null, reason: reason || null, window: "the whole day" };
  }

  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
    return { ok: false, error: "Pick a start and end time." };
  }

  const start = parseTime(from);
  const end = parseTime(to);
  if (end <= start) return { ok: false, error: "The end time must be after the start." };

  return {
    ok: true,
    date,
    start,
    end,
    reason: reason || null,
    window: `${formatTime12(start)} to ${formatTime12(end)}`,
  };
}

/**
 * Blocks a whole day, a window within one, or a run of days. Lives in a
 * pop-up, so problems come back as a message rather than an error page.
 */
export async function blockTime(
  _prev: BlockTimeState,
  formData: FormData,
): Promise<BlockTimeState> {
  await requireAdmin();

  const fields = readBlockFields(formData);
  if (!fields.ok) return { error: fields.error };

  const { date, start, end, reason, window } = fields;
  const until = String(formData.get("until") ?? "");

  // An end date turns this into a run of days, for holidays. The hours, when
  // given, apply to every day in the range.
  if (until && /^\d{4}-\d{2}-\d{2}$/.test(until) && until !== date) {
    const range = blockPeriodRange(date, until, start, end, reason);
    if (!range.ok) return { error: range.error };
    revalidatePath("/admin");
    return {
      done: `Blocked ${window} across ${range.days} day${
        range.days === 1 ? "" : "s"
      }, from ${formatDateLong(date)}.`,
    };
  }

  blockPeriod(date, start, end, reason);
  revalidatePath("/admin");
  return { done: `Blocked ${window} on ${formatDateLong(date)}.` };
}

/** Corrects a blocked period that was entered wrong. */
export async function editBlockedTime(
  _prev: BlockTimeState,
  formData: FormData,
): Promise<BlockTimeState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Invalid time off." };

  const fields = readBlockFields(formData);
  if (!fields.ok) return { error: fields.error };

  const { date, start, end, reason, window } = fields;
  const result = updateBlockedPeriod(id, date, start, end, reason);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  return { done: `Now blocking ${window} on ${formatDateLong(date)}.` };
}

export async function removeBlockedTime(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid entry.");

  unblockPeriod(id);
  revalidatePath("/admin");
}
