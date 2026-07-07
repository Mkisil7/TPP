import { CATALOG, CATEGORY_ORDER, type CatalogCategory, type ItemId } from "./catalog";
import type { JobData, RiskLevel, RoomRow } from "./types";
import { expandRoomName } from "./utils";

// ---------------------------------------------------------------------------
// Deterministic, rule-based recommendation engine.
// Produces equipment lists for two protection packages.
// ---------------------------------------------------------------------------

export type Tier = "comprehensive" | "basic";

/** Display order: lead with the full package. */
export const TIERS: Tier[] = ["comprehensive", "basic"];

export const TIER_META: Record<Tier, { label: string; blurb: string }> = {
  comprehensive: {
    label: "Comprehensive",
    blurb:
      "Whole-home defense: premium open/close + impact sensors on every opening, full video coverage, complete life safety, and smart-home automation.",
  },
  basic: {
    label: "Basic",
    blurb:
      "The essentials: open/close protection on every area of the home plus core life-safety coverage.",
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
  basic: TierRecommendation;
  comprehensive: TierRecommendation;
}

function isGarage(name: string): boolean {
  return /gar/i.test(name);
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
  const comprehensive = tier === "comprehensive";
  const b = new Builder();
  const notes: string[] = [];

  // --- Control panel (Smart Home) ---------------------------------------
  const panelQty = 1 + Math.max(0, followup.extraTouchscreens || 0);
  b.add(
    "wireless_touchscreen",
    panelQty,
    panelQty > 1
      ? "Central control panel plus additional touchscreen(s)."
      : "Central control panel for the system.",
  );
  // Desk mount is a Command accessory and rarely used — only when requested.
  if (followup.systemType === "command" && followup.deskMountNeeded) {
    b.add("desk_mount", 1, "Desk mount for the Command touchscreen.");
  }

  // --- Per-room burglar protection --------------------------------------
  // Every area gets its door/window sensors on both packages, regardless of
  // risk level. Comprehensive uses the premium shock sensor (open/close +
  // impact in one unit); basic uses a plain open/close sensor.
  const glassAllowed = !followup.impactGlass; // impact glass can't be broken → no glass break
  for (const room of assessment.rooms) {
    const label = expandRoomName(room.name) || "Room";

    if (room.doors > 0) {
      if (comprehensive) {
        b.add("door_shock", room.doors, "Premium door sensor — detects opening and forced impact.", label);
      } else {
        b.add("door_open_close", room.doors, "Detects when this door is opened.", label);
      }
    }

    if (room.windows > 0) {
      if (comprehensive) {
        b.add("window_shock", room.windows, "Premium window sensor — detects opening and glass impact.", label);
        // Fixed/picture windows can't take a contact sensor — cover with glass break.
        if (glassAllowed && followup.hasFixedWindows) {
          b.add("glass_break", 1, "Covers fixed/picture windows that can't take a contact sensor.", label);
        }
      } else {
        // Basic: a single glass break can protect a many-window room (or any
        // fixed glass) for far less than sensoring every window.
        const useGlass = glassAllowed && (room.windows >= 5 || followup.hasFixedWindows);
        if (useGlass) {
          b.add(
            "glass_break",
            1,
            room.windows >= 5
              ? "One glass-break covers this multi-window room affordably."
              : "Covers fixed/picture windows in this room.",
            label,
          );
        } else {
          b.add("window_open_close", room.windows, "Detects when these windows are opened.", label);
        }
      }
    }

    if (isGarage(room.name)) {
      b.add("overhead_garage_sensor", 1, "Monitors the overhead garage door.", label);
    }

    // Motion — comprehensive package, higher-risk rooms.
    if (comprehensive && (room.riskLevel === "high" || room.riskLevel === "med")) {
      b.add("motion_sensor", 1, "Interior motion coverage for this area.", label);
    }
  }

  // Overhead garage sensor if flagged vulnerable even without a garage room listed.
  if (assessment.security.vuln.overheadGarageDoor) {
    const hasGarageRoom = assessment.rooms.some((r) => isGarage(r.name));
    if (!hasGarageRoom) {
      b.add("overhead_garage_sensor", 1, "Flagged vulnerable overhead garage door.", "Garage");
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
  const detectorQty = comprehensive ? Math.max(4, beds + 2) : Math.max(3, beds);

  const coFlagged =
    ls.carbonMonoxideSources === true || ls.vuln.coOver5Years || ls.personsSleepingUpstairs === true;
  if (coFlagged) {
    // CO in play → use the combination unit (one device does smoke/heat + CO).
    b.add(
      "smoke_heat_co_combo",
      detectorQty,
      "Combination smoke/heat/CO — CO sources or upstairs sleepers flagged (one unit covers all three).",
    );
  } else {
    b.add(
      "smoke_heat_detector",
      detectorQty,
      smokeFlagged
        ? "Existing detectors flagged — replace and add smoke/heat coverage."
        : "Smoke & heat protection for sleeping and living areas.",
    );
  }

  const floodFlagged =
    ls.waterFloodDamage === true ||
    ls.vuln.sumpPumpNoBackup ||
    ls.vuln.signsOfWaterLeak ||
    ls.vuln.wornWaterHose;
  if (floodFlagged) {
    b.add("flood_detector", comprehensive ? 2 : 1, "Water/flood risk flagged on the assessment.");
  }

  // --- Smart home --------------------------------------------------------
  b.add("interior_siren", 1, "Audible deterrent inside the home.");
  b.add("key_fob_4btn", 2, "One-touch arm/disarm at the door.");
  if (comprehensive) {
    b.add("exterior_siren", 1, "Loud outdoor deterrent during an alarm.");
    b.add("nest_thermostat", 1, "Smart climate control add-on.");
    b.add("door_lock", 1, "Smart lock for keyless, remote entry control.");
    b.add("appliance_module", 1, "Automate lamps/appliances for a lived-in look.");
    b.add("google_hub_2nd_gen", 1, "Smart display for system & home control.");
    if (assessment.rooms.some((r) => isGarage(r.name))) {
      b.add("garage_control_myq", 1, "Remote garage door control & monitoring.");
    }
  }

  // Panic button — small-business locations only.
  if (followup.smallBusiness) {
    b.add("panic_button_2", 1, "2-button panic button for small-business coverage.");
  }

  // --- Video / display ---------------------------------------------------
  b.add("nest_doorbell", 1, "See and speak to visitors at the front door.");

  const cams = Math.max(0, followup.cameraCount || 0);
  if (cams > 0) {
    b.add("outdoor_camera", cams, "Exterior cameras selected during the walkthrough.");
  }

  // Floodlight cameras where exterior lighting is poor — net of existing.
  const ext = assessment.exterior;
  const floodNeedRaw = (ext.noMotionLights ? 1 : 0) + (ext.poorLighting ? 1 : 0);
  if (floodNeedRaw > 0) {
    const net = Math.max(0, floodNeedRaw - followup.existingFloodlightCount);
    if (net > 0) {
      b.add("floodlight_camera", net, "Lights + camera where exterior lighting is poor.");
    } else if (followup.existingFloodlightCount > 0) {
      notes.push(
        `Credited ${followup.existingFloodlightCount} existing floodlight(s) — no additional floodlight cameras needed.`,
      );
    }
  }

  // Wi-Fi reinforcement when on-site Wi-Fi is weak.
  if (followup.wifiQuality === "weak") {
    b.add("nest_router", 1, "Strengthens weak on-site Wi-Fi for video devices.");
    if (comprehensive) {
      b.add("wifi_add_on_point", 1, "Extends Wi-Fi coverage to the perimeter.");
    }
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
  const order = new Map(roomRows.map((r, i) => [expandRoomName(r.name) || "Room", i]));
  const riskOf = new Map(roomRows.map((r) => [expandRoomName(r.name) || "Room", r.riskLevel]));
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
    basic: buildTier("basic", job),
    comprehensive: buildTier("comprehensive", job),
  };
}
