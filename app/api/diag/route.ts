import { NextResponse } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — exercises the app's real Supabase client + config.
// Remove after debugging.
export async function GET() {
  const key = SUPABASE_ANON_KEY;
  const keyInfo = {
    url: SUPABASE_URL,
    keyPrefix: key.slice(0, 14),
    keySuffix: key.slice(-6),
    keyLength: key.length,
    fromEnvUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    fromEnvKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };

  // Exercise the exact client the sign-up server action uses.
  let signUp: unknown;
  try {
    const supabase = await createClient();
    const email = `diagtest+${Date.now()}@adt.com`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "Diag-Test-12345",
    });
    signUp = {
      email,
      ok: !error,
      error: error
        ? { message: error.message, status: (error as { status?: number }).status }
        : null,
      hasUser: Boolean(data?.user),
      hasSession: Boolean(data?.session),
    };
  } catch (e) {
    signUp = { thrown: String(e) };
  }

  return NextResponse.json({ keyInfo, signUp });
}
