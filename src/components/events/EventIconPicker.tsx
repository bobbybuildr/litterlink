"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { EventIconTile } from "@/components/events/EventIconTile";
import { getEventIcon, getEventIconGroups, isEventIconKey, type EventIconKey } from "@/lib/event-icons";
import { cn } from "@/lib/utils";

interface EventIconPickerProps {
  /** The saved `icon_key`. Anything outside the allowlist is treated as no selection. */
  defaultValue?: string | null;
  className?: string;
}

const ICON_GROUPS = getEventIconGroups();

/**
 * Optional icon chooser shared by the create and edit event forms. Submits the
 * chosen key (or an empty string for none) as `icon_key`; the server action
 * validates it against the allowlist again.
 */
export function EventIconPicker({ defaultValue, className }: EventIconPickerProps) {
  const [selected, setSelected] = useState<EventIconKey | null>(
    isEventIconKey(defaultValue) ? defaultValue : null,
  );
  const [open, setOpen] = useState(false);
  const radioName = useId();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const current = getEventIcon(selected);

  function clearSelection() {
    setSelected(null);
    // The Clear button unmounts once nothing is selected, so keep focus in the control.
    toggleRef.current?.focus();
  }

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-1 block text-sm font-medium text-gray-700">
        Event icon
      </legend>
      <input type="hidden" name="icon_key" value={selected ?? ""} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <EventIconTile iconKey={selected} size="sm" />
        <div className="min-w-0 flex-1 basis-32">
          <p className="truncate text-sm font-medium text-gray-900">
            {selected ? current.label : "Default icon"}
          </p>
          <p className="text-xs text-gray-500">
            Your event icon
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Clear
            </button>
          )}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((isOpen) => !isOpen)}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {open ? "Hide icons" : selected ? "Change icon" : "Choose icon"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div id={panelId} className="mt-3 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          {ICON_GROUPS.map(({ category, label, icons }) => {
            const headingId = `${panelId}-${category}`;
            return (
              <div key={category} role="group" aria-labelledby={headingId}>
                <p id={headingId} className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {icons.map((definition) => (
                    <label key={definition.key} className="relative block cursor-pointer">
                      <input
                        type="radio"
                        name={radioName}
                        value={definition.key}
                        checked={selected === definition.key}
                        onChange={() => setSelected(definition.key)}
                        className="peer sr-only"
                      />
                      <span className="flex h-full flex-col items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-2 text-center text-xs text-gray-600 transition-colors hover:border-gray-300 peer-checked:border-brand peer-checked:bg-brand/5 peer-checked:font-medium peer-checked:text-gray-900 peer-checked:ring-1 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1">
                        <EventIconTile iconKey={definition.key} size="sm" />
                        {definition.label}
                      </span>
                      <Check
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 hidden h-3.5 w-3.5 text-brand peer-checked:block"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
