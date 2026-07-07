"use client";

import { useEffect, useState } from "react";
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
  const [notice, setNotice] = useState("");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, {});

  const [success, setSuccess] = useState("");

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("m");
    if (m === "link") {
      setNotice(
        "That sign-in link couldn't be used in this browser (links are one-time and must open where you signed in). Sign in again and we'll send a fresh one.",
      );
    } else if (m === "reset") {
      setSuccess("Password updated — sign in with your new password.");
    }
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-adt-navy px-5 py-8">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <p className="text-sm text-slate-500">
            {mode === "signin" ? "Sign in to your field account" : "Create your field account"}
          </p>
        </div>

        {notice && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
        )}
        {success && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>
        )}

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

        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          {mode === "signin" ? (
            <button className="font-semibold text-adt-blue" onClick={() => setMode("signup")}>
              Need an account? Create one
            </button>
          ) : (
            <button className="font-semibold text-adt-blue" onClick={() => setMode("signin")}>
              Already have an account? Sign in
            </button>
          )}
          <a href="/reset" className="font-semibold text-slate-500 hover:text-adt-navy">
            Forgot password?
          </a>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Restricted to @adt.com accounts.
        </p>
      </div>
    </main>
  );
}
