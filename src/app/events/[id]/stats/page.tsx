import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { submitStats } from "./actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

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

  // Stats already submitted — redirect back to event page
  if (event.status === "completed") redirect(`/events/${id}`);

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

      <form action={submitStatsForEvent} className="space-y-5">
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
          <Field label="Duration (hours)" htmlFor="duration_hours">
            <input
              id="duration_hours"
              name="duration_hours"
              type="number"
              min={0.5}
              step={0.5}
              placeholder="1.5"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Litter types found" htmlFor="litter_types" hint="select all that apply">
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
            {LITTER_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="litter_types"
                  value={type}
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                {type}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Hotspot severity" htmlFor="hotspot_severity" hint="how bad was the littering?">
          <div className="mt-1 flex items-center gap-3">
            {SEVERITY_LABELS.map(({ value, label }) => (
              <label key={value} className="flex flex-col items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="hotspot_severity"
                  value={value}
                  className="h-4 w-4 border-gray-300 text-brand focus:ring-brand"
                />
                <span className="text-xs text-gray-500">{value}</span>
                <span className="text-xs text-gray-400 text-center leading-tight max-w-16">{label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Notable brands" htmlFor="notable_brands" hint="optional">
          <textarea
            id="notable_brands"
            name="notable_brands"
            rows={2}
            placeholder="e.g. Coca-Cola, McDonald's, Walkers…"
            className={inputCls}
          />
        </Field>

        <Field label="Notes" htmlFor="notes" hint="optional">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Any highlights, challenges, or thank-yous…"
            className={inputCls}
          />
        </Field>

        <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          🖼️ Once marked as completed, you'll be able to add event photos to the event page.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <FormSubmitButton
            pendingText="Saving…"
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Save &amp; mark completed
          </FormSubmitButton>
        </div>

        <p className="text-xs text-gray-400">
          Saving will mark this event as completed and publish the stats publicly.
        </p>
      </form>
    </div>
  );
}

const LITTER_TYPES = [
  "Plastic bottles",
  "Plastic packaging / film",
  "Plastic carrier bags",
  "Cans & tins",
  "Coffee cups",
  "Glass",
  "Cigarette butts",
  "Takeaway packaging",
  "Vapes / e-cigarettes",
  "Nitrous oxide canisters",
  "Dog waste bags",
  "PPE / masks / gloves",
  "Wet wipes / sanitary products",
  "Batteries / small e-waste",
  "Bulky / Fly-tipped waste",
  "other",
];

const SEVERITY_LABELS = [
  { value: 1, label: "Light" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Heavy" },
  { value: 5, label: "Very heavy" },
];

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
