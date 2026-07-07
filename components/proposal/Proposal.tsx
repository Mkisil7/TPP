"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProposalDocument } from "./ProposalDocument";
import { markJobSaved } from "@/app/actions/jobs";
import { CATALOG, CATEGORY_ORDER, type ItemId } from "@/lib/catalog";
import {
  TIERS,
  TIER_META,
  type CategoryGroup,
  type LineItem,
  type Recommendation,
  type Tier,
} from "@/lib/recommendations";
import { emptyProposalEdits, type JobData, type ProposalEdits } from "@/lib/types";
import { cn } from "@/lib/utils";

// Per-package edits layered on top of the deterministic recommendation:
// `qty` overrides a line's quantity (0 removes it); `extra` are items the tech
// added that the engine didn't include.
export function Proposal({
  jobId,
  data,
  recommendation,
  initialEdits,
}: {
  jobId: string;
  data: JobData;
  recommendation: Recommendation;
  initialEdits?: ProposalEdits;
}) {
  const [tier, setTier] = useState<Tier>("comprehensive");
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const [edits, setEdits] = useState<ProposalEdits>(initialEdits ?? emptyProposalEdits());

  // Merge the engine's line items with the tech's edits into the final,
  // category-grouped equipment list for a package.
  const groupsFor = useMemo(() => {
    return (t: Tier): CategoryGroup[] => {
      const map = new Map<ItemId, LineItem>();
      for (const it of recommendation[t].byCategory.flatMap((g) => g.items)) {
        map.set(it.id, { ...it, room: undefined });
      }
      for (const id of edits[t].extra) {
        if (!map.has(id)) {
          const c = CATALOG[id];
          map.set(id, { id, name: c.name, category: c.category, quantity: 1, reason: "Added on site." });
        }
      }
      for (const id of Object.keys(edits[t].qty) as ItemId[]) {
        const it = map.get(id);
        if (it) it.quantity = Math.max(0, edits[t].qty[id] ?? it.quantity);
      }
      const items = [...map.values()].filter((it) => it.quantity > 0);
      return CATEGORY_ORDER.map((category) => ({
        category,
        items: items.filter((i) => i.category === category),
      })).filter((g) => g.items.length > 0);
    };
  }, [recommendation, edits]);

  const groups = groupsFor(tier);
  const totalFor = (t: Tier) =>
    groupsFor(t).reduce((s, g) => s + g.items.reduce((a, i) => a + i.quantity, 0), 0);

  const present = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
  const addable = CATEGORY_ORDER.map((category) => ({
    category,
    items: (Object.values(CATALOG) as (typeof CATALOG)[ItemId][]).filter(
      (c) => c.category === category && !present.has(c.id),
    ),
  })).filter((g) => g.items.length > 0);

  function setQty(t: Tier, id: ItemId, q: number) {
    setSaved(false);
    setEdits((prev) => ({
      ...prev,
      [t]: { ...prev[t], qty: { ...prev[t].qty, [id]: Math.max(0, q) } },
    }));
  }

  function addItem(t: Tier, id: ItemId) {
    setSaved(false);
    setEdits((prev) => {
      const inBase = recommendation[t].byCategory.some((g) => g.items.some((i) => i.id === id));
      const next = { qty: { ...prev[t].qty }, extra: [...prev[t].extra] };
      next.qty[id] = Math.max(1, prev[t].qty[id] ?? 0);
      if (!inBase && !next.extra.includes(id)) next.extra.push(id);
      return { ...prev, [t]: next };
    });
  }

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
                  await markJobSaved(jobId, edits);
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
                <div className={cn("text-xs", tier === t ? "text-white/70" : "text-slate-400")}>
                  {totalFor(t)} units
                </div>
              </button>
            );
          })}
        </div>

        {/* Add equipment to the selected package */}
        <div className="mt-3">
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 text-sm font-semibold text-adt-blue hover:text-adt-navy"
          >
            <span className="text-base leading-none">{showAdd ? "×" : "+"}</span>
            {showAdd ? "Close" : `Add equipment to ${TIER_META[tier].label}`}
          </button>

          {showAdd && (
            <div className="mt-2 rounded-xl border border-adt-line bg-white p-3">
              <p className="mb-2 text-xs text-slate-500">
                Tap to add to the <span className="font-semibold text-adt-navy">{TIER_META[tier].label}</span> package.
                Adjust quantities right on the equipment list below.
              </p>
              {addable.length === 0 ? (
                <p className="text-xs italic text-slate-400">Everything in the catalog is already included.</p>
              ) : (
                <div className="space-y-2.5">
                  {addable.map((g) => (
                    <div key={g.category}>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {g.category}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((it) => (
                          <button
                            key={it.id}
                            onClick={() => addItem(tier, it.id)}
                            className="rounded-full border border-adt-line bg-adt-mist px-2.5 py-1 text-xs text-adt-navy transition hover:border-adt-blue hover:bg-white"
                          >
                            + {it.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The printable document for the selected package */}
      <ProposalDocument
        data={data}
        tier={recommendation[tier]}
        groups={groups}
        onQty={(id, q) => setQty(tier, id, q)}
      />
    </div>
  );
}
