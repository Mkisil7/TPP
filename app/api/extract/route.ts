import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson } from "@/lib/anthropic";
import { normalizeAssessment } from "@/lib/normalize";
import type { Assessment } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Media = (typeof MEDIA_TYPES)[number];

const SCHEMA_PROMPT = `You are extracting a filled-out ADT "Home Risk Assessment Report" paper form from a photo.
Return ONLY a JSON object (no prose) matching this exact shape. Use null for yes/no fields you can't read,
false for unchecked boxes, "" for blank text. Numbers as integers.

{
  "familyName": string,
  "familyMembers": string,
  "assessmentDate": string (YYYY-MM-DD; infer year if only month/day shown),
  "security": {
    "hadAlarmBefore": true|false|null,
    "previousProvider": string,
    "primaryConcerns": string,
    "internetProvider": string,
    "signalStrength": string,
    "uploadSpeed": string,
    "emergencyAccess": string,
    "vuln": {
      "unlockedWindowsDoors": bool, "overheadGarageDoor": bool, "doorContainsGlass": bool,
      "brokenLocks": bool, "originalDoorLocks": bool, "nonReinforcedDoorLocks": bool, "other": string
    }
  },
  "lifeSafety": {
    "experiencedFire": true|false|null, "fireCheckFrequency": string,
    "waterFloodDamage": true|false|null, "personsSleepingUpstairs": true|false|null,
    "numPersonsUpstairs": int|null, "pets": true|false|null, "fireEscapePlan": true|false|null,
    "carbonMonoxideSources": true|false|null,
    "vuln": {
      "expiredSmokeDetectors": bool, "incorrectDetectorPlacement": bool, "overloadedPlugs": bool,
      "coOver5Years": bool, "lintTrap": bool, "wornWaterHose": bool, "noOrExpiredExtinguisher": bool,
      "damagedDryerLine": bool, "visiblyWornGasLines": bool, "noFireLadder": bool, "missingDetector": bool,
      "sumpPumpNoBackup": bool, "damagedOutletsSwitches": bool, "discoloredDetector": bool,
      "exposedOutlets": bool, "lowDeadBatteries": bool, "signsOfWaterLeak": bool, "other": string
    }
  },
  "rooms": [
    { "name": string, "riskLevel": "high"|"med"|"low", "doors": int, "windows": int }
  ],
  "exterior": {
    "looseRockBrickLandscaping": bool, "unsecuredLadders": bool, "secondFloorAccessibility": bool,
    "unlockedGates": bool, "noMotionLights": bool, "unlockedShed": bool, "vegetationCoverage": bool,
    "poorLighting": bool, "lowWindows": bool, "other": string
  }
}

For the room table: entries like "1D" mean 1 door, "4W" mean 4 windows, "2D" = 2 doors. The risk level
is circled among High/Med/Low. Common room abbreviations: Fnt=Front, Bth=Bath, Gar=Garage, Fam=Family,
Kit=Kitchen, B-fast=Breakfast, Liv=Living, BR=Bedroom, Ofc=Office, MBR/MBA=Master Bed/Bath.`;

export async function POST(request: Request) {
  // Require an authenticated session — this proxies a paid API.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }
  const mediaType = (file.type || "image/jpeg") as Media;
  if (!MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 15MB)." }, { status: 413 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: SCHEMA_PROMPT },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Model returned no text.");
    }
    const parsed = extractJson<Partial<Assessment>>(textBlock.text);
    const assessment = normalizeAssessment(parsed);
    return NextResponse.json({ assessment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
