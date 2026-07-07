// ---------------------------------------------------------------------------
// Equipment catalog — mirrors the "Thorough Protection Plan" output sheet.
// `requiresWifi` drives the Wi-Fi gate: when on-site Wi-Fi is "none", every
// item flagged here is stripped from the recommendation.
//
// Items are grouped into the four sections a technician builds a package from:
// Burglar Protection · Life Safety · Video/Display · Smart Home.
// ---------------------------------------------------------------------------

export type CatalogCategory =
  | "Burglar Protection"
  | "Life Safety"
  | "Video/Display"
  | "Smart Home";

export type ItemId =
  // Burglar Protection
  | "door_open_close"
  | "door_shock"
  | "overhead_garage_sensor"
  | "window_open_close"
  | "window_shock"
  | "glass_break"
  | "motion_sensor"
  // Life Safety
  | "smoke_heat_detector"
  | "smoke_heat_co_combo"
  | "carbon_monoxide_detector"
  | "flood_detector"
  // Video/Display
  | "nest_doorbell"
  | "indoor_camera"
  | "outdoor_camera"
  | "floodlight_camera"
  | "nest_router"
  | "wifi_add_on_point"
  | "google_hub_max"
  | "google_hub_2nd_gen"
  | "google_nest_audio"
  // Smart Home
  | "key_fob_4btn"
  | "panic_button_2"
  | "wireless_touchscreen"
  | "wall_mount"
  | "desk_mount"
  | "interior_siren"
  | "exterior_siren"
  | "nest_thermostat"
  | "door_lock"
  | "appliance_module"
  | "garage_control_myq";

export interface CatalogItem {
  id: ItemId;
  name: string;
  category: CatalogCategory;
  requiresWifi: boolean;
}

export const CATALOG: Record<ItemId, CatalogItem> = {
  // --- Burglar Protection -------------------------------------------------
  // A shock sensor is the premium door/window sensor: it reports open/close
  // AND forced impact in a single unit, so it replaces (not supplements) a
  // plain open/close sensor.
  door_open_close: { id: "door_open_close", name: "Door Open/Close Sensor", category: "Burglar Protection", requiresWifi: false },
  door_shock: { id: "door_shock", name: "Door Shock Sensor (Open/Close + Impact)", category: "Burglar Protection", requiresWifi: false },
  overhead_garage_sensor: { id: "overhead_garage_sensor", name: "Overhead Garage Door Sensor", category: "Burglar Protection", requiresWifi: false },
  window_open_close: { id: "window_open_close", name: "Window Open/Close Sensor", category: "Burglar Protection", requiresWifi: false },
  window_shock: { id: "window_shock", name: "Window Shock Sensor (Open/Close + Impact)", category: "Burglar Protection", requiresWifi: false },
  glass_break: { id: "glass_break", name: "Glass Break Detector", category: "Burglar Protection", requiresWifi: false },
  motion_sensor: { id: "motion_sensor", name: "Motion Sensor", category: "Burglar Protection", requiresWifi: false },

  // --- Life Safety --------------------------------------------------------
  smoke_heat_detector: { id: "smoke_heat_detector", name: "Smoke / Heat Detector", category: "Life Safety", requiresWifi: false },
  smoke_heat_co_combo: { id: "smoke_heat_co_combo", name: "Smoke / Heat / CO Combination Detector", category: "Life Safety", requiresWifi: false },
  carbon_monoxide_detector: { id: "carbon_monoxide_detector", name: "Carbon Monoxide Detector", category: "Life Safety", requiresWifi: false },
  flood_detector: { id: "flood_detector", name: "Flood Detector", category: "Life Safety", requiresWifi: false },

  // --- Video/Display ------------------------------------------------------
  nest_doorbell: { id: "nest_doorbell", name: "Nest Video Doorbell", category: "Video/Display", requiresWifi: true },
  indoor_camera: { id: "indoor_camera", name: "Indoor Nest Camera", category: "Video/Display", requiresWifi: true },
  outdoor_camera: { id: "outdoor_camera", name: "Outdoor Nest Camera", category: "Video/Display", requiresWifi: true },
  floodlight_camera: { id: "floodlight_camera", name: "Nest Floodlight Camera", category: "Video/Display", requiresWifi: true },
  nest_router: { id: "nest_router", name: "Nest Router", category: "Video/Display", requiresWifi: true },
  wifi_add_on_point: { id: "wifi_add_on_point", name: "Nest Wi-Fi Add-on Point", category: "Video/Display", requiresWifi: true },
  google_hub_max: { id: "google_hub_max", name: "Google Hub Max", category: "Video/Display", requiresWifi: true },
  google_hub_2nd_gen: { id: "google_hub_2nd_gen", name: "Google Hub (2nd Gen)", category: "Video/Display", requiresWifi: true },
  google_nest_audio: { id: "google_nest_audio", name: "Google Nest Audio", category: "Video/Display", requiresWifi: true },

  // --- Smart Home ---------------------------------------------------------
  key_fob_4btn: { id: "key_fob_4btn", name: "4-Button Key Fob", category: "Smart Home", requiresWifi: false },
  panic_button_2: { id: "panic_button_2", name: "2-Button Panic Button", category: "Smart Home", requiresWifi: false },
  wireless_touchscreen: { id: "wireless_touchscreen", name: "Wireless Touchscreen Panel", category: "Smart Home", requiresWifi: false },
  wall_mount: { id: "wall_mount", name: "Wall Mount", category: "Smart Home", requiresWifi: false },
  desk_mount: { id: "desk_mount", name: "Desk Mount", category: "Smart Home", requiresWifi: false },
  interior_siren: { id: "interior_siren", name: "Interior Siren", category: "Smart Home", requiresWifi: false },
  exterior_siren: { id: "exterior_siren", name: "Exterior Siren", category: "Smart Home", requiresWifi: false },
  nest_thermostat: { id: "nest_thermostat", name: "Nest Smart Learning Thermostat", category: "Smart Home", requiresWifi: true },
  door_lock: { id: "door_lock", name: "Smart Door Lock", category: "Smart Home", requiresWifi: true },
  appliance_module: { id: "appliance_module", name: "Appliance Module", category: "Smart Home", requiresWifi: false },
  garage_control_myq: { id: "garage_control_myq", name: "Garage Control (Z-Wave / myQ)", category: "Smart Home", requiresWifi: true },
};

export const CATEGORY_ORDER: CatalogCategory[] = [
  "Burglar Protection",
  "Life Safety",
  "Video/Display",
  "Smart Home",
];
