"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJob } from "@/app/actions/jobs";
import type { PropertySnapshot } from "@/lib/types";
import { NumberField, Section, TextArea } from "./fields";

export function PropertyForm({ jobId, initial }: { jobId: string; initial: PropertySnapshot }) {
  const [p, setP] = useState<PropertySnapshot>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = <K extends keyof PropertySnapshot>(k: K, v: PropertySnapshot[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  function saveAndContinue() {
    start(async () => {
      await saveJob(jobId, { property: p });
      router.push(`/assessment/${jobId}/followup`);
    });
  }

  return (
    <div className="space-y-5 pb-24">
      <h1 className="text-2xl font-extrabold text-adt-navy">Property snapshot</h1>
      <p className="text-sm text-slate-500">
        Enter the address and the home details you collected on site.
      </p>

      <Section title="Property">
        <TextArea
          label="Address"
          rows={2}
          value={p.address}
          onChange={(v) => set("address", v)}
          placeholder="123 Main St, City, ST 00000"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="Sq ft" value={p.sqft} onChange={(v) => set("sqft", v)} />
          <NumberField label="Beds" value={p.beds} onChange={(v) => set("beds", v)} />
          <NumberField label="Baths" value={p.baths} onChange={(v) => set("baths", v)} />
          <NumberField label="Year built" value={p.yearBuilt} onChange={(v) => set("yearBuilt", v)} />
        </div>
      </Section>

      <div className="no-print fixed inset-x-0 bottom-0 border-t border-adt-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            className="btn-secondary flex-1"
            disabled={pending}
            onClick={() => router.push(`/assessment/${jobId}/review`)}
          >
            ← Back
          </button>
          <button className="btn-primary flex-[2]" disabled={pending} onClick={saveAndContinue}>
            {pending ? "Saving…" : "Save & continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
