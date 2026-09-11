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
  createBookingAsAdmin,
  createClient,
  deleteClient,
  setBookingStatus,
  updateClientNotes,
  unblockPeriod,
  type BookingStatus,
} from "@/lib/bookings";
import { parseTime } from "@/lib/time";

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

/** Free-text notes she keeps about a client. */
export async function saveClientNotes(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid contact.");

  updateClientNotes(id, notes || null);
  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin");
}

/** Removes the contact. Their past bookings are kept. */
export async function removeClient(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid contact.");

  deleteClient(id);
  revalidatePath("/admin");
}

/** Blocks either a whole day or a window within one. */
export async function addBlockedTime(formData: FormData): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const mode = String(formData.get("mode") ?? "day");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");

  if (mode === "day") {
    blockPeriod(date, null, null, reason || null);
  } else {
    const from = String(formData.get("from") ?? "");
    const to = String(formData.get("to") ?? "");
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) {
      throw new Error("Pick a start and end time.");
    }
    const start = parseTime(from);
    const end = parseTime(to);
    if (end <= start) throw new Error("The end time must be after the start.");
    blockPeriod(date, start, end, reason || null);
  }

  revalidatePath("/admin");
}

export async function removeBlockedTime(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid entry.");

  unblockPeriod(id);
  revalidatePath("/admin");
}
