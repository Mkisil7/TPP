import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Typed-code mode: session exists, device pending. If a code is active
    // show the input; middleware sends verified devices home automatically.
    const { data: codeRow } = await supabase
      .from("login_codes")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return (
      <VerifyForm
        mode="code"
        maskedEmail={maskEmail(user.email ?? "")}
        hasActiveCode={Boolean(codeRow)}
      />
    );
  }

  // Link-fallback mode: signed out while a link email is pending.
  const jar = await cookies();
  const email = jar.get("adt_pending_email")?.value;
  if (!email) redirect("/login");

  return <VerifyForm mode="link" maskedEmail={maskEmail(email!)} hasActiveCode={false} />;
}
