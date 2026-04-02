import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Groups — LitterLink",
  description: "LitterLink Groups — coming soon. Find and join local litter-picking groups across the UK.",
  robots: { index: false, follow: false },
};

export default function GroupsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 px-4 text-center">
      <div className="mb-8">
        <Image
          src="/LitterLink_logo-horizontal.png"
          alt="LitterLink"
          width={358}
          height={83}
          priority
          className="h-10 w-auto sm:h-12"
        />
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <Construction className="h-8 w-8 text-brand" aria-hidden="true" />
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Under Construction
        </h1>
      </div>

      <p className="mt-2 max-w-md text-lg text-gray-600">
        Groups are on their way. Soon you&apos;ll be able to discover and join local
        litter-picking groups.
      </p>

      <Link
        href="/events"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Browse events in the meantime
      </Link>
    </div>
  );
}
