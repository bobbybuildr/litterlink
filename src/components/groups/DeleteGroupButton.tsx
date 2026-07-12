"use client";

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteGroup } from "@/app/groups/actions";

interface DeleteGroupButtonProps {
  groupId: string;
  className?: string;
}

const CONFIRM_MESSAGE = `Deleting this group will:

- remove the public group page
- remove all memberships
- remove the group logo
- unlink this group from all events

Your events and event history will not be deleted. Any future events will remain live but will no longer belong to this group.

This cannot be undone. Continue?`;

export function DeleteGroupButton({ groupId, className }: DeleteGroupButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(CONFIRM_MESSAGE);
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (result?.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-red-600 bg-red-600 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      {isPending ? "Deleting…" : "Delete group"}
    </button>
  );
}
