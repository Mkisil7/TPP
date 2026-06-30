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
          className="rounded-lg bg-red-600 px-2 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
        <button className="btn-ghost px-2 py-2 text-sm" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      aria-label={`Delete ${name}`}
      className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
      onClick={() => setConfirming(true)}
    >
      ✕
    </button>
  );
}
