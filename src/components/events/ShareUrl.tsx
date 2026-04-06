"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface ShareUrlProps {
  title?: string;
}

export function ShareUrl({ title }: ShareUrlProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function handleShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User dismissed or share failed — no action needed
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  if (canShare) {
    return (
      <div className="flex flex-col gap-2">
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
        <button
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share this event
        </button>
      </div>
    );
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
