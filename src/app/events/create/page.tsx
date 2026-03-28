import type { Metadata } from "next";
import { createEvent } from "@/app/events/create/actions";
import { SubmitButton } from "./SubmitButton";

export const metadata: Metadata = {
  title: "Create a Litter Pick",
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const { error } = await searchParams;

  // Set min datetime to now (rounded up to next 15 min)
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const minDatetime = now.toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create a litter pick</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details and your event will be published immediately.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={createEvent} className="space-y-6">
        {/* Title */}
        <Field label="Event title *" htmlFor="title">
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Riverside litter pick — London Bridge"
            className={inputCls}
          />
        </Field>

        {/* Description */}
        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="What to bring, where to meet exactly, etc."
            className={inputCls}
          />
        </Field>

        {/* Postcode + meeting point */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Postcode *" htmlFor="postcode" hint="UK postcodes only">
            <input
              id="postcode"
              name="postcode"
              type="text"
              required
              placeholder="SW1A 1AA"
              className={`${inputCls} uppercase`}
            />
          </Field>
          <Field
            label="Meeting point"
            htmlFor="address_label"
            hint="e.g. 'Outside Tesco, High Street'"
          >
            <input
              id="address_label"
              name="address_label"
              type="text"
              placeholder="Outside the old library"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Date/time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Start date & time *" htmlFor="starts_at">
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              required
              min={minDatetime}
              className={inputCls}
            />
          </Field>
          <Field label="End time" htmlFor="ends_at" hint="Optional">
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              min={minDatetime}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Max attendees */}
        <Field
          label="Max attendees"
          htmlFor="max_attendees"
          hint="Leave blank for unlimited"
        >
          <input
            id="max_attendees"
            name="max_attendees"
            type="number"
            min={1}
            max={10000}
            placeholder="e.g. 30"
            className={`${inputCls} w-40`}
          />
        </Field>

        {/* Join on create */}
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="join_event"
            value="1"
            defaultChecked
            className="h-4 w-4 rounded border-gray-300 accent-brand"
          />
          <span className="text-sm text-gray-700">Join this event as a participant</span>
        </label>

        <div className="flex items-center gap-4 pt-2">
          <SubmitButton />
          <p className="text-xs text-gray-400">
            Your event will be visible to everyone immediately.
          </p>
        </div>
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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
