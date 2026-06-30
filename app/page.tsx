import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { listJobs } from "@/app/actions/jobs";
import { formatDate } from "@/lib/utils";
import { JobRowActions } from "@/components/JobRowActions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const jobs = await listJobs();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-adt-navy">Jobs</h1>
            <p className="text-sm text-slate-500">Your saved home risk assessments.</p>
          </div>
          <Link href="/assessment/new" className="btn-primary">
            + New assessment
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-slate-500">No saved jobs yet.</p>
            <Link href="/assessment/new" className="btn-primary">
              Start your first assessment
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/assessment/${job.id}/review`} className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-adt-navy">
                    {job.family_name?.trim() || "Untitled job"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(job.assessment_date) || formatDate(job.created_at)}
                    {job.status === "draft" && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Draft
                      </span>
                    )}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/assessment/${job.id}/proposal`} className="btn-secondary px-3 py-2 text-sm">
                    Proposal
                  </Link>
                  <JobRowActions id={job.id} name={job.family_name?.trim() || "this job"} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
