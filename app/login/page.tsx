"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AdtLogo } from "@/components/Brand";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, {});

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-adt-navy px-5">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <p className="text-sm text-slate-500">
            {mode === "signin" ? "Sign in to your field account" : "Create your field account"}
          </p>
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
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          {state.message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
          )}

          <SubmitButton label={mode === "signin" ? "Sign in" : "Create account"} />
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          {mode === "signin" ? (
            <button className="font-semibold text-adt-blue" onClick={() => setMode("signup")}>
              Need an account? Create one
            </button>
          ) : (
            <button className="font-semibold text-adt-blue" onClick={() => setMode("signin")}>
              Already have an account? Sign in
            </button>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Restricted to @adt.com accounts.
        </p>
      </div>
    </main>
  );
}
