"use client";

import { FormSubmitButton } from "@/components/FormSubmitButton";

export function SubmitButton({ disabled }: { disabled?: boolean }) {
  return (
    <FormSubmitButton
      pendingText="Publishing…"
      disabled={disabled}
      className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
    >
      Publish event
    </FormSubmitButton>
  );
}
