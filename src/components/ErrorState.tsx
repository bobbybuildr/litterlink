import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4 py-24 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h1>

      <p className="mt-3 max-w-md text-base text-gray-600">{message}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
