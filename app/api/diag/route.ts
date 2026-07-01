import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — verifies the email-OTP send path works. Remove after.
export async function GET() {
  const email = `diagtest+${Date.now()}@adt.com`;
  const out: Record<string, unknown> = { email };
  try {
    const supabase = await createClient();
    // Ensure the user exists (auto-confirmed by trigger), then request a code.
    const su = await supabase.auth.signUp({ email, password: "Diag-Test-12345" });
    out.signUp = { ok: !su.error, error: su.error?.message ?? null };
    await supabase.auth.signOut();
    const otp = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    out.sendOtp = { ok: !otp.error, error: otp.error?.message ?? null };
  } catch (e) {
    out.thrown = String(e);
  }
  return NextResponse.json(out);
}
