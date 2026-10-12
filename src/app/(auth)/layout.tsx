import type { Metadata } from "next";
import { NOINDEX_FOLLOW } from "@/lib/seo";

// Auth pages echo ?error= / ?message= text, so they must never be indexed.
export const metadata: Metadata = { robots: NOINDEX_FOLLOW };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
