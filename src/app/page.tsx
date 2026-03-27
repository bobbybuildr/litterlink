import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function getImpactStats() {
  const supabase = await createClient();

  const [{ count: eventCount }, { data: statsData }] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase.from("event_stats").select("bags_collected, weight_kg"),
  ]);

  const totalBags = statsData?.reduce((sum, s) => sum + (s.bags_collected ?? 0), 0) ?? 0;
  const totalKg = statsData?.reduce((sum, s) => sum + (s.weight_kg ?? 0), 0) ?? 0;

  return { eventCount: eventCount ?? 0, totalBags, totalKg };
}

export default async function HomePage() {
  const stats = await getImpactStats();

  return (
    <div>
      {/* Hero */}
      <section className="bg-linear-to-br from-green-50 to-emerald-100 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            <span className="text-accent">Pick up litter.</span>{" "}
            <span className="text-brand">Make a difference.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            LitterLink connects you with local litter-picking events across the
            UK. Join a pick, track your impact, or organise your own.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/events"
              className="rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors"
            >
              Find events near you
            </Link>
            <Link
              href="/events/create"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Organise a litter pick
            </Link>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section className="border-y border-gray-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-400">
            Community impact so far
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard value={stats.eventCount} label="Events completed" />
            <StatCard value={stats.totalBags.toLocaleString()} label="Bags of litter collected" />
            <StatCard
              value={`${stats.totalKg.toLocaleString()} kg`}
              label="Litter removed"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              number="1"
              title="Find an event"
              description="Browse upcoming litter picks on the map or by postcode. Filter by date and distance."
            />
            <Step
              number="2"
              title="Join up"
              description="RSVP in one click. Get the meeting point details and show up ready to help."
            />
            <Step
              number="3"
              title="Track your impact"
              description="Organisers log bags collected, weight, and photos after each pick. Your contribution adds to the total."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand px-4 py-14 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to make your community cleaner?</h2>
        <p className="mt-2 text-green-100">
          Join hundreds of volunteers across the UK.
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand shadow hover:bg-green-50 transition-colors"
        >
          Get started — it&apos;s free
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
      <p className="text-3xl font-extrabold text-brand">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-bold text-lg mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
