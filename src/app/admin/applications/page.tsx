import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ApproveButton, RejectButton } from "./ActionButtons";
import type { OrganiserApplicationRow } from "@/lib/events";

export const metadata: Metadata = { title: "Organiser Applications — Admin" };

type ApplicationWithProfile = OrganiserApplicationRow & {
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const statusBadge: Record<
  OrganiserApplicationRow["status"],
  { label: string; cls: string }
> = {
  pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", cls: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800" },
};

export default async function AdminApplicationsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organiser_applications")
    .select("*, profiles(display_name, avatar_url)")
    .order("created_at", { ascending: false });

  const applications = (data ?? []) as ApplicationWithProfile[];

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Organiser Applications
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {pending.length} pending · {reviewed.length} reviewed
        </p>
      </div>

      {pending.length === 0 && reviewed.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pending review
          </h2>
          <div className="space-y-4">
            {pending.map((app) => (
              <ApplicationCard key={app.id} app={app} showActions />
            ))}
          </div>
        </section>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Reviewed
          </h2>
          <div className="space-y-4">
            {reviewed.map((app) => (
              <ApplicationCard key={app.id} app={app} showActions={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  showActions,
}: {
  app: ApplicationWithProfile;
  showActions: boolean;
}) {
  const badge = statusBadge[app.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">
            {app.profiles?.display_name ?? "(no display name)"}
          </p>
          <p className="text-xs text-gray-400">
            User ID: {app.user_id} · Applied:{" "}
            {new Date(app.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Fields */}
      <dl className="space-y-3 text-sm">
        <Field label="Motivation" value={app.motivation} />
        {app.experience && (
          <Field label="Experience" value={app.experience} />
        )}
        {app.organisation_name && (
          <Field label="Organisation" value={app.organisation_name} />
        )}
        {app.social_links && (
          <Field label="Social links" value={app.social_links} />
        )}
      </dl>

      {/* Actions */}
      {showActions && (
        <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-4">
          <ApproveButton applicationId={app.id} />
          <RejectButton applicationId={app.id} />
        </div>
      )}

      {/* Reviewed metadata */}
      {app.reviewed_at && (
        <p className="mt-3 text-xs text-gray-400">
          Reviewed{" "}
          {new Date(app.reviewed_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-gray-800">{value}</dd>
    </div>
  );
}
