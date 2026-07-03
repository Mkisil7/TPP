"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AdtLogo } from "@/components/Brand";
import { cancelVerification, resendCode, verifyCode, type AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Verifying…" : "Verify & continue"}
    </button>
  );
}

export function VerifyForm({
  mode,
  maskedEmail,
  hasActiveCode,
}: {
  mode: "code" | "link";
  maskedEmail: string;
  hasActiveCode: boolean;
}) {
  const [state, formAction] = useFormState<AuthState, FormData>(verifyCode, {});
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
              {mode === "code" ? (
                <>
                  We emailed a 6-digit code to <span className="font-medium">{maskedEmail}</span>.
                  Enter it below to finish signing in.
                </>
              ) : (
                <>
                  We emailed <span className="font-medium">{maskedEmail}</span>. Open that email on
                  this device and tap <span className="font-medium">Sign in</span> to finish.
                </>
              )}
            </p>
          </div>
        </div>

        {mode === "code" ? (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="______"
                className="field-input text-center text-2xl font-bold tracking-[0.5em]"
              />
            </div>

            {!hasActiveCode && !resent && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No active code found — tap Resend to get a fresh one.
              </p>
            )}
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            {resent && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{resent}</p>
            )}

            <SubmitButton />
          </form>
        ) : (
          <>
            <p className="rounded-xl bg-adt-mist px-4 py-3 text-center text-sm text-adt-navy">
              Check your inbox — this page will move on to your dashboard once you tap the link.
            </p>
            {resent && (
              <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-center text-sm text-green-700">
                {resent}
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <button
            className="min-h-[44px] font-semibold text-adt-blue disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendCode();
                setResent(r.error ?? r.message ?? "");
              })
            }
          >
            {pending ? "Sending…" : mode === "code" ? "Resend code" : "Resend email"}
          </button>
          <button
            className="min-h-[44px] font-semibold text-slate-500 hover:text-adt-navy"
            disabled={pending}
            onClick={() => start(async () => await cancelVerification())}
          >
            Back to sign in
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Verification is required the first time you sign up and on any new device.
        </p>
      </div>
    </main>
  );
}
