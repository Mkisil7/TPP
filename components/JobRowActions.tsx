"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteJob } from "@/app/actions/jobs";

export function JobRowActions({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          className="min-h-[44px] rounded-lg bg-red-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteJob(id);
              router.refresh();
            })
          }
        >
          {pending ? "…" : "Delete"}
        </button>
        <button
          className="btn-ghost min-h-[44px] px-3 text-sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      aria-label={`Delete ${name}`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base text-slate-400 hover:bg-red-50 hover:text-red-600"
      onClick={() => setConfirming(true)}
    >
      ✕
    </button>
  );
}
