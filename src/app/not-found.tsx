import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 mb-6">
        <MapPin className="h-8 w-8 text-brand" />
      </div>

      <p className="text-6xl font-extrabold text-brand">404</p>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        This page is off the map
      </h1>

      <p className="mt-3 max-w-md text-base text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          Go home
        </Link>
        <Link
          href="/events"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          Browse events
        </Link>
      </div>
    </div>
  );
}
