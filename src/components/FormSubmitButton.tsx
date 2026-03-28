"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface FormSubmitButtonProps {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}

export function FormSubmitButton({ children, pendingText, className }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("disabled:opacity-60 disabled:cursor-not-allowed", className)}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
