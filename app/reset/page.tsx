"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AdtLogo } from "@/components/Brand";
import { resetPassword, type AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Updating…" : "Reset password"}
    </button>
  );
}

export default function ResetPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(resetPassword, {});

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-adt-navy px-5 py-8">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <div>
            <p className="text-sm font-semibold text-adt-navy">Reset your password</p>
            <p className="mt-1 text-sm text-slate-500">
              Confirm it&apos;s you with the 6-digit code from your authenticator app, then choose
              a new password.
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@adt.com"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="code">
              Authenticator code
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
          <div>
            <label className="field-label" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="field-input"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <SubmitButton />
        </form>

        <div className="mt-5 text-center text-sm">
          <Link href="/login" className="font-semibold text-adt-blue">
            Back to sign in
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Don&apos;t have your authenticator anymore? Contact your admin to reset your account.
        </p>
      </div>
    </main>
  );
}
