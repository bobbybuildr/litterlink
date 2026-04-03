"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAccount, type ProfileState } from "./actions";

export function DeleteAccountSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    deleteAccount,
    null,
  );

  const isConfirmed = confirmText === "DELETE";

  function handleCancel() {
    setIsOpen(false);
    setConfirmText("");
  }

  return (
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-red-800">Delete account</h2>
          <p className="text-sm leading-6 text-red-700">
            Removes your personal data and signs you out permanently. Events and
            impact stats you organised or attended are kept for the community but
            will no longer be linked to your account.
          </p>
        </div>
      </div>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Delete my account
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <p className="text-sm text-red-700">
            Type <span className="font-mono font-bold">DELETE</span> to confirm.
          </p>
          <input
            type="text"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={pending}
            className="w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:opacity-60"
          />

          {state?.error && (
            <p className="rounded-lg bg-red-100 px-4 py-2.5 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!isConfirmed || pending}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                isConfirmed && !pending
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "cursor-not-allowed bg-red-200 text-red-400",
              )}
            >
              {pending ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
