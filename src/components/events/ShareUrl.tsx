"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function ShareUrl() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 outline-none"
      />
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Copy link"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
