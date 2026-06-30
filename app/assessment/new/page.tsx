"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/client";
import { createDraftJob } from "@/app/actions/jobs";
import type { Assessment } from "@/lib/types";

export default function NewAssessmentPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "manual" | "photo">(null);
  const [error, setError] = useState("");

  async function startManual() {
    setError("");
    setBusy("manual");
    try {
      const id = await createDraftJob();
      router.push(`/assessment/${id}/review`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create job.");
      setBusy(null);
    }
  }

  async function handlePhoto(file: File) {
    setError("");
    setBusy("photo");
    try {
      // 1. OCR the form via the server (Anthropic key stays server-side).
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the form.");
      const assessment = data.assessment as Assessment;

      // 2. Best-effort: stash the original photo in the private bucket.
      let photoPath: string | null = null;
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const up = await supabase.storage.from("form-photos").upload(path, file, {
            upsert: false,
            contentType: file.type,
          });
          if (!up.error) photoPath = path;
        }
      } catch {
        /* non-fatal — proceed without stored photo */
      }

      // 3. Create the draft seeded from OCR and head to review.
      const id = await createDraftJob(assessment, photoPath);
      router.push(`/assessment/${id}/review`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the photo.");
      setBusy(null);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-extrabold text-adt-navy">New assessment</h1>
        <p className="mb-6 text-sm text-slate-500">
          Snap the paper form to auto-fill, or enter everything by hand. Either way you can fix
          anything on the next screen.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="card flex flex-col items-center gap-3 p-8 text-center transition hover:border-adt-blue disabled:opacity-60"
          >
            <span className="text-4xl">📷</span>
            <span className="text-lg font-bold text-adt-navy">
              {busy === "photo" ? "Reading form…" : "Snap / upload form"}
            </span>
            <span className="text-sm text-slate-500">
              Take a photo of the filled paper assessment.
            </span>
          </button>

          <button
            onClick={startManual}
            disabled={busy !== null}
            className="card flex flex-col items-center gap-3 p-8 text-center transition hover:border-adt-blue disabled:opacity-60"
          >
            <span className="text-4xl">✍️</span>
            <span className="text-lg font-bold text-adt-navy">
              {busy === "manual" ? "Starting…" : "Enter manually"}
            </span>
            <span className="text-sm text-slate-500">Skip the photo and type it in.</span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handlePhoto(f);
          }}
        />
      </main>
    </>
  );
}
