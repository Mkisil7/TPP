"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mailerConfigured, sendLoginCode } from "@/lib/mailer";
import {
  CODE_TTL_MINUTES,
  MAX_ATTEMPTS,
  generateLoginCode,
  hashLoginCode,
} from "@/lib/loginCode";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "adt.com";
const DID_COOKIE = "adt_did"; // trusted-device id (high-entropy secret)
const DV_COOKIE = "adt_dv"; // fast-path marker: device verified for this user id
const PENDING_COOKIE = "adt_pending_email"; // email awaiting link verification (fallback mode)

export type AuthState = { error?: string; message?: string };

function domainOk(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`);
}

type SB = Awaited<ReturnType<typeof createClient>>;

/** True when this browser has already verified for this user. */
async function isTrustedDevice(supabase: SB, userId: string): Promise<boolean> {
  const jar = await cookies();
  const did = jar.get(DID_COOKIE)?.value;
  if (!did) return false;
  const { data } = await supabase
    .from("trusted_devices")
    .select("device_id")
    .eq("user_id", userId)
    .eq("device_id", did)
    .maybeSingle();
  return Boolean(data);
}

/** Register this browser as trusted for the user and set the cookies. */
async function trustThisDevice(supabase: SB, userId: string): Promise<void> {
  const jar = await cookies();
  const did = (randomUUID() + randomUUID()).replace(/-/g, "");
  await supabase.from("trusted_devices").insert({ user_id: userId, device_id: did });
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  jar.set(DID_COOKIE, did, { ...opts, maxAge: 60 * 60 * 24 * 365 });
  jar.set(DV_COOKIE, userId, { ...opts, maxAge: 60 * 60 * 24 * 365 });
}

/** The app's public origin (works on any Vercel URL). */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tech-tpp.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Typed-code verification (primary). Generates a 6-digit code, stores its
 * hash, and emails it from the app. The session stays alive but middleware
 * fences the app until the device is verified. Scanner-proof: reading the
 * email consumes nothing — only typing the code into the app does.
 */
async function startCodeVerification(supabase: SB, userId: string, email: string): Promise<string | null> {
  const code = generateLoginCode();
  const { error } = await supabase.from("login_codes").upsert({
    user_id: userId,
    code_hash: hashLoginCode(userId, code),
    attempts: 0,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) return error.message;
  try {
    await sendLoginCode(email, code);
  } catch (e) {
    return e instanceof Error ? `Could not send the code email: ${e.message}` : "Could not send the code email.";
  }
  return null;
}

/**
 * Link verification (fallback when no SMTP is configured). Signs the user
 * out and emails a Supabase one-time link that lands on /auth/confirm.
 * Note: corporate mail scanners may consume these links.
 */
async function startLinkVerification(supabase: SB, email: string): Promise<string | null> {
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await appOrigin()}/auth/confirm`,
    },
  });
  if (error) return error.message;
  const jar = await cookies();
  jar.set(PENDING_COOKIE, email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  return null;
}

async function startVerification(supabase: SB, userId: string, email: string): Promise<string | null> {
  return mailerConfigured()
    ? startCodeVerification(supabase, userId, email)
    : startLinkVerification(supabase, email);
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!domainOk(email)) return { error: `Use your @${ALLOWED_DOMAIN} email address.` };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign-in failed — please try again." };

  // Known device → straight in. New device → email verification.
  if (await isTrustedDevice(supabase, user.id)) {
    const jar = await cookies();
    jar.set(DV_COOKIE, user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    redirect("/");
  }

  const verifyErr = await startVerification(supabase, user.id, email);
  if (verifyErr) return { error: verifyErr };
  redirect("/verify");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!domainOk(email)) {
    return { error: `Account creation is restricted to @${ALLOWED_DOMAIN} addresses.` };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  const user = data.user;
  if (!user) return { error: "Account created — please sign in." };

  // First sign-up is always a new device.
  const verifyErr = await startVerification(supabase, user.id, email);
  if (verifyErr) return { error: verifyErr };
  redirect("/verify");
}

export async function verifyCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your email." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { data: row } = await supabase
    .from("login_codes")
    .select("code_hash, attempts, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return { error: "No active code — tap Resend to get a new one." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("login_codes").delete().eq("user_id", user.id);
    return { error: "That code expired — tap Resend to get a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await supabase.from("login_codes").delete().eq("user_id", user.id);
    return { error: "Too many attempts — tap Resend to get a new code." };
  }

  if (row.code_hash !== hashLoginCode(user.id, code)) {
    await supabase
      .from("login_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("user_id", user.id);
    return { error: "That code doesn't match — check the email and try again." };
  }

  await supabase.from("login_codes").delete().eq("user_id", user.id);
  await trustThisDevice(supabase, user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resendCode(): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Light rate limit: don't resend within 30s of the last code.
    const { data: row } = await supabase
      .from("login_codes")
      .select("created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row && Date.now() - new Date(row.created_at).getTime() < 30 * 1000) {
      return { error: "Just sent one — give it ~30 seconds, and check spam." };
    }
    const err = await startVerification(supabase, user.id, user.email ?? "");
    if (err) return { error: err };
    return { message: "A new email is on its way." };
  }

  // Fallback link mode (no session): resend to the pending email.
  const jar = await cookies();
  const email = jar.get(PENDING_COOKIE)?.value;
  if (!email) return { error: "Your verification session expired — please sign in again." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await appOrigin()}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };
  return { message: "A new email is on its way." };
}

/** Abandon verification and go back to the login screen. */
export async function cancelVerification() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(PENDING_COOKIE);
  redirect("/login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Keep the trusted-device cookies so this browser isn't re-challenged.
  revalidatePath("/", "layout");
  redirect("/login");
}
