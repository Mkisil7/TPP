"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AdtLogo } from "@/components/Brand";
import { resendCode, verifyCode, type AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Verifying…" : "Verify & continue"}
    </button>
  );
}

export function VerifyForm({ maskedEmail }: { maskedEmail: string }) {
  const [state, formAction] = useFormState<AuthState, FormData>(verifyCode, {});
  const [resent, setResent] = useState<string>("");
  const [pending, start] = useTransition();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-adt-navy px-5">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <div>
            <p className="text-sm font-semibold text-adt-navy">Verify this device</p>
            <p className="mt-1 text-sm text-slate-500">
              We emailed <span className="font-medium">{maskedEmail}</span>. Tap the{" "}
              <span className="font-medium">Sign in</span> link in that email on this device — or,
              if the email shows a 6-digit code, enter it below.
            </p>
          </div>
        </div>

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

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          {resent && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{resent}</p>
          )}

          <SubmitButton />
        </form>

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
            {pending ? "Sending…" : "Resend code"}
          </button>
          <a href="/login" className="font-semibold text-slate-500 hover:text-adt-navy">
            Back to sign in
          </a>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Codes are required the first time you sign up and on any new device.
        </p>
      </div>
    </main>
  );
}
