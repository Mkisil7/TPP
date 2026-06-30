import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { normalizeAssessment, normalizeProperty } from "@/lib/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { assessment: rawA, property: rawP } = (body ?? {}) as Record<string, unknown>;
  const assessment = normalizeAssessment(rawA as never);
  const property = normalizeProperty(rawP as never);

  const prompt = `You are an ADT field security technician writing the "What We Found" page of a
customer-facing home security proposal. Translate the raw assessment below into warm, plain-language prose
the homeowner will read. 2-4 short paragraphs. No bullet lists, no equipment names or prices, no jargon.
Acknowledge their stated concerns, then summarize the security and life-safety vulnerabilities you observed
and why they matter — reassuring and professional, never alarmist. Address the family by name if available.

ASSESSMENT DATA (JSON):
${JSON.stringify({ assessment, property })}`;

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const narrative = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    return NextResponse.json({ narrative });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Narrative generation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
