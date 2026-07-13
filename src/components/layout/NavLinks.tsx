"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/events",
    label: "Events",
    activeClassName: "bg-brand/20 text-brand",
    inactiveClassName: "bg-brand/10 text-brand hover:bg-brand/20",
  },
  {
    href: "/groups",
    label: "Groups",
    activeClassName: "bg-accent/20 text-accent",
    inactiveClassName: "bg-accent/10 text-accent hover:bg-accent/20",
  },
];

interface NavLinksProps {
  className?: string;
  linkClassName?: string;
  onLinkClick?: () => void;
}

export function NavLinks({
  className,
  linkClassName,
  onLinkClick,
}: NavLinksProps) {
  const pathname = usePathname();
  const isActiveLink = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {links.map(({ href, label, activeClassName, inactiveClassName }) => (
        <Link
          key={href}
          href={href}
          onClick={onLinkClick}
          aria-current={isActiveLink(href) ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            isActiveLink(href) ? activeClassName : inactiveClassName,
            linkClassName
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
