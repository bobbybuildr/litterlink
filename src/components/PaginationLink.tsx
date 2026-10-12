import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationLinkProps {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
}

const baseClassName =
  "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors";

/** Renders a plain span when disabled so crawlers never see out-of-range page URLs. */
export function PaginationLink({ href, disabled, children, className }: PaginationLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(baseClassName, "text-gray-300", className)}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(baseClassName, "text-gray-600 hover:bg-gray-50", className)}>
      {children}
    </Link>
  );
}
