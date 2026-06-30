import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { FollowUpForm } from "@/components/forms/FollowUpForm";
import { getJob } from "@/app/actions/jobs";
import { normalizeAssessment, normalizeFollowUp } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export default async function FollowUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const assessment = normalizeAssessment(job.assessment);
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Stepper jobId={id} />
        <FollowUpForm
          jobId={id}
          initial={normalizeFollowUp(job.followup)}
          hasPets={assessment.lifeSafety.pets === true}
        />
      </main>
    </>
  );
}
