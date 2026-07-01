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
  const jar = await cookies();
  const email = jar.get("adt_pending_email")?.value;

  if (!email) {
    // Nothing to verify — send them where they belong.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/" : "/login");
  }

  return <VerifyForm maskedEmail={maskEmail(email!)} />;
}
