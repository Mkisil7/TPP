import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY test harness for the 2FA link flow — deleted after verification.
const SECRET = "t9x4-otp-harness-2f6b";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== SECRET) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const email = `diagtest+${Date.now()}@adt.com`;
  const out: Record<string, unknown> = { email };
  try {
    const supabase = await createClient();
    const su = await supabase.auth.signUp({ email, password: "Diag-Test-12345" });
    out.signUp = { ok: !su.error, error: su.error?.message ?? null };
    await supabase.auth.signOut();
    const otp = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${url.origin}/auth/confirm`,
      },
    });
    out.sendOtp = { ok: !otp.error, error: otp.error?.message ?? null };
  } catch (e) {
    out.thrown = String(e);
  }
  return NextResponse.json(out);
}
