// ---------------------------------------------------------------------------
// Domain types mirroring the paper "Home Risk Assessment Report"
// ---------------------------------------------------------------------------

export type RiskLevel = "high" | "med" | "low";
export type YesNo = boolean | null;

export interface RoomRow {
  id: string;
  name: string; // e.g. "Front", "Family", "Garage", "Master BR"
  riskLevel: RiskLevel;
  doors: number;
  windows: number;
}

export interface SecuritySection {
  hadAlarmBefore: YesNo;
  previousProvider: string; // e.g. "AT&T"
  primaryConcerns: string; // free text — reason for getting a system
  internetProvider: string;
  signalStrength: string;
  uploadSpeed: string;
  emergencyAccess: string; // who else has a key during an emergency
  vuln: {
    unlockedWindowsDoors: boolean;
    overheadGarageDoor: boolean;
    doorContainsGlass: boolean;
    brokenLocks: boolean;
    originalDoorLocks: boolean;
    nonReinforcedDoorLocks: boolean;
    other: string;
  };
}

export interface LifeSafetySection {
  experiencedFire: YesNo;
  fireCheckFrequency: string;
  waterFloodDamage: YesNo;
  personsSleepingUpstairs: YesNo;
  numPersonsUpstairs: number | null;
  pets: YesNo;
  fireEscapePlan: YesNo;
  carbonMonoxideSources: YesNo;
  vuln: {
    expiredSmokeDetectors: boolean; // > 9 years
    incorrectDetectorPlacement: boolean;
    overloadedPlugs: boolean;
    coOver5Years: boolean;
    lintTrap: boolean;
    wornWaterHose: boolean;
    noOrExpiredExtinguisher: boolean;
    damagedDryerLine: boolean;
    visiblyWornGasLines: boolean;
    noFireLadder: boolean;
    missingDetector: boolean;
    sumpPumpNoBackup: boolean;
    damagedOutletsSwitches: boolean;
    discoloredDetector: boolean;
    exposedOutlets: boolean;
    lowDeadBatteries: boolean;
    signsOfWaterLeak: boolean;
    other: string;
  };
}

export interface ExteriorSection {
  looseRockBrickLandscaping: boolean;
  unsecuredLadders: boolean;
  secondFloorAccessibility: boolean;
  unlockedGates: boolean;
  noMotionLights: boolean;
  unlockedShed: boolean;
  vegetationCoverage: boolean;
  poorLighting: boolean;
  lowWindows: boolean;
  other: string;
}

export interface Assessment {
  familyName: string;
  familyMembers: string; // free text; the form uses notations like "3 AM"
  assessmentDate: string; // yyyy-mm-dd
  security: SecuritySection;
  lifeSafety: LifeSafetySection;
  rooms: RoomRow[];
  exterior: ExteriorSection;
}

export interface PropertySnapshot {
  address: string;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  yearBuilt: number | null;
}

export type WifiQuality = "good" | "weak" | "none";

export interface FollowUp {
  existingFloodlightCount: number;
  wifiQuality: WifiQuality;
  petsOver80lb: boolean;
  wantMotionWithLargePets: boolean; // relevant only when petsOver80lb
  notes: string;
}

export interface JobData {
  assessment: Assessment;
  property: PropertySnapshot;
  followup: FollowUp;
}

export interface JobRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  family_name: string;
  assessment_date: string | null;
  status: string;
  assessment: Assessment;
  property: PropertySnapshot;
  followup: FollowUp;
  photo_path: string | null;
}

// ---------------------------------------------------------------------------
// Factories — empty defaults used by the manual-entry path & new jobs
// ---------------------------------------------------------------------------

export function emptyAssessment(): Assessment {
  return {
    familyName: "",
    familyMembers: "",
    assessmentDate: new Date().toISOString().slice(0, 10),
    security: {
      hadAlarmBefore: null,
      previousProvider: "",
      primaryConcerns: "",
      internetProvider: "",
      signalStrength: "",
      uploadSpeed: "",
      emergencyAccess: "",
      vuln: {
        unlockedWindowsDoors: false,
        overheadGarageDoor: false,
        doorContainsGlass: false,
        brokenLocks: false,
        originalDoorLocks: false,
        nonReinforcedDoorLocks: false,
        other: "",
      },
    },
    lifeSafety: {
      experiencedFire: null,
      fireCheckFrequency: "",
      waterFloodDamage: null,
      personsSleepingUpstairs: null,
      numPersonsUpstairs: null,
      pets: null,
      fireEscapePlan: null,
      carbonMonoxideSources: null,
      vuln: {
        expiredSmokeDetectors: false,
        incorrectDetectorPlacement: false,
        overloadedPlugs: false,
        coOver5Years: false,
        lintTrap: false,
        wornWaterHose: false,
        noOrExpiredExtinguisher: false,
        damagedDryerLine: false,
        visiblyWornGasLines: false,
        noFireLadder: false,
        missingDetector: false,
        sumpPumpNoBackup: false,
        damagedOutletsSwitches: false,
        discoloredDetector: false,
        exposedOutlets: false,
        lowDeadBatteries: false,
        signsOfWaterLeak: false,
        other: "",
      },
    },
    rooms: [],
    exterior: {
      looseRockBrickLandscaping: false,
      unsecuredLadders: false,
      secondFloorAccessibility: false,
      unlockedGates: false,
      noMotionLights: false,
      unlockedShed: false,
      vegetationCoverage: false,
      poorLighting: false,
      lowWindows: false,
      other: "",
    },
  };
}

export function emptyProperty(): PropertySnapshot {
  return { address: "", sqft: null, beds: null, baths: null, yearBuilt: null };
}

export function emptyFollowUp(): FollowUp {
  return {
    existingFloodlightCount: 0,
    wifiQuality: "good",
    petsOver80lb: false,
    wantMotionWithLargePets: true,
    notes: "",
  };
}

export function newRoom(name = ""): RoomRow {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    riskLevel: "med",
    doors: 0,
    windows: 0,
  };
}
