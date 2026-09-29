"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitStats } from "./actions";
import type { FormState } from "@/lib/forms";
import type { Database } from "@/types/database";
import { FormSubmitButton } from "@/components/FormSubmitButton";

type EventStatsRow = Database["public"]["Tables"]["event_stats"]["Row"];

interface StatsFormProps {
  eventId: string;
  existingStats: Pick<
    EventStatsRow,
    | "bags_collected"
    | "actual_attendees"
    | "duration_hours"
    | "litter_types"
    | "hotspot_severity"
    | "notable_brands"
    | "notes"
  > | null;
}

export function StatsForm({ eventId, existingStats }: StatsFormProps) {
  const boundAction = submitStats.bind(null, eventId);
  const [state, formAction] = useActionState<FormState, FormData>(boundAction, {
    error: null,
  });

  const f = state.fields;
  const isEditing = !!existingStats;
  const checkedLitterTypes = f
    ? (f.litter_types ?? "").split("\n")
    : (existingStats?.litter_types ?? []);

  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          ref={errorRef}
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Bags collected" htmlFor="bags_collected">
          <input
            id="bags_collected"
            name="bags_collected"
            type="number"
            min={0}
            max={MAX_BAGS_COLLECTED}
            placeholder="0"
            defaultValue={f?.bags_collected ?? existingStats?.bags_collected ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Actual attendees" htmlFor="actual_attendees">
          <input
            id="actual_attendees"
            name="actual_attendees"
            type="number"
            min={0}
            max={MAX_ACTUAL_ATTENDEES}
            placeholder="0"
            defaultValue={f?.actual_attendees ?? existingStats?.actual_attendees ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Event Duration (hours)" htmlFor="duration_hours">
          <input
            id="duration_hours"
            name="duration_hours"
            type="number"
            min={MIN_DURATION_HOURS}
            max={MAX_DURATION_HOURS}
            step={0.5}
            placeholder="1.5"
            defaultValue={f?.duration_hours ?? existingStats?.duration_hours ?? ""}
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
                defaultChecked={checkedLitterTypes.includes(type)}
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
                defaultChecked={
                  f
                    ? f.hotspot_severity === String(value)
                    : existingStats?.hotspot_severity === value
                }
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
          maxLength={MAX_NOTABLE_BRANDS_LENGTH}
          defaultValue={f?.notable_brands ?? existingStats?.notable_brands ?? ""}
          className={inputCls}
        />
      </Field>

      <Field label="Notes" htmlFor="notes" hint="optional">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any highlights, challenges, or thank-yous…"
          maxLength={MAX_NOTES_LENGTH}
          defaultValue={f?.notes ?? existingStats?.notes ?? ""}
          className={inputCls}
        />
      </Field>

      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        🖼️ Once marked as completed, you&apos;ll be able to add event photos to the event page.
      </p>

      <div className="flex items-center gap-4 pt-2">
        <FormSubmitButton
          pendingText="Saving…"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          {isEditing ? "Save changes" : "Save & mark completed"}
        </FormSubmitButton>
      </div>

      <p className="text-xs text-gray-400">
        {isEditing
          ? "Saving updates these stats publicly on the event page."
          : "Saving will mark this event as completed and publish the stats publicly."}
      </p>
    </form>
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
  "Other",
];

const SEVERITY_LABELS = [
  { value: 1, label: "Light" },
  { value: 2, label: "Mild" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Heavy" },
  { value: 5, label: "Very heavy" },
];

const MAX_BAGS_COLLECTED = 300;
const MAX_ACTUAL_ATTENDEES = 500;
const MIN_DURATION_HOURS = 0.5;
const MAX_DURATION_HOURS = 24;
const MAX_NOTABLE_BRANDS_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;

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
