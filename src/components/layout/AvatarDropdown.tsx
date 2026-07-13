"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, UserPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

interface AvatarDropdownProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  initials: string;
  className?: string;
}

export function AvatarDropdown({
  avatarUrl,
  displayName,
  initials,
  className,
}: AvatarDropdownProps) {
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
    <div ref={ref} className={cn("relative flex items-center", className)}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className="relative shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-brand/40 focus-visible:outline-none focus-visible:ring-brand/60"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName ?? "Profile"}
            width={32}
            height={32}
            className="h-9 w-9 rounded-full border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-brand text-sm font-semibold text-white">
            {initials}
          </div>
        )}
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
          <ChevronDown
            className={cn(
              "h-2.5 w-2.5 text-gray-500 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      <div
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg",
          "origin-top-right transition-all duration-200 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        )}
      >
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 text-gray-400" />
          Dashboard
        </Link>
        <div className="my-1 border-t border-gray-100" />
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <UserPen className="h-4 w-4 text-gray-400" />
          Edit profile
        </Link>
        <div className="my-1 border-t border-gray-100" />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-400" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
