"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJob } from "@/app/actions/jobs";
import { newRoom, type Assessment, type RiskLevel, type RoomRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckRow, NumberField, Section, TextArea, TextField, YesNo } from "./fields";

const SECURITY_VULN: { key: keyof Assessment["security"]["vuln"]; label: string }[] = [
  { key: "unlockedWindowsDoors", label: "Unlocked windows/doors" },
  { key: "overheadGarageDoor", label: "Overhead garage door" },
  { key: "doorContainsGlass", label: "Door contains glass" },
  { key: "brokenLocks", label: "Broken locks" },
  { key: "originalDoorLocks", label: "Original door locks" },
  { key: "nonReinforcedDoorLocks", label: "Non-reinforced door locks" },
];

const LIFE_VULN: { key: keyof Assessment["lifeSafety"]["vuln"]; label: string }[] = [
  { key: "expiredSmokeDetectors", label: "Expired smoke detectors (>9 yrs)" },
  { key: "incorrectDetectorPlacement", label: "Incorrect detector placement" },
  { key: "overloadedPlugs", label: "Overloaded plugs" },
  { key: "coOver5Years", label: "CO detector > 5 years" },
  { key: "lintTrap", label: "Lint trap" },
  { key: "wornWaterHose", label: "Worn water hose" },
  { key: "noOrExpiredExtinguisher", label: "No/expired extinguisher" },
  { key: "damagedDryerLine", label: "Damaged dryer line" },
  { key: "visiblyWornGasLines", label: "Visibly worn gas lines" },
  { key: "noFireLadder", label: "No fire ladder" },
  { key: "missingDetector", label: "Missing detector" },
  { key: "sumpPumpNoBackup", label: "Sump pump (no battery backup)" },
  { key: "damagedOutletsSwitches", label: "Damaged outlets/switches" },
  { key: "discoloredDetector", label: "Discolored detector" },
  { key: "exposedOutlets", label: "Exposed outlets" },
  { key: "lowDeadBatteries", label: "Low/dead batteries" },
  { key: "signsOfWaterLeak", label: "Signs of water leak" },
];

const EXTERIOR_VULN: { key: keyof Assessment["exterior"]; label: string }[] = [
  { key: "looseRockBrickLandscaping", label: "Loose rock/brick landscaping" },
  { key: "unsecuredLadders", label: "Unsecured ladders" },
  { key: "secondFloorAccessibility", label: "2nd-floor accessibility" },
  { key: "unlockedGates", label: "Unlocked gates" },
  { key: "noMotionLights", label: "No motion lights" },
  { key: "unlockedShed", label: "Unlocked shed" },
  { key: "vegetationCoverage", label: "Vegetation coverage" },
  { key: "poorLighting", label: "Poor lighting" },
  { key: "lowWindows", label: "Low windows" },
];

const RISK_OPTS: RiskLevel[] = ["high", "med", "low"];

export function ReviewForm({ jobId, initial }: { jobId: string; initial: Assessment }) {
  const [a, setA] = useState<Assessment>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Tiny helpers to update nested slices immutably.
  const set = <K extends keyof Assessment>(k: K, v: Assessment[K]) => setA((p) => ({ ...p, [k]: v }));
  const setSec = (patch: Partial<Assessment["security"]>) =>
    setA((p) => ({ ...p, security: { ...p.security, ...patch } }));
  const setLife = (patch: Partial<Assessment["lifeSafety"]>) =>
    setA((p) => ({ ...p, lifeSafety: { ...p.lifeSafety, ...patch } }));

  function updateRoom(id: string, patch: Partial<RoomRow>) {
    setA((p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }
  function addRoom() {
    setA((p) => ({ ...p, rooms: [...p.rooms, newRoom()] }));
  }
  function removeRoom(id: string) {
    setA((p) => ({ ...p, rooms: p.rooms.filter((r) => r.id !== id) }));
  }

  function saveAndContinue() {
    start(async () => {
      await saveJob(jobId, { assessment: a });
      router.push(`/assessment/${jobId}/property`);
    });
  }

  return (
    <div className="space-y-5 pb-24">
      <h1 className="text-2xl font-extrabold text-adt-navy">Review assessment</h1>

      <Section title="Household">
        <TextField label="Family name" value={a.familyName} onChange={(v) => set("familyName", v)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Family members"
            value={a.familyMembers}
            onChange={(v) => set("familyMembers", v)}
            placeholder="e.g. 3 (AM)"
          />
          <TextField
            label="Assessment date"
            type="date"
            value={a.assessmentDate}
            onChange={(v) => set("assessmentDate", v)}
          />
        </div>
      </Section>

      <Section title="Security">
        <YesNo
          label="Had an alarm system before?"
          value={a.security.hadAlarmBefore}
          onChange={(v) => setSec({ hadAlarmBefore: v })}
        />
        <TextField
          label="Previous provider"
          value={a.security.previousProvider}
          onChange={(v) => setSec({ previousProvider: v })}
        />
        <TextArea
          label="Reason / primary concerns"
          value={a.security.primaryConcerns}
          onChange={(v) => setSec({ primaryConcerns: v })}
        />
        <TextArea
          label="Emergency access (who has a key)"
          rows={2}
          value={a.security.emergencyAccess}
          onChange={(v) => setSec({ emergencyAccess: v })}
        />
        <div className="grid grid-cols-3 gap-3">
          <TextField
            label="Internet provider"
            value={a.security.internetProvider}
            onChange={(v) => setSec({ internetProvider: v })}
          />
          <TextField
            label="Signal"
            value={a.security.signalStrength}
            onChange={(v) => setSec({ signalStrength: v })}
          />
          <TextField
            label="Upload speed"
            value={a.security.uploadSpeed}
            onChange={(v) => setSec({ uploadSpeed: v })}
          />
        </div>
        <p className="field-label">Areas of vulnerability</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECURITY_VULN.map((f) => (
            <CheckRow
              key={f.key}
              label={f.label}
              checked={a.security.vuln[f.key] as boolean}
              onChange={(v) => setSec({ vuln: { ...a.security.vuln, [f.key]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Life Safety">
        <div className="grid gap-3 sm:grid-cols-2">
          <YesNo
            label="Ever experienced a fire?"
            value={a.lifeSafety.experiencedFire}
            onChange={(v) => setLife({ experiencedFire: v })}
          />
          <YesNo
            label="Water / flood damage?"
            value={a.lifeSafety.waterFloodDamage}
            onChange={(v) => setLife({ waterFloodDamage: v })}
          />
          <YesNo
            label="Persons sleeping upstairs?"
            value={a.lifeSafety.personsSleepingUpstairs}
            onChange={(v) => setLife({ personsSleepingUpstairs: v })}
          />
          <NumberField
            label="# persons upstairs"
            value={a.lifeSafety.numPersonsUpstairs}
            onChange={(v) => setLife({ numPersonsUpstairs: v })}
          />
          <YesNo label="Pets?" value={a.lifeSafety.pets} onChange={(v) => setLife({ pets: v })} />
          <YesNo
            label="Fire escape plan?"
            value={a.lifeSafety.fireEscapePlan}
            onChange={(v) => setLife({ fireEscapePlan: v })}
          />
          <YesNo
            label="Carbon monoxide sources?"
            value={a.lifeSafety.carbonMonoxideSources}
            onChange={(v) => setLife({ carbonMonoxideSources: v })}
          />
        </div>
        <p className="field-label">Areas of vulnerability</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {LIFE_VULN.map((f) => (
            <CheckRow
              key={f.key}
              label={f.label}
              checked={a.lifeSafety.vuln[f.key] as boolean}
              onChange={(v) => setLife({ vuln: { ...a.lifeSafety.vuln, [f.key]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Rooms — doors / windows & risk">
        <div className="space-y-2">
          {a.rooms.length === 0 && (
            <p className="text-sm text-slate-500">No rooms yet — add the ones you walked.</p>
          )}
          {a.rooms.map((room) => (
            <div key={room.id} className="rounded-xl border border-adt-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="field-input flex-1 py-2"
                  placeholder="Room name"
                  value={room.name}
                  onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeRoom(room.id)}
                  className="rounded-lg px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove room"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="w-20">
                  <span className="text-xs text-slate-500">Doors</span>
                  <input
                    type="number"
                    min={0}
                    className="field-input py-2"
                    value={room.doors}
                    onChange={(e) => updateRoom(room.id, { doors: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="w-20">
                  <span className="text-xs text-slate-500">Windows</span>
                  <input
                    type="number"
                    min={0}
                    className="field-input py-2"
                    value={room.windows}
                    onChange={(e) => updateRoom(room.id, { windows: Number(e.target.value) || 0 })}
                  />
                </label>
                <div className="flex gap-1">
                  {RISK_OPTS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateRoom(room.id, { riskLevel: r })}
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs font-bold uppercase transition",
                        room.riskLevel === r
                          ? r === "high"
                            ? "bg-risk-high text-white"
                            : r === "med"
                              ? "bg-risk-med text-white"
                              : "bg-risk-low text-white"
                          : "border border-adt-line bg-white text-slate-500",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRoom} className="btn-secondary w-full">
          + Add room
        </button>
      </Section>

      <Section title="Outside walk-around">
        <div className="grid gap-2 sm:grid-cols-2">
          {EXTERIOR_VULN.map((f) => (
            <CheckRow
              key={f.key}
              label={f.label}
              checked={a.exterior[f.key] as boolean}
              onChange={(v) => set("exterior", { ...a.exterior, [f.key]: v })}
            />
          ))}
        </div>
      </Section>

      <div className="no-print fixed inset-x-0 bottom-0 border-t border-adt-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <button
            className="btn-secondary flex-1"
            disabled={pending}
            onClick={() => start(async () => await saveJob(jobId, { assessment: a }))}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button className="btn-primary flex-[2]" disabled={pending} onClick={saveAndContinue}>
            Save & continue →
          </button>
        </div>
      </div>
    </div>
  );
}
