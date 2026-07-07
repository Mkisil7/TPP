import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { Proposal } from "@/components/proposal/Proposal";
import { getJob } from "@/app/actions/jobs";
import { normalizeJob, normalizeProposalEdits } from "@/lib/normalize";
import { recommend } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const data = normalizeJob(job);
  const recommendation = recommend(data);
  const initialEdits = normalizeProposalEdits(job.proposal_edits);

  return (
    <>
      <div className="no-print">
        <AppHeader />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="no-print">
          <Stepper jobId={id} />
        </div>
        <Proposal
          jobId={id}
          data={data}
          recommendation={recommendation}
          initialEdits={initialEdits}
        />
      </main>
    </>
  );
}
