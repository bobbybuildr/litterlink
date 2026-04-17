"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateEvent } from "./actions";
import type { EditEventState } from "./actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

interface EditEventFormProps {
  eventId: string;
  minDatetime: string;
  defaultValues: {
    title: string;
    description: string;
    postcode: string;
    address_label: string;
    starts_at: string; // "YYYY-MM-DDTHH:MM" in Europe/London
    ends_at: string;   // "YYYY-MM-DDTHH:MM" in Europe/London, or ""
    max_attendees: string;
    organiser_contact_details: string;
  };
}

export function EditEventForm({ eventId, minDatetime, defaultValues }: EditEventFormProps) {
  const boundAction = updateEvent.bind(null, eventId);
  const [state, formAction] = useActionState<EditEventState, FormData>(
    boundAction,
    { error: null }
  );

  const f = state.fields;

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
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
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
          defaultValue={f?.title ?? defaultValues.title}
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
          defaultValue={f?.description ?? defaultValues.description}
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
            defaultValue={f?.postcode ?? defaultValues.postcode}
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
            defaultValue={f?.address_label ?? defaultValues.address_label}
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
            defaultValue={f?.starts_at ?? defaultValues.starts_at}
            className={inputCls}
          />
        </Field>
        <Field label="End time" htmlFor="ends_at" hint="Optional">
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            min={minDatetime}
            defaultValue={f?.ends_at ?? defaultValues.ends_at}
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
          defaultValue={
            f?.organiser_contact_details ??
            defaultValues.organiser_contact_details
          }
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
          defaultValue={f?.max_attendees ?? defaultValues.max_attendees}
          placeholder="e.g. 30"
          className={`${inputCls} w-40`}
        />
      </Field>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <FormSubmitButton
          pendingText="Saving…"
          className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors"
        >
          Save changes
        </FormSubmitButton>
        <p className="text-xs text-gray-400">
          If you change the date or time, confirmed participants will be notified by email.
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
        className="mb-1 block text-sm font-medium text-gray-700"
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
