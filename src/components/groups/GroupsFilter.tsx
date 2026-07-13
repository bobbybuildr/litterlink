"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search, X } from "lucide-react";
import { GROUP_TYPE_LABELS } from "@/lib/constants";

const RADIUS_OPTIONS = [
  { label: "5 mi", value: "8" },
  { label: "10 mi", value: "16" },
  { label: "25 mi", value: "40" },
  { label: "50 mi", value: "80" },
];

export function GroupsFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const postcode = (fd.get("postcode") as string).trim();
    const radius = fd.get("radius") as string;
    const type = fd.get("type") as string;
    const sp = new URLSearchParams();
    if (postcode) sp.set("postcode", postcode.toUpperCase());
    if (radius) sp.set("radius", radius);
    if (type) sp.set("type", type);
    startTransition(() => {
      router.push(`/groups?${sp.toString()}`);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 md:gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex gap-2 md:gap-3 sm:contents">
        <div className="flex-1">
          <label htmlFor="postcode" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Postcode
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              id="postcode"
              name="postcode"
              type="text"
              placeholder="e.g. SW1A 1AA"
              defaultValue={params.get("postcode") ?? ""}
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm uppercase placeholder-gray-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div>
          <label htmlFor="radius" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Radius
          </label>
          <select
            id="radius"
            name="radius"
            defaultValue={params.get("radius") ?? "16"}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {RADIUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1">
        <label htmlFor="type" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          Group type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={params.get("type") ?? ""}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">All types</option>
          {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-4 py-2 mt-2 sm:mt-0 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60 transition-colors"
      >
        {isPending ? "Searching…" : "Search"}
      </button>

      {(params.get("postcode") || params.get("radius") || params.get("type")) && (
        <button
          type="button"
          onClick={() => { formRef.current?.reset(); startTransition(() => router.push("/groups")); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
          title="Reset all filters"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </form>
  );
}
