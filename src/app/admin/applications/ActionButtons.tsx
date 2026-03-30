"use client";

import { useTransition } from "react";
import { approveApplication, rejectApplication } from "./actions";

interface ActionButtonsProps {
  applicationId: string;
}

export function ApproveButton({ applicationId }: ActionButtonsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void approveApplication(applicationId);
        })
      }
      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Approving…" : "Approve"}
    </button>
  );
}

export function RejectButton({ applicationId }: ActionButtonsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void rejectApplication(applicationId);
        })
      }
      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Rejecting…" : "Reject"}
    </button>
  );
}
