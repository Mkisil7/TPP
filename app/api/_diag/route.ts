import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic — tests which Supabase key the project accepts.
// Both keys below are public client keys. Remove this route after debugging.
const URL = "https://ivlenppmsnjdzhvcokvu.supabase.co";
const KEYS: Record<string, string> = {
  legacy_anon:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGVucHBtc25qZHpodmNva3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzkxNDMsImV4cCI6MjA5ODM1NTE0M30.zmC_Aw1O7BgpKGj5CDzzlbjBMDTUpxzUxTBsGSteXAQ",
  publishable: "sb_publishable_9HTfabJGpc8S9A7biDWptw_1m_63-fL",
};

export async function GET() {
  const out: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(KEYS)) {
    const entry: Record<string, unknown> = {};
    try {
      const s = await fetch(`${URL}/auth/v1/settings`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      entry.settings = { status: s.status, body: (await s.text()).slice(0, 200) };
    } catch (e) {
      entry.settings = { error: String(e) };
    }
    try {
      const t = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: "probe@adt.com", password: "wrong-on-purpose" }),
      });
      entry.token = { status: t.status, body: (await t.text()).slice(0, 200) };
    } catch (e) {
      entry.token = { error: String(e) };
    }
    out[name] = entry;
  }
  return NextResponse.json(out);
}
