import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY probe — exercises real GoTrue TOTP MFA end to end. Deleted after.
const SECRET = "mfa-probe-7q2v-x91k";

function b32decode(s: string): Buffer {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const idx = A.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totp(secretB32: string): string {
  const key = b32decode(secretB32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac("sha1", key).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return (((h.readUInt32BE(o) & 0x7fffffff) % 1e6) + "").padStart(6, "0");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== SECRET) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const out: Record<string, unknown> = {};
  const supabase = await createClient();
  const email = `mfaprobe+${Date.now()}@adt.com`;

  try {
    const su = await supabase.auth.signUp({ email, password: `Probe-${randomUUID()}` });
    out.signUp = { ok: !su.error, error: su.error?.message ?? null };
    if (su.error) return NextResponse.json(out);

    const enroll = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "probe" });
    out.enroll = {
      ok: !enroll.error,
      error: enroll.error?.message ?? null,
      hasSecret: Boolean(enroll.data?.totp?.secret),
      hasQr: Boolean(enroll.data?.totp?.qr_code),
    };
    if (enroll.error || !enroll.data) return NextResponse.json(out);

    const code = totp(enroll.data.totp.secret);
    const verify = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.data.id,
      code,
    });
    out.challengeAndVerify = { ok: !verify.error, error: verify.error?.message ?? null };

    const { data: factors } = await supabase.auth.mfa.listFactors();
    out.factorVerified = factors?.totp?.some((f) => f.status === "verified") ?? false;

    // Trusted-device write under RLS as this session's user.
    const { error: tdErr } = await supabase
      .from("trusted_devices")
      .insert({ user_id: su.data.user!.id, device_id: `probe-${randomUUID()}` });
    out.trustedDeviceInsert = { ok: !tdErr, error: tdErr?.message ?? null };
    out.probeUserEmail = email;
  } catch (e) {
    out.thrown = String(e);
  }
  return NextResponse.json(out);
}
