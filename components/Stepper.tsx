"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS = [
  { slug: "review", label: "Review" },
  { slug: "property", label: "Property" },
  { slug: "followup", label: "Follow-up" },
  { slug: "proposal", label: "Proposal" },
];

export function Stepper({ jobId }: { jobId: string }) {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => pathname.endsWith(`/${s.slug}`));

  return (
    <nav className="scroll-x no-print mb-5 flex items-center gap-1">
      {STEPS.map((step, i) => (
        <Link
          key={step.slug}
          href={`/assessment/${jobId}/${step.slug}`}
          className={cn(
            "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition",
            i === current
              ? "bg-adt-navy text-white"
              : i < current
                ? "bg-adt-mist text-adt-navy"
                : "text-slate-400 hover:bg-adt-mist",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-xs",
              i === current ? "bg-white text-adt-navy" : "bg-adt-line text-adt-navy",
            )}
          >
            {i + 1}
          </span>
          {step.label}
        </Link>
      ))}
    </nav>
  );
}
