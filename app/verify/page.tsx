import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mailerConfigured } from "@/lib/mailer";
import { prepareTotpEnrollment } from "@/app/auth/actions";
import { VerifyForm } from "@/components/VerifyForm";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shown = name.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default async function VerifyPage() {
  const supabase = await createClient();
  const jar = await cookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Legacy link-mode straggler (signed out with a pending email) or lost session.
    const email = jar.get("adt_pending_email")?.value;
    if (!email) redirect("/login");
    return <VerifyForm mode="link" maskedEmail={maskEmail(email!)} />;
  }

  // Already-verified devices don't belong here.
  if (jar.get("adt_dv")?.value === user.id) redirect("/");

  const masked = maskEmail(user.email ?? "");

  // 1) Existing authenticator → challenge it.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  if (hasVerifiedTotp) {
    return <VerifyForm mode="totp" maskedEmail={masked} />;
  }

  // 2) Emailed code (only when the app can send email).
  if (mailerConfigured()) {
    const { data: codeRow } = await supabase
      .from("login_codes")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return <VerifyForm mode="email" maskedEmail={masked} hasActiveCode={Boolean(codeRow)} />;
  }

  // 3) First time: enroll an authenticator app.
  const enrollment = await prepareTotpEnrollment();
  if ("error" in enrollment) {
    return <VerifyForm mode="enroll" maskedEmail={masked} enrollError={enrollment.error} />;
  }
  return (
    <VerifyForm
      mode="enroll"
      maskedEmail={masked}
      factorId={enrollment.factorId}
      qr={enrollment.qr}
      secret={enrollment.secret}
    />
  );
}
