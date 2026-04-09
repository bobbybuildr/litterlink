"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostcodeSearchProps {
  className?: string;
}

export function PostcodeSearch({ className }: PostcodeSearchProps) {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = postcode.trim().toUpperCase();
    const sp = new URLSearchParams();
    if (trimmed) sp.set("postcode", trimmed);
    router.push(`/events?${sp.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full max-w-md flex-col gap-0 sm:flex-row", className)}
    >
      <input
        type="text"
        name="postcode"
        value={postcode}
        onChange={(e) => setPostcode(e.target.value)}
        placeholder="Enter your postcode…"
        autoComplete="postal-code"
        className="flex-1 rounded-t-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:rounded-l-xl sm:rounded-tr-none"
      />
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-b-xl bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark sm:rounded-r-xl sm:rounded-bl-none"
      >
        <Search className="h-4 w-4 shrink-0" />
        Find events
      </button>
    </form>
  );
}
