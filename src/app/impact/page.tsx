import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, Users, Calendar, Clock, BadgeCheck, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getImpactData,
  getPeriodDescription,
  getPeriodOptions,
  isPeriod,
  type Period,
} from "@/lib/impact";
import { ShareImpactButton } from "@/components/ShareImpactButton";
import { ImpactHero } from "./ImpactHero";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "See the collective impact LitterLink volunteers are making across the UK — bags collected, hours completed, and more.",
};

function formatLitterType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildImpactHref(
  periods: {
    orgPeriod: Period;
    areaPeriod: Period;
    statsPeriod: Period;
    groupPeriod: Period;
  },
  anchor: string
) {
  return `/impact?orgPeriod=${periods.orgPeriod}&areaPeriod=${periods.areaPeriod}&statsPeriod=${periods.statsPeriod}&groupPeriod=${periods.groupPeriod}#${anchor}`;
}

export default async function ImpactPage({
  searchParams,
}: {
  searchParams: Promise<{
    orgPeriod?: string;
    areaPeriod?: string;
    statsPeriod?: string;
    groupPeriod?: string;
  }>;
}) {
  const {
    orgPeriod,
    areaPeriod,
    statsPeriod: statsPeriodParam,
    groupPeriod,
  } = await searchParams;
  const organisersPeriod: Period = isPeriod(orgPeriod) ? orgPeriod : "month";
  const areasPeriod: Period = isPeriod(areaPeriod) ? areaPeriod : "month";
  const statsPeriod: Period = isPeriod(statsPeriodParam) ? statsPeriodParam : "month";
  const groupsPeriod: Period = isPeriod(groupPeriod) ? groupPeriod : "month";
  const data = await getImpactData(organisersPeriod, areasPeriod, statsPeriod, groupsPeriod);
  const maxLitterCount = data.sortedLitterTypes[0]?.[1] ?? 1;

  return (
    <div>
      <ImpactHero />

      {/* Core stats */}
      <section className="border-y border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-gray-500">
            Collective effort, measured
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={Trash2}
              value={data.totalBags.toLocaleString()}
              label="Bags collected"
              accent
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Users}
              value={data.totalVolunteers.toLocaleString()}
              label="Volunteer sessions"
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Calendar}
              value={data.eventCount.toLocaleString()}
              label="Events completed"
              bgColor="bg-gray-50"
            />
            <StatCard
              icon={Clock}
              value={data.totalHours.toLocaleString()}
              label="Hours of cleanup"
              bgColor="bg-gray-50"
            />
          </div>
        </div>
      </section>

      {/* Recent activity (selected period) */}
      <section id="recent-activity" className="border-t border-gray-200 bg-gray-50 px-4 pt-14 pb-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-1 text-center text-2xl font-bold text-gray-900">
            Recent activity
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Momentum {getPeriodDescription(statsPeriod)}
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {getPeriodOptions().map((option) => (
              <Link
                key={option.value}
                href={buildImpactHref(
                  { orgPeriod: organisersPeriod, areaPeriod: areasPeriod, statsPeriod: option.value, groupPeriod: groupsPeriod },
                  "recent-activity"
                )}
                scroll={false}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  statsPeriod === option.value
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          <p className="mx-auto mb-8 max-w-xl rounded-xl border border-green-100 bg-green-50 px-5 py-3 text-center text-sm font-medium text-green-800">
            {capitalize(getPeriodDescription(statsPeriod))},{" "}
            <span className="font-bold">{data.recentBags.toLocaleString()} bag{data.recentBags !== 1 ? "s" : ""}</span>{" "}
            {data.recentBags !== 1 ? "were" : "was"} removed across{" "}
            <span className="font-bold">{data.recentEventCount.toLocaleString()} event{data.recentEventCount !== 1 ? "s" : ""}</span>.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Trash2}
              value={data.recentBags.toLocaleString()}
              label="Bags collected"
              accent
              bgColor="bg-white"
            />
            <StatCard
              icon={Calendar}
              value={data.recentEventCount.toLocaleString()}
              label="Events completed"
              bgColor="bg-white"
            />
            <StatCard
              icon={Users}
              value={data.recentUniqueVolunteers.toLocaleString()}
              label="New volunteers"
              bgColor="bg-white"
            />
          </div>
        </div>
      </section>

      {/* Top areas (selected period) */}
      <section id="top-areas" className="px-4 pb-8 pt-1">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Top areas
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Areas leading the way on litter-picking {getPeriodDescription(areasPeriod)}
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {getPeriodOptions().map((option) => (
              <Link
                key={option.value}
                href={buildImpactHref(
                  { orgPeriod: organisersPeriod, areaPeriod: option.value, statsPeriod, groupPeriod: groupsPeriod },
                  "top-areas"
                )}
                scroll={false}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  areasPeriod === option.value
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {data.topAreas.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3 text-right">Bags</th>
                    <th className="px-4 py-3 text-right">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.topAreas.map((area, i) => (
                    <tr key={area.district} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-gray-900">{area.district}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand">
                        {area.totalBags.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {area.eventCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-gray-100 bg-white px-4 py-6 text-center text-sm text-gray-500">
              No areas have completed events {getPeriodDescription(areasPeriod)} yet.
            </p>
          )}
        </div>
      </section>

      {/* Top organisers (selected period) */}
      <section id="top-organisers" className="px-4 pt-1 pb-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Top organisers
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Most active event hosts {getPeriodDescription(organisersPeriod)}
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {getPeriodOptions().map((option) => (
              <Link
                key={option.value}
                href={buildImpactHref(
                  { orgPeriod: option.value, areaPeriod: areasPeriod, statsPeriod, groupPeriod: groupsPeriod },
                  "top-organisers"
                )}
                scroll={false}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  organisersPeriod === option.value
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {data.topOrganisers.length > 0 ? (
            <ul className="space-y-3">
              {data.topOrganisers.map((org, i) => (
                <li
                  key={org.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {org.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.avatar_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                      {(org.display_name ?? "?")[0].toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/profile/${org.username ?? org.id}`}
                        className="truncate font-semibold text-brand hover:underline"
                      >
                        {org.display_name}
                      </Link>
                      {org.is_verified_organiser && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified organiser" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {org.totalBags.toLocaleString()} bags &middot;{" "}
                      {org.totalAttendees.toLocaleString()} volunteers
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-brand">{org.eventCount}</p>
                    <p className="text-xs text-gray-400">
                      {org.eventCount === 1 ? "event" : "events"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-gray-100 bg-white px-4 py-6 text-center text-sm text-gray-500">
              No organisers have completed events {getPeriodDescription(organisersPeriod)} yet.
            </p>
          )}
        </div>
      </section>

      {/* Most active groups (selected period) */}
      <section id="top-groups" className="px-4 pt-1 pb-14">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
            Most active groups
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500">
            Groups running the most events {getPeriodDescription(groupsPeriod)}
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {getPeriodOptions().map((option) => (
              <Link
                key={option.value}
                href={buildImpactHref(
                  { orgPeriod: organisersPeriod, areaPeriod: areasPeriod, statsPeriod, groupPeriod: option.value },
                  "top-groups"
                )}
                scroll={false}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                  groupsPeriod === option.value
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {data.topGroups.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3 text-right">Events</th>
                    <th className="px-4 py-3 text-right">Bags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.topGroups.map((group, i) => (
                    <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          <Link
                            href={`/groups/${group.slug}`}
                            className="font-semibold text-gray-900 hover:text-brand transition-colors"
                          >
                            {group.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand">
                        {group.eventCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {group.totalBags.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-gray-100 bg-white px-4 py-6 text-center text-sm text-gray-500">
              No groups have completed events {getPeriodDescription(groupsPeriod)} yet.
            </p>
          )}
        </div>
      </section>

      {/* Community stats */}
      <section className="border-t border-gray-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            A growing community
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CommunityCard
              icon={Building2}
              value={data.groupCount.toLocaleString()}
              label="Active groups"
              description="Community, school, charity and council groups organising cleanups across the UK."
            />
            <CommunityCard
              icon={BadgeCheck}
              value={data.verifiedOrgCount.toLocaleString()}
              label="Verified organisers"
              description="Trusted organisers approved to run events on LitterLink."
            />
          </div>
        </div>
      </section>
      
      {/* Litter types */}
      {data.sortedLitterTypes.length > 0 && (
        <section className="px-4 py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
              What we&apos;re finding
            </h2>
            <p className="mb-8 text-center text-sm text-gray-500">
              Types of litter recorded across completed events
            </p>
            <ul className="space-y-4">
              {data.sortedLitterTypes.map(([type, count]) => (
                <li key={type}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {formatLitterType(type)}
                    </span>
                    <span className="text-gray-400">
                      {count} {count === 1 ? "event" : "events"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-brand transition-all"
                      style={{
                        width: `${(count / maxLitterCount) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}


      {/* CTA */}
      <section className="bg-brand px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold">Add your effort to the total</h2>
          <p className="mt-2 text-green-100">
            Every action counts. Here&apos;s how you can get involved.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/events"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand shadow transition-colors hover:bg-green-50"
            >
              Join an upcoming cleanup
            </Link>
            <Link
              href="/events/create"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Start your own litter pick
            </Link>
            <Link
              href="/become-a-verified-organiser"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Become a verified organiser
            </Link>
            <ShareImpactButton />
          </div>
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  accent?: boolean;
  bgColor: string;
}

function StatCard({ icon: Icon, value, label, accent, bgColor }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-gray-100 p-6 text-center", bgColor)}>
      <Icon
        className={cn("mx-auto mb-3 h-6 w-6", accent ? "text-brand" : "text-gray-400")}
      />
      <p
        className={cn(
          "text-3xl font-extrabold",
          accent ? "text-brand" : "text-gray-900"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

interface CommunityCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  description: string;
}

function CommunityCard({ icon: Icon, value, label, description }: CommunityCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
      <div className="mb-3 flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-brand" />
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      </div>
      <p className="mb-1 font-semibold text-gray-800">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
