"use client";

import { useState, useTransition } from "react";
import { AdtLogo } from "@/components/Brand";
import { resendCode } from "@/app/auth/actions";

export function VerifyForm({ maskedEmail }: { maskedEmail: string }) {
  const [resent, setResent] = useState<string>("");
  const [pending, start] = useTransition();

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-adt-navy px-5 py-8">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <div>
            <p className="text-sm font-semibold text-adt-navy">Verify this device</p>
            <p className="mt-1 text-sm text-slate-500">
              We emailed <span className="font-medium">{maskedEmail}</span>. Open that email on
              this device and tap <span className="font-medium">Sign in</span> to finish.
            </p>
          </div>
        </div>

        <p className="rounded-xl bg-adt-mist px-4 py-3 text-center text-sm text-adt-navy">
          Check your inbox — this page will move on to your dashboard once you tap the link.
        </p>

        {resent && (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">
            {resent}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            className="font-semibold text-adt-blue disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendCode();
                setResent(r.error ?? r.message ?? "");
              })
            }
          >
            {pending ? "Sending…" : "Resend email"}
          </button>
          <a href="/login" className="font-semibold text-slate-500 hover:text-adt-navy">
            Back to sign in
          </a>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          A verification email is required the first time you sign up and on any new device. Make
          sure to open it on this device/browser.
        </p>
      </div>
    </main>
  );
}
