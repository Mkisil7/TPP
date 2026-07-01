import { NextResponse } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — proves the full sign-up → sign-in flow. Remove after.
export async function GET() {
  const keyInfo = {
    url: SUPABASE_URL,
    keyPrefix: SUPABASE_ANON_KEY.slice(0, 14),
    keyLength: SUPABASE_ANON_KEY.length,
  };

  const email = `diagtest+${Date.now()}@adt.com`;
  const password = "Diag-Test-12345";
  const result: Record<string, unknown> = { email };

  try {
    const supabase = await createClient();
    const su = await supabase.auth.signUp({ email, password });
    result.signUp = {
      ok: !su.error,
      error: su.error?.message ?? null,
      hasUser: Boolean(su.data?.user),
    };

    const si = await supabase.auth.signInWithPassword({ email, password });
    result.signIn = {
      ok: !si.error,
      error: si.error?.message ?? null,
      hasSession: Boolean(si.data?.session),
    };
  } catch (e) {
    result.thrown = String(e);
  }

  return NextResponse.json({ keyInfo, ...result });
}
