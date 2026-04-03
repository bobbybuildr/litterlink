import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How LitterLink collects, uses, shares, and protects personal data.",
};

const lastUpdated = "2026-04-03";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-brand/15 bg-brand/5 p-8 shadow-sm">
        <p className="text-sm font-medium text-brand">
          Last updated <time dateTime={lastUpdated}>3 April 2026</time>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 sm:text-base">
          This policy explains how LitterLink collects, uses, stores, and
          shares personal data when you browse the site, create an account,
          join or organise events, create groups, upload media, or apply to
          become a Verified Organiser. It is drafted for UK GDPR and EU GDPR
          compliance and should be read alongside our <Link href="/terms" className="font-medium text-brand hover:underline">Terms and Conditions</Link>.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Controller"
          body="LitterLink is the controller of the personal data described in this policy."
        />
        <SummaryCard
          title="Contact"
          body={<a href="mailto:hello@litterlink.co.uk" className="font-medium text-brand hover:underline">hello@litterlink.co.uk</a>}
        />
        <SummaryCard
          title="Main providers"
          body="Supabase, Vercel, Resend, postcodes.io, and Google OAuth when you choose Google sign-in."
        />
      </div>

      <div className="mt-8 space-y-6">
        <PolicySection title="1. Who this policy applies to">
          <p>
            This policy applies to personal data processed through the
            LitterLink website and related services, including public event
            discovery, user accounts, profiles, dashboards, groups, organiser
            applications, uploaded media, and service communications.
          </p>
          <p>
            In this policy, &quot;personal data&quot; means information that identifies
            you or can reasonably be linked to you.
          </p>
        </PolicySection>

        <PolicySection title="2. The personal data we collect">
          <PolicyList>
            <li>
              <strong>Account and authentication data:</strong> your email
              address, password submitted at sign-up or sign-in, and, if you
              use Google sign-in, profile information made available by Google
              such as your name, email address, and avatar.
            </li>
            <li>
              <strong>Profile data:</strong> display name, optional home
              postcode, avatar image, organiser status, admin status, and
              account creation date.
            </li>
            <li>
              <strong>Event data:</strong> titles, descriptions, event postcodes,
              latitude and longitude derived from those postcodes, address
              labels, event times, attendee limits, organiser contact details,
              event status, attendance records, and post-event impact data.
            </li>
            <li>
              <strong>Participation data:</strong> which events you joined and
              when you joined them.
            </li>
            <li>
              <strong>Group data:</strong> group names, descriptions, logos,
              website links, social links, contact email addresses, type of
              organisation, and group creator details.
            </li>
            <li>
              <strong>Organiser application data:</strong> your motivation,
              experience, organisation name, social links, application status,
              and review timestamps.
            </li>
            <li>
              <strong>Media:</strong> avatars, group logos, and event photos you
              upload.
            </li>
            <li>
              <strong>Communication and preference data:</strong> your email
              preferences and any email correspondence connected to organiser
              applications or support requests.
            </li>
            <li>
              <strong>Technical and usage data:</strong> session and security
              data needed to keep you signed in, plus limited usage and
              performance data processed through our hosting and analytics
              providers.
            </li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="3. How we collect personal data">
          <PolicyList>
            <li>Directly from you when you create an account, edit your profile, join an event, create an event or group, upload media, or submit an organiser application.</li>
            <li>From Google if you choose Google OAuth sign-in.</li>
            <li>From postcodes.io when you enter a UK postcode for event search, event creation, or optional profile location features.</li>
            <li>Automatically from our infrastructure providers when you use the site, for example to maintain secure sessions and understand site performance.</li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="4. How we use personal data and our legal bases">
          <div className="space-y-4">
            <LegalBasisCard
              basis="Performance of a contract"
              uses="to create and manage your account, authenticate you, show your dashboard, let you create and join events, create groups, display event details, store your preferences, and operate the core platform features you request."
            />
            <LegalBasisCard
              basis="Legitimate interests"
              uses="to keep the service secure, prevent misuse, moderate and administer the platform, review organiser applications, maintain community records, improve product reliability, and understand aggregate usage and performance."
            />
            <LegalBasisCard
              basis="Consent"
              uses="to process optional marketing and newsletter preferences, use your optional home postcode for nearby-event features, and process any optional information you choose to publish in profiles, events, groups, or application forms. You can withdraw consent at any time."
            />
            <LegalBasisCard
              basis="Legal obligation"
              uses="where we must keep records, respond to lawful requests, or comply with applicable law and regulatory obligations."
            />
          </div>
        </PolicySection>

        <PolicySection title="5. What information is public on LitterLink">
          <p>
            LitterLink is a community platform, so some information is intended
            to be visible to other users and visitors. Please only publish
            information you are comfortable sharing.
          </p>
          <PolicyList>
            <li>If you organise an event, your display name, organiser status, event details, organiser contact details, event statistics, and any event photos may be visible on public event pages.</li>
            <li>If you join an event, your display name and joined date may be shown on the event page to other visitors.</li>
            <li>If you create a group, the group name, description, logo, website, social links, contact email address, and associated events may be public.</li>
            <li>Avatars, group logos, and event photos may be served from public URLs so they can be displayed on the site.</li>
          </PolicyList>
          <p>
            Please do not include sensitive personal data or personal data about
            other people in event descriptions, contact details, group pages,
            photos, or free-text fields unless you have a valid legal basis and
            any necessary permission to do so.
          </p>
        </PolicySection>

        <PolicySection title="6. Providers and recipients we share data with">
          <PolicyList>
            <li><strong>Supabase:</strong> authentication, database, and file storage provider.</li>
            <li><strong>Vercel:</strong> hosting provider, plus Vercel Analytics and Speed Insights for product and performance monitoring.</li>
            <li><strong>Resend:</strong> transactional email provider used for organiser-application related emails and similar service communications.</li>
            <li><strong>postcodes.io:</strong> postcode geocoding provider used server-side when you search by postcode or create an event.</li>
            <li><strong>Google:</strong> if you choose Google sign-in, Google processes your data as part of the sign-in flow under its own terms and privacy information.</li>
            <li><strong>Professional advisers, regulators, and authorities:</strong> where reasonably necessary to protect rights, investigate misuse, or comply with law.</li>
          </PolicyList>
          <p>
            Where these providers act on our behalf, we expect them to process
            personal data under appropriate contractual and security controls.
          </p>
        </PolicySection>

        <PolicySection title="7. International transfers">
          <p>
            Some of our providers may process personal data outside the UK or
            EEA. Where that happens, we aim to use appropriate safeguards such
            as adequacy regulations, standard contractual clauses, or equivalent
            lawful transfer mechanisms made available by the relevant provider.
          </p>
        </PolicySection>

        <PolicySection title="8. Retention">
          <p>
            We keep personal data only for as long as necessary for the
            purposes described in this policy, including to provide the service,
            keep appropriate business records, resolve disputes, enforce terms,
            and protect the platform.
          </p>
          <PolicyList>
            <li><strong>Account, profile, participation, and preference data:</strong> retained while your account is active. When you delete your account, these records — including your email address, display name, postcode, avatar, email preferences, RSVP records, and organiser application — are permanently removed.</li>
            <li><strong>Event and group content:</strong> events, groups, and post-event impact statistics are preserved after account deletion for community record-keeping. Your personal link to them is severed — the organiser or creator field is cleared and any organiser contact details are removed — so the retained data is no longer associated with you.</li>
            <li><strong>Media files:</strong> your avatar and any event photos you uploaded are deleted from storage when you delete your account. Group logos are retained with the group record.</li>
            <li><strong>Organiser application data:</strong> deleted as part of account deletion, as it is linked to your profile.</li>
            <li><strong>Technical and analytics data:</strong> according to our providers' retention settings and only for as long as reasonably necessary for security and service improvement.</li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="9. Security">
          <p>
            We use technical and organisational measures designed to protect
            personal data, including access controls, authentication tooling,
            and managed infrastructure providers. No system is completely
            secure, however, and we cannot guarantee absolute security.
          </p>
        </PolicySection>

        <PolicySection title="10. Your GDPR rights">
          <p>
            Depending on your location and the circumstances, you may have the
            right to:
          </p>
          <PolicyList>
            <li>request access to the personal data we hold about you;</li>
            <li>ask us to correct inaccurate or incomplete personal data;</li>
            <li>ask us to delete your personal data — you can do this immediately and without contacting us by using the <Link href="/profile" className="font-medium text-brand hover:underline">Delete account</Link> option on your profile page;</li>
            <li>ask us to restrict how we use your personal data;</li>
            <li>object to processing based on legitimate interests;</li>
            <li>receive a copy of certain personal data in a portable format;</li>
            <li>withdraw consent where processing relies on consent — marketing email preferences can be updated at any time on your <Link href="/profile" className="font-medium text-brand hover:underline">profile page</Link>; and</li>
            <li>complain to the UK Information Commissioner's Office or your local data protection authority.</li>
          </PolicyList>
          <p>
            For any other rights requests, email <a href="mailto:hello@litterlink.co.uk" className="font-medium text-brand hover:underline">hello@litterlink.co.uk</a>. We may
            need to verify your identity before acting on a request.
          </p>
        </PolicySection>

        <PolicySection title="11. Cookies, analytics, and postcode lookups">
          <PolicyList>
            <li><strong>Essential session technology:</strong> we use cookies or similar session mechanisms to keep you signed in and protect account access.</li>
            <li><strong>Analytics and performance:</strong> we use Vercel Analytics and Speed Insights to understand how the site is used and how it performs.</li>
            <li><strong>Postcode lookup:</strong> we do not currently use live browser geolocation. Instead, when you enter a UK postcode for search or event creation, that postcode is sent server-side to postcodes.io to obtain latitude and longitude.</li>
            <li><strong>Optional home postcode:</strong> if you add a postcode to your profile, we may use it to centre event discovery and support nearby-event features.</li>
          </PolicyList>
        </PolicySection>

        <PolicySection title="12. Automated decision-making">
          <p>
            We do not use solely automated decision-making or profiling that
            produces legal or similarly significant effects about you.
            Organiser approvals and rejections are reviewed by people.
          </p>
        </PolicySection>

        <PolicySection title="13. Changes to this policy">
          <p>
            We may update this policy from time to time to reflect changes to
            the service, the law, or our providers. When we make material
            changes, we will update the &quot;Last updated&quot; date on this page and,
            where appropriate, take additional steps to notify users.
          </p>
        </PolicySection>

        <PolicySection title="14. Contact us">
          <p>
            If you have questions about this policy or want to exercise your
            privacy rights, contact LitterLink at <a href="mailto:hello@litterlink.co.uk" className="font-medium text-brand hover:underline">hello@litterlink.co.uk</a>.
          </p>
        </PolicySection>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-6 text-gray-700">{body}</div>
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-gray-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-3 pl-5">{children}</ul>;
}

function LegalBasisCard({
  basis,
  uses,
}: {
  basis: string;
  uses: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{basis}</h3>
      <p className="mt-2 text-sm leading-7 text-gray-700">We rely on this legal basis {uses}</p>
    </div>
  );
}
