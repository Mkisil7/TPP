import { AdtLogo } from "@/components/Brand";
import { TIER_META, type TierRecommendation } from "@/lib/recommendations";
import type { JobData } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RISK_LABEL: Record<string, string> = { high: "High risk", med: "Medium risk", low: "Low risk" };

function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("print-page print-full card mb-6 overflow-hidden", className)}>
      {children}
    </section>
  );
}

export function ProposalDocument({
  data,
  tier,
}: {
  data: JobData;
  tier: TierRecommendation;
}) {
  const meta = TIER_META[tier.tier];
  const { assessment, property } = data;
  const family = assessment.familyName?.trim() || "Valued Customer";

  return (
    <div className="space-y-0">
      {/* ---- Cover ---- */}
      <Page>
        <div className="bg-adt-navy px-5 py-8 sm:px-8 sm:py-10 text-white">
          <div className="mb-8 flex items-center justify-between">
            <AdtLogo light />
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              {meta.label} Protection
            </span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight">
            Home Security Proposal
          </h1>
          <p className="mt-1 text-lg text-white/80">Prepared for the {family} residence</p>
          <p className="mt-1 text-sm text-white/60">{formatDate(assessment.assessmentDate)}</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-adt-line sm:grid-cols-4">
          {[
            { k: "Address", v: property.address || "—" },
            { k: "Sq ft", v: property.sqft ? property.sqft.toLocaleString() : "—" },
            { k: "Beds / Baths", v: `${property.beds ?? "—"} / ${property.baths ?? "—"}` },
            { k: "Year built", v: property.yearBuilt ?? "—" },
          ].map((s) => (
            <div key={s.k} className="bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{s.k}</div>
              <div className="mt-1 font-bold text-adt-navy">{s.v as string}</div>
            </div>
          ))}
        </div>
        <div className="px-5 py-5 sm:px-8">
          <p className="text-sm leading-relaxed text-slate-600">{meta.blurb}</p>
        </div>
      </Page>

      {/* ---- Area by area ---- */}
      <Page className="p-5 sm:p-8">
        <h2 className="mb-1 text-2xl font-extrabold text-adt-navy">
          Recommendations — area by area
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          Tailored to the doors, windows, and risk level of each space we assessed.
        </p>
        {tier.rooms.length === 0 ? (
          <p className="text-sm italic text-slate-400">No room-specific equipment at this level.</p>
        ) : (
          <div className="space-y-4">
            {tier.rooms.map((room) => (
              <div key={room.room} className="rounded-xl border border-adt-line p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-adt-navy">{room.room}</h3>
                  <span
                    className={cn(
                      "chip text-white",
                      room.riskLevel === "high"
                        ? "bg-risk-high"
                        : room.riskLevel === "med"
                          ? "bg-risk-med"
                          : "bg-risk-low",
                    )}
                  >
                    {RISK_LABEL[room.riskLevel]}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {room.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        <span className="font-semibold text-adt-navy">{it.quantity}×</span> {it.name}
                        <span className="block text-xs text-slate-400">{it.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Page>

      {/* ---- Life safety & exterior ---- */}
      <Page className="p-5 sm:p-8">
        <h2 className="mb-5 text-2xl font-extrabold text-adt-navy">
          Life safety, video &amp; smart home
        </h2>
        <div className="space-y-5">
          {tier.byCategory
            .filter((g) => g.category !== "Burglar Protection")
            .map((g) => (
              <div key={g.category}>
                <h3 className="mb-2 border-b border-adt-line pb-1 text-sm font-bold uppercase tracking-wide text-adt-blue">
                  {g.category}
                </h3>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        <span className="font-semibold text-adt-navy">{it.quantity}×</span> {it.name}
                        <span className="block text-xs text-slate-400">{it.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
        {tier.notes.length > 0 && (
          <div className="mt-5 rounded-xl bg-adt-mist p-4">
            {tier.notes.map((n, i) => (
              <p key={i} className="text-xs text-adt-navy">
                • {n}
              </p>
            ))}
          </div>
        )}
      </Page>

      {/* ---- Pricing & signature ---- */}
      <Page className="p-5 sm:p-8">
        <h2 className="mb-1 text-2xl font-extrabold text-adt-navy">
          {meta.label} — investment &amp; agreement
        </h2>
        <p className="mb-4 text-sm text-slate-500">Quality Service Plan &amp; 24/7 ADT Monitoring.</p>

        {/* Stacked cards on narrow phones — avoids a hidden horizontal scroll
            on a table a technician is showing a customer. Real table on
            wider screens and in the printed/PDF export. */}
        <div className="space-y-2 sm:hidden">
          {tier.byCategory.flatMap((g) =>
            g.items.map((it) => (
              <div key={it.id} className="rounded-lg border border-adt-line/70 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-700">{it.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-adt-navy">×{it.quantity}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>Unit $______</span>
                  <span>Total $______</span>
                </div>
              </div>
            )),
          )}
        </div>

        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-b-2 border-adt-navy text-left text-adt-navy">
              <th className="py-2">Equipment</th>
              <th className="w-16 py-2 text-center">Qty</th>
              <th className="w-24 py-2 text-right">Unit</th>
              <th className="w-24 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {tier.byCategory.flatMap((g) =>
              g.items.map((it) => (
                <tr key={it.id} className="border-b border-adt-line/70">
                  <td className="py-1.5 text-slate-700">{it.name}</td>
                  <td className="py-1.5 text-center text-slate-700">{it.quantity}</td>
                  <td className="py-1.5 text-right text-slate-300">$______</td>
                  <td className="py-1.5 text-right text-slate-300">$______</td>
                </tr>
              )),
            )}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Solution investment</span>
            <span className="text-slate-300">$__________</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monthly monitoring</span>
            <span className="text-slate-300">$__________</span>
          </div>
          <div className="flex justify-between border-t border-adt-navy pt-1.5 font-bold text-adt-navy">
            <span>Total</span>
            <span className="text-slate-300">$__________</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="h-8 border-b border-slate-400" />
            <div className="mt-1 text-xs text-slate-500">Customer signature</div>
          </div>
          <div>
            <div className="h-8 border-b border-slate-400" />
            <div className="mt-1 text-xs text-slate-500">Date</div>
          </div>
          <div>
            <div className="h-8 border-b border-slate-400" />
            <div className="mt-1 text-xs text-slate-500">Tech engineer</div>
          </div>
          <div>
            <div className="h-8 border-b border-slate-400" />
            <div className="mt-1 text-xs text-slate-500">Date</div>
          </div>
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          By signing, the customer acknowledges a thorough walk-through of the home and that all
          security options have been explained. Pricing to be completed by the Tech Engineer.
        </p>
      </Page>
    </div>
  );
}
