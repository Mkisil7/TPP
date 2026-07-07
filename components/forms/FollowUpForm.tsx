"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJob } from "@/app/actions/jobs";
import type { FollowUp, SystemType, WifiQuality } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NumberField, Section, TextArea, YesNo } from "./fields";

const WIFI: { v: WifiQuality; label: string; note: string }[] = [
  { v: "good", label: "Good", note: "Smart & video devices fine" },
  { v: "weak", label: "Weak", note: "Add Wi-Fi router / extender" },
  { v: "none", label: "None", note: "Strips all Wi-Fi devices" },
];

const SYSTEMS: { v: SystemType; label: string; note: string }[] = [
  { v: "command", label: "Command", note: "Touchscreen hub system" },
  { v: "v5", label: "V5", note: "Newer self-setup panel" },
];

export function FollowUpForm({
  jobId,
  initial,
  hasPets,
}: {
  jobId: string;
  initial: FollowUp;
  hasPets: boolean;
}) {
  const [f, setF] = useState<FollowUp>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = <K extends keyof FollowUp>(k: K, v: FollowUp[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  function saveAndContinue() {
    start(async () => {
      await saveJob(jobId, { followup: f });
      router.push(`/assessment/${jobId}/proposal`);
    });
  }

  return (
    <div className="space-y-5 pb-32">
      <h1 className="text-2xl font-extrabold text-adt-navy">Follow-up</h1>
      <p className="text-sm text-slate-500">A few things the paper form doesn’t capture.</p>

      <Section title="System">
        <div>
          <span className="field-label">Panel type</span>
          <div className="grid grid-cols-2 gap-2">
            {SYSTEMS.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => set("systemType", s.v)}
                className={cn(
                  "rounded-xl border p-3 text-center transition",
                  f.systemType === s.v
                    ? "border-adt-navy bg-adt-navy text-white"
                    : "border-adt-line bg-white text-adt-navy hover:bg-adt-mist",
                )}
              >
                <div className="font-bold">{s.label}</div>
                <div
                  className={cn(
                    "mt-1 text-[11px] leading-tight",
                    f.systemType === s.v ? "text-white/80" : "text-slate-500",
                  )}
                >
                  {s.note}
                </div>
              </button>
            ))}
          </div>
        </div>

        <NumberField
          label="Additional touchscreen panels needed (beyond the main one)"
          value={f.extraTouchscreens}
          onChange={(v) => set("extraTouchscreens", v ?? 0)}
        />

        {f.systemType === "command" && (
          <YesNo
            label="Desk mount needed? (rarely used)"
            value={f.deskMountNeeded}
            onChange={(v) => set("deskMountNeeded", v === true)}
          />
        )}

        <YesNo
          label="Small business location? (adds panic button)"
          value={f.smallBusiness}
          onChange={(v) => set("smallBusiness", v === true)}
        />
      </Section>

      <Section title="Windows & glass">
        <YesNo
          label="Home has impact glass?"
          value={f.impactGlass}
          onChange={(v) => set("impactGlass", v === true)}
        />
        <YesNo
          label="Any fixed / picture windows?"
          value={f.hasFixedWindows}
          onChange={(v) => set("hasFixedWindows", v === true)}
        />
        {f.hasFixedWindows && (
          <NumberField
            label="How many fixed / picture windows?"
            value={f.fixedWindowCount}
            onChange={(v) => set("fixedWindowCount", v ?? 0)}
          />
        )}
        <p className="text-xs text-slate-400">
          Impact glass can’t be broken, so no glass-break detectors are used. Fixed windows and
          many-window rooms are covered by a glass-break detector.
        </p>
      </Section>

      <Section title="Video & exterior">
        <NumberField
          label="How many cameras?"
          value={f.cameraCount}
          onChange={(v) => set("cameraCount", v ?? 0)}
        />
        <NumberField
          label="Existing floodlight count"
          value={f.existingFloodlightCount}
          onChange={(v) => set("existingFloodlightCount", v ?? 0)}
        />

        <div>
          <span className="field-label">On-site Wi-Fi quality</span>
          <div className="grid grid-cols-3 gap-2">
            {WIFI.map((w) => (
              <button
                key={w.v}
                type="button"
                onClick={() => set("wifiQuality", w.v)}
                className={cn(
                  "rounded-xl border p-3 text-center transition",
                  f.wifiQuality === w.v
                    ? "border-adt-navy bg-adt-navy text-white"
                    : "border-adt-line bg-white text-adt-navy hover:bg-adt-mist",
                )}
              >
                <div className="font-bold">{w.label}</div>
                <div
                  className={cn(
                    "mt-1 text-[11px] leading-tight",
                    f.wifiQuality === w.v ? "text-white/80" : "text-slate-500",
                  )}
                >
                  {w.note}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Pets & notes">
        <YesNo
          label="Pet over 80 lbs?"
          value={f.petsOver80lb}
          onChange={(v) => set("petsOver80lb", v === true)}
        />
        {f.petsOver80lb && (
          <YesNo
            label="Still want motion detectors?"
            value={f.wantMotionWithLargePets}
            onChange={(v) => set("wantMotionWithLargePets", v === true)}
          />
        )}
        {!hasPets && (
          <p className="text-xs text-slate-400">
            The assessment didn’t note pets — answer only if relevant.
          </p>
        )}

        <TextArea
          label="Notes (budget sensitivity, timeline, anything else)"
          rows={4}
          value={f.notes}
          onChange={(v) => set("notes", v)}
        />
      </Section>

      <div className="mobile-action-bar no-print fixed inset-x-0 bottom-0 border-t border-adt-line bg-white/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            className="btn-secondary flex-1"
            disabled={pending}
            onClick={() => router.push(`/assessment/${jobId}/property`)}
          >
            ← Back
          </button>
          <button className="btn-primary flex-[2]" disabled={pending} onClick={saveAndContinue}>
            {pending ? "Saving…" : "Build proposal →"}
          </button>
        </div>
      </div>
    </div>
  );
}
