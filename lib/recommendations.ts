import { CATALOG, CATEGORY_ORDER, type CatalogCategory, type ItemId } from "./catalog";
import type { JobData, RiskLevel, RoomRow } from "./types";

// ---------------------------------------------------------------------------
// Deterministic, rule-based recommendation engine.
// Produces equipment lists for three escalating protection tiers.
// ---------------------------------------------------------------------------

export type Tier = "bronze" | "silver" | "gold";

export const TIERS: Tier[] = ["bronze", "silver", "gold"];

export const TIER_META: Record<Tier, { label: string; medal: string; blurb: string }> = {
  bronze: {
    label: "Bronze",
    medal: "🥉",
    blurb: "Essential protection for the highest-risk entry points and core life safety.",
  },
  silver: {
    label: "Silver",
    medal: "🥈",
    blurb: "Comprehensive coverage of doors, windows, and key rooms with smart monitoring.",
  },
  gold: {
    label: "Gold",
    medal: "🥇",
    blurb: "Whole-home defense: every opening protected, full video, and smart-home automation.",
  },
};

export interface LineItem {
  id: ItemId;
  name: string;
  category: CatalogCategory;
  quantity: number;
  reason: string;
  room?: string;
}

export interface RoomRecommendation {
  room: string;
  riskLevel: RiskLevel;
  items: LineItem[];
}

export interface TierRecommendation {
  tier: Tier;
  rooms: RoomRecommendation[];
  byCategory: { category: CatalogCategory; items: LineItem[] }[];
  totalUnits: number;
  notes: string[];
}

export interface Recommendation {
  bronze: TierRecommendation;
  silver: TierRecommendation;
  gold: TierRecommendation;
}

const RANK: Record<Tier, number> = { bronze: 1, silver: 2, gold: 3 };

function isGarage(name: string): boolean {
  return /gar/i.test(name);
}

function riskIncluded(tier: Tier, risk: RiskLevel): boolean {
  if (tier === "gold") return true;
  if (tier === "silver") return risk === "high" || risk === "med";
  return risk === "high"; // bronze
}

function matches(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

// Internal accumulator keyed by item + room so duplicates merge cleanly.
class Builder {
  private map = new Map<string, LineItem>();

  add(id: ItemId, quantity: number, reason: string, room?: string) {
    if (quantity <= 0) return;
    const item = CATALOG[id];
    const key = `${id}__${room ?? ""}`;
    const existing = this.map.get(key);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    this.map.set(key, {
      id,
      name: item.name,
      category: item.category,
      quantity,
      reason,
      room,
    });
  }

  all(): LineItem[] {
    return [...this.map.values()];
  }
}

function buildTier(tier: Tier, job: JobData): TierRecommendation {
  const { assessment, property, followup } = job;
  const b = new Builder();
  const notes: string[] = [];

  const concerns = `${assessment.security.primaryConcerns} ${assessment.security.emergencyAccess}`;
  const livesAlone = matches(concerns, ["alone", "moving out", "her own", "his own", "by herself", "by himself"]);
  const wantsIntrusion = matches(concerns, ["intrus", "break", "burglar", "stop"]);

  // --- Core panel (all tiers) -------------------------------------------
  b.add("wireless_touchscreen", 1, "Central control panel for the system.");
  b.add("desk_mount", 1, "Mount for the touchscreen panel.");

  // --- Per-room door / window coverage ----------------------------------
  for (const room of assessment.rooms) {
    if (!riskIncluded(tier, room.riskLevel)) continue;
    const label = room.name || "Room";

    if (room.doors > 0) {
      b.add("door_open_close", room.doors, "Detects when this door is opened.", label);
    }
    if (room.windows > 0) {
      b.add("window_open_close", room.windows, "Detects when these windows are opened.", label);
    }

    // Garage gets a dedicated overhead sensor.
    if (isGarage(room.name)) {
      b.add("overhead_garage_sensor", 1, "Monitors the overhead garage door.", label);
    }

    // Glass break — high-risk rooms on silver, all rooms on gold.
    if (room.windows > 0) {
      const glassOk =
        (tier === "silver" && room.riskLevel === "high") || tier === "gold";
      if (glassOk) {
        b.add("glass_break", 1, "Catches forced entry through the windows.", label);
      }
    }

    // Shock sensors — gold only, on high-risk openings.
    if (tier === "gold" && room.riskLevel === "high") {
      if (room.doors > 0) b.add("door_shock", room.doors, "Detects impact/forced entry on doors.", label);
      if (room.windows > 0) b.add("window_shock", room.windows, "Detects impact/forced entry on windows.", label);
    }

    // Motion sensors — high-risk on silver, high+med on gold.
    const motionOk =
      (tier === "silver" && room.riskLevel === "high") ||
      (tier === "gold" && (room.riskLevel === "high" || room.riskLevel === "med"));
    if (motionOk) {
      b.add("motion_sensor", 1, "Interior motion coverage for this area.", label);
    }
  }

  // Overhead garage sensor if flagged even when no garage room was listed.
  if (assessment.security.vuln.overheadGarageDoor && RANK[tier] >= 2) {
    const hasGarageRoom = assessment.rooms.some((r) => isGarage(r.name));
    if (!hasGarageRoom) {
      b.add("overhead_garage_sensor", 1, "Flagged vulnerable overhead garage door.");
    }
  }

  // --- Life safety -------------------------------------------------------
  const ls = assessment.lifeSafety;
  const beds = property.beds ?? 3;
  const smokeFlagged =
    ls.vuln.expiredSmokeDetectors ||
    ls.vuln.missingDetector ||
    ls.vuln.discoloredDetector ||
    ls.vuln.incorrectDetectorPlacement ||
    ls.vuln.lowDeadBatteries;
  const smokeReason = smokeFlagged
    ? "Existing detectors flagged expired/missing — replace and add coverage."
    : "Smoke & heat protection for sleeping and living areas.";
  const smokeQty = tier === "bronze" ? 2 : tier === "silver" ? Math.max(3, beds) : Math.max(4, beds + 2);
  b.add("smoke_heat_detector", smokeQty, smokeReason);

  const coFlagged = ls.carbonMonoxideSources || ls.vuln.coOver5Years || ls.personsSleepingUpstairs === true;
  const coQty = tier === "bronze" ? 1 : tier === "silver" ? (coFlagged ? 2 : 1) : coFlagged ? 3 : 2;
  b.add(
    "carbon_monoxide_detector",
    coQty,
    coFlagged ? "CO sources/aging detectors flagged on the assessment." : "Carbon monoxide protection near sleeping areas.",
  );

  const floodFlagged =
    ls.waterFloodDamage === true ||
    ls.vuln.sumpPumpNoBackup ||
    ls.vuln.signsOfWaterLeak ||
    ls.vuln.wornWaterHose;
  if (floodFlagged) {
    const floodQty = tier === "gold" ? 2 : 1;
    b.add("flood_detector", floodQty, "Water/flood risk flagged on the assessment.");
  }

  // --- Smart home extras -------------------------------------------------
  if (RANK[tier] >= 2) {
    b.add("interior_siren", 1, "Audible deterrent inside the home.");
    b.add("key_fob_4btn", tier === "gold" ? 2 : 1, "One-touch arm/disarm at the door.");
    b.add("door_lock", 1, "Smart lock for keyless, remote entry control.");
  }
  if (tier === "gold") {
    b.add("exterior_siren", 1, "Loud outdoor deterrent during an alarm.");
    b.add("nest_thermostat", 1, "Smart climate control add-on.");
    b.add("appliance_module", 1, "Automate lamps/appliances for lived-in look.");
    b.add("google_hub_2nd_gen", 1, "Smart display for system & home control.");
  }

  // Panic button — concern-driven, always on gold.
  if (livesAlone || wantsIntrusion) {
    if (RANK[tier] >= 2) b.add("panic_button_2", 1, "Personal panic button — lives alone / intrusion concern.");
  } else if (tier === "gold") {
    b.add("panic_button_2", 1, "Personal panic button for emergencies.");
  }

  // Garage automation when a garage exists.
  if (RANK[tier] >= 2 && assessment.rooms.some((r) => isGarage(r.name))) {
    b.add("garage_control_myq", 1, "Remote garage door control & monitoring.");
  }

  // --- Video & exterior --------------------------------------------------
  b.add("nest_doorbell", 1, "See and speak to visitors at the front door.");

  const ext = assessment.exterior;
  const extRisk =
    (ext.secondFloorAccessibility ? 1 : 0) +
    (ext.lowWindows ? 1 : 0) +
    (ext.vegetationCoverage ? 1 : 0) +
    (ext.poorLighting ? 1 : 0);

  if (RANK[tier] >= 2 && extRisk >= 1) {
    const outdoorQty = tier === "gold" ? Math.max(1, Math.min(extRisk, 4)) : 1;
    b.add("outdoor_camera", outdoorQty, "Exterior camera for flagged perimeter risks.");
  }
  if (tier === "gold") {
    b.add("indoor_camera", 1, "Interior camera for main living area.");
  }

  // Floodlight cameras — net of existing floodlights on site.
  const floodNeedRaw = (ext.noMotionLights ? 1 : 0) + (ext.poorLighting ? 1 : 0);
  if (floodNeedRaw > 0 && RANK[tier] >= 2) {
    const want = tier === "gold" ? floodNeedRaw : 1;
    const net = Math.max(0, want - followup.existingFloodlightCount);
    if (net > 0) {
      b.add("floodlight_camera", net, "Lights + camera where exterior lighting is poor.");
    } else if (followup.existingFloodlightCount > 0) {
      notes.push(`Credited ${followup.existingFloodlightCount} existing floodlight(s) — no additional floodlight cameras needed.`);
    }
  }

  // Wi-Fi reinforcement when on-site Wi-Fi is weak.
  if (followup.wifiQuality === "weak" && RANK[tier] >= 2) {
    b.add("nest_router", 1, "Strengthens weak on-site Wi-Fi for video devices.");
    if (tier === "gold") b.add("wifi_add_on_point", 1, "Extends Wi-Fi coverage to the perimeter.");
  }

  // --- Gates -------------------------------------------------------------
  let items = b.all();

  // Wi-Fi gate: strip every Wi-Fi-dependent device when there is no internet.
  if (followup.wifiQuality === "none") {
    const before = items.length;
    items = items.filter((it) => !CATALOG[it.id].requiresWifi);
    if (items.length < before) {
      notes.push("No on-site Wi-Fi — all Wi-Fi-dependent smart and video devices removed from this package.");
    }
  }

  // Pet gate: large pets + no motion wanted → strip motion sensors.
  if (followup.petsOver80lb && !followup.wantMotionWithLargePets) {
    const before = items.length;
    items = items.filter((it) => it.id !== "motion_sensor");
    if (items.length < before) {
      notes.push("Motion detectors omitted — pet over 80 lbs and motion sensing not wanted.");
    }
  }

  // --- Group results -----------------------------------------------------
  const rooms = groupByRoom(items, assessment.rooms);
  const byCategory = groupByCategory(items);
  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);

  return { tier, rooms, byCategory, totalUnits, notes };
}

function groupByRoom(items: LineItem[], roomRows: RoomRow[]): RoomRecommendation[] {
  const order = new Map(roomRows.map((r, i) => [r.name || "Room", i]));
  const riskOf = new Map(roomRows.map((r) => [r.name || "Room", r.riskLevel]));
  const groups = new Map<string, LineItem[]>();
  for (const it of items) {
    if (!it.room) continue;
    const list = groups.get(it.room) ?? [];
    list.push(it);
    groups.set(it.room, list);
  }
  return [...groups.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
    .map(([room, list]) => ({
      room,
      riskLevel: (riskOf.get(room) ?? "med") as RiskLevel,
      items: list,
    }));
}

function groupByCategory(items: LineItem[]): { category: CatalogCategory; items: LineItem[] }[] {
  // Merge same item id across rooms into a single category line.
  const merged = new Map<ItemId, LineItem>();
  for (const it of items) {
    const existing = merged.get(it.id);
    if (existing) {
      existing.quantity += it.quantity;
    } else {
      merged.set(it.id, { ...it, room: undefined });
    }
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: [...merged.values()].filter((it) => it.category === category),
  })).filter((g) => g.items.length > 0);
}

export function recommend(job: JobData): Recommendation {
  return {
    bronze: buildTier("bronze", job),
    silver: buildTier("silver", job),
    gold: buildTier("gold", job),
  };
}
