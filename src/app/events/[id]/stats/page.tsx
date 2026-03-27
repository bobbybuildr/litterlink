import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { submitStats } from "./actions";

export const metadata: Metadata = { title: "Log Impact Stats" };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function StatsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/sign-in?redirectTo=/events/${id}/stats`);

  const { data: event } = await supabase
    .from("events")
    .select("id, title, organiser_id, status")
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Only the organiser can log stats
  if (event.organiser_id !== user.id) notFound();

  const submitStatsForEvent = submitStats.bind(null, id);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link
        href={`/events/${id}`}
        className="mb-6 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Log impact stats</h1>
        <p className="mt-1 text-sm text-gray-500">{event.title}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bags collected" htmlFor="bags_collected">
            <input
              id="bags_collected"
              name="bags_collected"
              type="number"
              min={0}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Weight (kg)" htmlFor="weight_kg">
            <input
              id="weight_kg"
              name="weight_kg"
              type="number"
              min={0}
              step={0.1}
              placeholder="0.0"
              className={inputCls}
            />
          </Field>
          <Field label="Area covered (m²)" htmlFor="area_covered_sqm">
            <input
              id="area_covered_sqm"
              name="area_covered_sqm"
              type="number"
              min={0}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Actual attendees" htmlFor="actual_attendees">
            <input
              id="actual_attendees"
              name="actual_attendees"
              type="number"
              min={0}
              placeholder="0"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes" hint="optional">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any highlights, challenges, or thank-yous…"
            className={inputCls}
          />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <button
            formAction={submitStatsForEvent}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Save &amp; mark completed
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Saving will mark this event as completed and publish the stats publicly.
        </p>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {hint && (
          <span className="ml-1 font-normal text-gray-400">({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}
