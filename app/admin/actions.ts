"use server";

import { revalidatePath } from "next/cache";
import {
  endAdminSession,
  isPasswordValid,
  requireAdmin,
  startAdminSession,
} from "@/lib/auth";
import {
  blockDate,
  setBookingStatus,
  unblockDate,
  type BookingStatus,
} from "@/lib/bookings";

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

export async function addBlockedDate(formData: FormData): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");

  blockDate(date, reason || null);
  revalidatePath("/admin");
}

export async function removeBlockedDate(formData: FormData): Promise<void> {
  await requireAdmin();

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date.");

  unblockDate(date);
  revalidatePath("/admin");
}
