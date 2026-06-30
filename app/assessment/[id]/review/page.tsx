import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { ReviewForm } from "@/components/forms/ReviewForm";
import { getJob } from "@/app/actions/jobs";
import { normalizeAssessment } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Stepper jobId={id} />
        <ReviewForm jobId={id} initial={normalizeAssessment(job.assessment)} />
      </main>
    </>
  );
}
