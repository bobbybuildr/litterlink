"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEvent } from "./actions";
import type { CreateEventState } from "./actions";
import { SubmitButton } from "./SubmitButton";
import type { GroupRow } from "@/lib/events";

interface CreateEventFormProps {
  isVerifiedOrganiser: boolean;
  groups: Pick<GroupRow, "id" | "name" | "slug">[];
  minDatetime: string;
  initialFields?: Record<string, string>;
}

export function CreateEventForm({
  isVerifiedOrganiser,
  groups,
  minDatetime,
  initialFields,
}: CreateEventFormProps) {
  const [state, formAction] = useActionState<CreateEventState, FormData>(
    createEvent,
    { error: null },
  );

  const f = state.fields ?? initialFields;

  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          ref={errorRef}
          className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* Organising as */}
      {isVerifiedOrganiser ? (
        groups.length > 0 && (
          <Field label="Organising as" htmlFor="group_id">
            <select
              id="group_id"
              name="group_id"
              defaultValue={f?.group_id ?? ""}
              className={inputCls}
            >
              <option value="">Myself</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        )
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">
            Organising frequent events? Why not become a verified organiser.
          </p>
          <p className="mt-1 text-blue-700">
            Verified organisers get a trust badge on all their events, they can
            create groups, build a public profile, and run events under their
            group&apos;s name.{" "}
            <a
              href="/become-a-verified-organiser"
              className="block font-medium underline underline-offset-2 hover:text-blue-900"
            >
              Apply to become a verified organiser &rarr;
            </a>
          </p>
        </div>
      )}

      {/* Title */}
      <Field label="Event title *" htmlFor="title">
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={f?.title ?? ""}
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
          maxLength={2000}
          defaultValue={f?.description ?? ""}
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
            defaultValue={f?.postcode ?? ""}
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
            maxLength={200}
            defaultValue={f?.address_label ?? ""}
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
            defaultValue={f?.starts_at ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="End time" htmlFor="ends_at" hint="Optional">
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            min={minDatetime}
            defaultValue={f?.ends_at ?? ""}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Organiser contact details */}
      <Field
        label="Organiser contact details"
        htmlFor="organiser_contact_details"
        hint="Optional — visible to all"
      >
        <textarea
          id="organiser_contact_details"
          name="organiser_contact_details"
          rows={2}
          maxLength={500}
          defaultValue={f?.organiser_contact_details ?? ""}
          placeholder="e.g. Email: hello@example.com, or DM: facebook.com/username"
          className={inputCls}
        />
      </Field>

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
          defaultValue={f?.max_attendees ?? ""}
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
          defaultChecked={state.fields ? state.fields.join_event === "1" : true}
          className="h-4 w-4 rounded border-gray-300 accent-brand"
        />
        <span className="text-sm text-gray-700">
          Join this event as a participant
        </span>
      </label>

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
        <SubmitButton />
        <p className="text-xs text-gray-400">
          Your event will be visible to everyone immediately.
        </p>
      </div>
    </form>
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
