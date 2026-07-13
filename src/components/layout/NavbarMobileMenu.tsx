"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarPlus, LogIn, Menu, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLinks } from "@/components/layout/NavLinks";

interface NavbarMobileMenuProps {
  isAuthenticated: boolean;
  className?: string;
}

export function NavbarMobileMenu({
  isAuthenticated,
  className,
}: NavbarMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn("relative sm:hidden", className)}>
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        id="mobile-nav-menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg",
          "origin-top-right transition-all duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        )}
      >
        <NavLinks
          className="flex-col items-stretch gap-2"
          linkClassName="justify-start px-3 py-2"
          onLinkClick={() => setOpen(false)}
        />

        <div className="my-3 border-t border-gray-100" />

        {isAuthenticated ? (
          <Link
            href="/events/create"
            onClick={() => setOpen(false)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <CalendarPlus className="h-4 w-4" />
            Create event
          </Link>
        ) : (
          <div className="space-y-2">
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/5"
            >
              <UserPlus className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}