"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search, X } from "lucide-react";

const RADIUS_OPTIONS = [
  { label: "5 mi", value: "8" },
  { label: "10 mi", value: "16" },
  { label: "25 mi", value: "40" },
  { label: "50 mi", value: "80" },
];

interface EventsFilterProps {
  defaultFrom?: string;
  defaultTo?: string;
}

export function EventsFilter({ defaultFrom, defaultTo }: EventsFilterProps = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const postcode = (fd.get("postcode") as string).trim();
    const radius = fd.get("radius") as string;
    const from = fd.get("from") as string;
    const to = fd.get("to") as string;
    const sp = new URLSearchParams();
    if (postcode) sp.set("postcode", postcode.toUpperCase());
    if (radius) sp.set("radius", radius);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    startTransition(() => {
      router.push(`/events?${sp.toString()}`);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
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
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm uppercase placeholder-gray-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <div>
        <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">
          Radius
        </label>
        <select
          id="radius"
          name="radius"
          defaultValue={params.get("radius") ?? "16"}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          {RADIUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-1">
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={params.get("from") ?? defaultFrom ?? ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
          To
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={params.get("to") ?? defaultTo ?? ""}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60 transition-colors"
      >
        {isPending ? "Searching…" : "Search"}
      </button>

      {(params.get("postcode") || params.get("radius") || params.get("from") || params.get("to")) && (
        <button
          type="button"
          onClick={() => { formRef.current?.reset(); startTransition(() => router.push("/events")); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-800 transition-colors"
          title="Reset all filters"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      )}
    </form>
  );
}
