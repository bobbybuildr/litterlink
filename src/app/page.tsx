import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Trash, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LucideIcon, ArrowRight } from "lucide-react";
import { PostcodeSearch } from "@/components/PostcodeSearch";

async function getImpactStats() {
  const supabase = await createClient();

  const [{ count: eventCount }, { data: statsData }] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase.from("event_stats").select("bags_collected, actual_attendees"),
  ]);

  const totalBags = statsData?.reduce((sum, s) => sum + (s.bags_collected ?? 0), 0) ?? 0;
  const volunteerCount = statsData?.reduce((sum, s) => sum + (s.actual_attendees ?? 0), 0) ?? 0;

  return { eventCount: eventCount ?? 0, totalBags, volunteerCount };
}

interface Props {
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { error_code, error_description } = await searchParams;

  if (error_code === "otp_expired") {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Your password reset link has expired. Please request a new one.")
    );
  }

  if (error_code) {
    const description = error_description
      ? decodeURIComponent(error_description)
      : "Something went wrong. Please try again.";
    redirect("/sign-in?error=" + encodeURIComponent(description));
  }

  const stats = await getImpactStats();

  return (
    <div>
      {/* Hero */}
      <section className="bg-linear-to-br from-green-50 to-emerald-100 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            <span className="text-accent">Find local litter picks.</span>{" "}
            <span className="text-brand">Make a real difference.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            LitterLink makes it easy to discover litter-picking events near you, connect with local volunteers, and track the impact you’re making across the UK.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4">
            <PostcodeSearch />
            <p className="text-base font-medium text-gray-500">
              Running a cleanup?&nbsp;
              <Link
                href="/events/create"
                className="underline-offset-2 hover:text-gray-700 underline transition-colors"
              >
                Create an event
              </Link>
            </p>
          </div>
          <p className="mx-auto text-base mt-10 tracking-tight max-w-xl text-gray-600">
            Used by community groups, schools and volunteers across the UK.
          </p>
        </div>
      </section>

      {/* Impact stats */}
      <section className="border-y border-gray-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Real impact. Measured.
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard value={stats.eventCount} label="Events completed" Icon={Calendar} />
            <StatCard value={stats.totalBags.toLocaleString()} label="Bags of litter collected" Icon={Trash} />
            <StatCard value={stats.volunteerCount.toLocaleString()} label="Volunteers involved" Icon={Users} />
          </div>
          <h2 className="mb-2 mt-8 text-center text-sm font-normal text-gray-500">
            Every bag collected helps create cleaner streets, parks and beaches across the UK.
          </h2>
          <div className="mt-4 text-center">
            <Link
              href="/impact"
              className="text-sm font-medium text-brand underline underline-offset-2 hover:text-green-700 transition-colors"
            >
              See our full impact <ArrowRight className="inline w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-16 pb-1">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            Getting involved is simple
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              number="1"
              title="📍 Find an event"
              description="Browse upcoming litter picks by postcode, date or map view."
            />
            <Step
              number="2"
              title="🤝 Join up"
              description="RSVP in one click and get all the details instantly."
            />
            <Step
              number="3"
              title="📊 Track your impact"
              description="Show up, help clean up, and see your contribution added to the collective total."
            />
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="px-4 pb-16 pt-8 text-center">
        <Link
          href="/events"
          className="inline-block rounded-xl border border-brand px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-green-50"
        >
          Browse upcoming events
        </Link>
      </section>

      {/* CTA */}
      <section className="bg-brand px-4 py-14 text-center text-white">
        <h2 className="text-2xl font-bold">Ready to help make your community cleaner?</h2>
        <p className="mt-2 text-green-100">
          Join volunteers across the UK who are turning small actions into real change.
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
  Icon
}: {
  value: string | number;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
      <p className="text-3xl font-extrabold text-brand">{value}</p>
      <p className="mt-1 flex items-center justify-center gap-1 text-sm text-gray-500">
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </p>
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
