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

function CodeInput() {
  return (
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
  );
}

export function VerifyForm({
  mode,
  maskedEmail,
  hasActiveCode = false,
  factorId,
  qr,
  secret,
  enrollError,
}: {
  mode: "email" | "totp" | "enroll" | "link";
  maskedEmail: string;
  hasActiveCode?: boolean;
  factorId?: string;
  qr?: string;
  secret?: string;
  enrollError?: string;
}) {
  const [state, formAction] = useFormState<AuthState, FormData>(verifyCode, {});
  const [resent, setResent] = useState<string>("");
  const [pending, start] = useTransition();

  const intro =
    mode === "totp" ? (
      <>Enter the 6-digit code from your authenticator app to finish signing in.</>
    ) : mode === "enroll" ? (
      <>One-time setup: add this account to your authenticator app, then enter the code it shows.</>
    ) : mode === "email" ? (
      <>
        We emailed a 6-digit code to <span className="font-medium">{maskedEmail}</span>. Enter it
        below to finish signing in.
      </>
    ) : (
      <>
        We emailed <span className="font-medium">{maskedEmail}</span>. Open that email on this
        device and tap <span className="font-medium">Sign in</span> to finish.
      </>
    );

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-adt-navy px-5 py-8">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <AdtLogo />
          <div>
            <p className="text-sm font-semibold text-adt-navy">
              {mode === "enroll" ? "Set up two-factor sign-in" : "Verify this device"}
            </p>
            <p className="mt-1 text-sm text-slate-500">{intro}</p>
          </div>
        </div>

        {mode === "enroll" && (
          <div className="mb-5">
            {enrollError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Could not start setup: {enrollError}. Go back and sign in again.
              </p>
            ) : (
              <>
                <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    Open <span className="font-medium">Microsoft Authenticator</span>,{" "}
                    <span className="font-medium">Google Authenticator</span>, or iPhone{" "}
                    <span className="font-medium">Settings → Passwords</span>.
                  </li>
                  <li>Scan this QR code (or type the setup key).</li>
                  <li>Enter the 6-digit code the app shows.</li>
                </ol>
                {qr && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qr}
                      alt="Authenticator QR code"
                      className="h-44 w-44 rounded-lg border border-adt-line bg-white p-2"
                    />
                  </div>
                )}
                {secret && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Setup key:{" "}
                    <code data-testid="totp-secret" className="break-all font-semibold text-adt-navy">
                      {secret}
                    </code>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {mode === "link" ? (
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
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="mode" value={mode} />
            {mode === "enroll" && factorId && <input type="hidden" name="factorId" value={factorId} />}
            <CodeInput />

            {mode === "email" && !hasActiveCode && !resent && (
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
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          {mode === "email" || mode === "link" ? (
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
              {pending ? "Sending…" : mode === "email" ? "Resend code" : "Resend email"}
            </button>
          ) : (
            <span />
          )}
          <button
            className="min-h-[44px] font-semibold text-slate-500 hover:text-adt-navy"
            disabled={pending}
            onClick={() => start(async () => await cancelVerification())}
          >
            Back to sign in
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          {mode === "enroll"
            ? "You'll only do this once — new devices just ask for a code."
            : "Verification is required the first time you sign up and on any new device."}
        </p>
      </div>
    </main>
  );
}
