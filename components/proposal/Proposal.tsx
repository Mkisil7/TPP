"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProposalDocument } from "./ProposalDocument";
import { markJobSaved } from "@/app/actions/jobs";
import { TIERS, TIER_META, type Recommendation, type Tier } from "@/lib/recommendations";
import type { JobData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Proposal({
  jobId,
  data,
  recommendation,
}: {
  jobId: string;
  data: JobData;
  recommendation: Recommendation;
}) {
  const [tier, setTier] = useState<Tier>("comprehensive");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div>
      {/* Controls (hidden when printing) */}
      <div className="no-print mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-adt-navy">Proposal</h1>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={pending || saved}
              onClick={() =>
                start(async () => {
                  await markJobSaved(jobId);
                  setSaved(true);
                  router.refresh();
                })
              }
            >
              {saved ? "✓ Saved" : "Save to history"}
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              Download / Print PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TIERS.map((t) => {
            const m = TIER_META[t];
            const units = recommendation[t].totalUnits;
            return (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={cn(
                  "rounded-xl border p-4 text-center transition",
                  tier === t
                    ? "border-adt-navy bg-adt-navy text-white shadow-card"
                    : "border-adt-line bg-white text-adt-navy hover:bg-adt-mist",
                )}
              >
                <div className="text-lg font-bold">{m.label}</div>
                <div
                  className={cn(
                    "text-xs",
                    tier === t ? "text-white/70" : "text-slate-400",
                  )}
                >
                  {units} units
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* The printable document for the selected tier */}
      <ProposalDocument data={data} tier={recommendation[tier]} />
    </div>
  );
}
