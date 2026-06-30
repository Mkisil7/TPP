import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Stepper } from "@/components/Stepper";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { getJob } from "@/app/actions/jobs";
import { normalizeProperty } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Stepper jobId={id} />
        <PropertyForm jobId={id} initial={normalizeProperty(job.property)} />
      </main>
    </>
  );
}
