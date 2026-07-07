"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  emptyAssessment,
  emptyFollowUp,
  emptyProperty,
  type Assessment,
  type FollowUp,
  type JobRecord,
  type PropertySnapshot,
  type ProposalEdits,
} from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/** Create a new draft job (optionally seeded from OCR), return its id. */
export async function createDraftJob(
  seed?: Partial<Assessment>,
  photoPath?: string | null,
): Promise<string> {
  const { supabase, user } = await requireUser();
  const assessment: Assessment = { ...emptyAssessment(), ...(seed ?? {}) };

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      family_name: assessment.familyName ?? "",
      assessment_date: assessment.assessmentDate || null,
      status: "draft",
      assessment,
      property: emptyProperty(),
      followup: emptyFollowUp(),
      photo_path: photoPath ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data.id as string;
}

type JobPatch = {
  assessment?: Assessment;
  property?: PropertySnapshot;
  followup?: FollowUp;
};

/** Persist part of a job. Family name + date are derived from the assessment. */
export async function saveJob(id: string, patch: JobPatch): Promise<void> {
  const { supabase } = await requireUser();

  const update: Record<string, unknown> = {};
  if (patch.assessment) {
    update.assessment = patch.assessment;
    update.family_name = patch.assessment.familyName ?? "";
    update.assessment_date = patch.assessment.assessmentDate || null;
  }
  if (patch.property) update.property = patch.property;
  if (patch.followup) update.followup = patch.followup;

  const { error } = await supabase.from("jobs").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath(`/assessment/${id}/review`);
}

/**
 * Mark a job as saved/complete (shows up without the Draft badge). Optionally
 * persist the technician's proposal customizations so they reload intact.
 */
export async function markJobSaved(id: string, proposalEdits?: ProposalEdits): Promise<void> {
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = { status: "saved" };
  if (proposalEdits) update.proposal_edits = proposalEdits;
  const { error } = await supabase.from("jobs").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/assessment/${id}/proposal`);
}

export async function deleteJob(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Fetch one job (RLS guarantees ownership). */
export async function getJob(id: string): Promise<JobRecord | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as JobRecord) ?? null;
}

/** List the current tech's jobs, newest first. */
export async function listJobs(): Promise<JobRecord[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as JobRecord[]) ?? [];
}
