"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/events", label: "Events" },
];

interface NavLinksProps {
  className?: string;
}

export function NavLinks({ className }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            pathname.startsWith(href)
              ? "bg-brand/10 text-brand"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
