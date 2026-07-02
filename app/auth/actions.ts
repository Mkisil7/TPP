"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "adt.com";
const DID_COOKIE = "adt_did"; // trusted-device id (high-entropy secret)
const PENDING_COOKIE = "adt_pending_email"; // email awaiting code verification

export type AuthState = { error?: string; message?: string };

function domainOk(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`);
}

function newDeviceId(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

type SB = Awaited<ReturnType<typeof createClient>>;

/** True when this browser has already verified a code for this user. */
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

/** The app's public origin (works on any Vercel URL). */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tech-tpp.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Email a verification message and remember which email we're verifying.
 * The email carries both a sign-in link (works with Supabase's default
 * template) and a 6-digit code (shown once a custom template prints it).
 * The link lands on /auth/confirm, which marks this device trusted.
 */
async function startVerification(email: string): Promise<string | null> {
  const supabase = await createClient();
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

  // Known device → straight in. New device → require an email code.
  if (user && (await isTrustedDevice(supabase, user.id))) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  await supabase.auth.signOut();
  const otpErr = await startVerification(email);
  if (otpErr) return { error: otpErr };
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
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // First account is always a new device — verify with an email code.
  await supabase.auth.signOut();
  const otpErr = await startVerification(email);
  if (otpErr) return { error: otpErr };
  redirect("/verify");
}

export async function verifyCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const jar = await cookies();
  const email = jar.get(PENDING_COOKIE)?.value;
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email) return { error: "Your verification session expired — please sign in again." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const did = newDeviceId();
    await supabase.from("trusted_devices").insert({ user_id: user.id, device_id: did });
    jar.set(DID_COOKIE, did, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  jar.delete(PENDING_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resendCode(): Promise<AuthState> {
  const jar = await cookies();
  const email = jar.get(PENDING_COOKIE)?.value;
  if (!email) return { error: "Your verification session expired — please sign in again." };
  const supabase = await createClient();
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Keep the trusted-device cookie so this browser isn't re-challenged next login.
  revalidatePath("/", "layout");
  redirect("/login");
}
