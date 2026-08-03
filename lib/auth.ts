import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin access is a single shared password — appropriate for a one-person
 * studio, and far less to go wrong than a full user system.
 *
 * The session cookie holds an expiry plus an HMAC of that expiry, so it can't
 * be forged or extended without ADMIN_SECRET.
 */

const COOKIE_NAME = "jc_admin";
const SESSION_DAYS = 14;

function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function adminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SECRET is not set. Add it to .env.local — see .env.example.",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", adminSecret())
    .update(payload)
    .digest("hex");
}

/** Constant-time comparison so a wrong password can't be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isPasswordValid(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function startAdminSession(): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = String(expires);
  const token = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/**
 * Guard for every admin server action. Server Functions are reachable by
 * direct POST, so authorisation is checked here rather than relying on the
 * page that renders the button.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Not authorised.");
  }
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
}
