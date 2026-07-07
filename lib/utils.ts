import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Field techs write the room table in shorthand. Expand the common
// abbreviations so the customer-facing proposal reads in plain English.
const ROOM_ABBR: Record<string, string> = {
  kit: "Kitchen",
  mbr: "Master Bedroom",
  mba: "Master Bath",
  mbath: "Master Bath",
  br: "Bedroom",
  bdr: "Bedroom",
  bed: "Bedroom",
  liv: "Living Room",
  lr: "Living Room",
  fam: "Family Room",
  din: "Dining Room",
  dr: "Dining Room",
  gar: "Garage",
  fnt: "Front",
  frt: "Front",
  bk: "Back",
  bck: "Back",
  ba: "Bath",
  bth: "Bath",
  bsmt: "Basement",
  hall: "Hallway",
  off: "Office",
  util: "Utility",
  gr: "Great Room",
};

/** Expand room shorthand (e.g. "mbr" → "Master Bedroom", "fnt br" → "Front Bedroom"). */
export function expandRoomName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "";
  return raw
    .split(/\s+/)
    .map((tok) => {
      const key = tok.toLowerCase().replace(/[.]/g, "");
      if (ROOM_ABBR[key]) return ROOM_ABBR[key];
      if (/^\d+$/.test(tok)) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Format a yyyy-mm-dd or ISO date as a friendly label. */
export function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
