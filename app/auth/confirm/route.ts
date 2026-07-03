import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DID_COOKIE = "adt_did";
const DV_COOKIE = "adt_dv";
const PENDING_COOKIE = "adt_pending_email";

/**
 * Landing point for the emailed sign-in link. Completes the login and marks
 * this browser as a trusted device so future logins skip verification.
 * Handles both link styles Supabase can produce:
 *   - PKCE redirect:  /auth/confirm?code=...
 *   - Token-hash:     /auth/confirm?token_hash=...&type=email
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  const supabase = await createClient();

  let errorMessage: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = "Missing verification code.";
  }

  if (!errorMessage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const jar = await cookies();
      const did = (randomUUID() + randomUUID()).replace(/-/g, "");
      await supabase.from("trusted_devices").insert({ user_id: user.id, device_id: did });
      const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
      jar.set(DID_COOKIE, did, { ...opts, maxAge: 60 * 60 * 24 * 365 });
      jar.set(DV_COOKIE, user.id, { ...opts, maxAge: 60 * 60 * 24 * 365 });
      jar.delete(PENDING_COOKIE);
      return NextResponse.redirect(new URL("/", url.origin));
    }
    errorMessage = "Could not load your account after verification.";
  }

  // Most common failure: the link was opened in a different browser than the
  // one that started sign-in (the one-time link is consumed either way).
  return NextResponse.redirect(new URL("/login?m=link", url.origin));
}
