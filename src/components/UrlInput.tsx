"use client";

import { useRef } from "react";

interface UrlInputProps {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

/** Normalises a URL on blur by prepending https:// if no protocol is present. */
export function UrlInput({
  id,
  name,
  defaultValue,
  placeholder,
  maxLength,
  className,
}: UrlInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  function handleBlur() {
    const input = ref.current;
    if (!input) return;
    const val = input.value.trim();
    if (val && !/^https?:\/\//i.test(val)) {
      input.value = `https://${val}`;
    }
  }

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type="url"
      defaultValue={defaultValue}
      placeholder={placeholder}
      maxLength={maxLength}
      onBlur={handleBlur}
      className={className}
    />
  );
}
