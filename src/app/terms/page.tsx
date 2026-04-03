import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — LitterLink",
  description: "Terms governing access to and use of the LitterLink platform.",
};

const lastUpdated = "2026-04-03";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-brand/15 bg-brand/5 p-8 shadow-sm">
        <p className="text-sm font-medium text-brand">
          Last updated <time dateTime={lastUpdated}>3 April 2026</time>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 sm:text-base">
          These Terms and Conditions govern your access to and use of the
          LitterLink website and related services, including browsing events,
          creating an account, joining or organising events, creating groups,
          uploading content, and applying to become a Verified Organiser.
          Please read them alongside our {" "}
          <Link href="/privacy" className="font-medium text-brand hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Platform role"
          body="LitterLink provides the platform. Organisers and group creators remain responsible for the information, decisions, and real-world activities they publish."
        />
        <SummaryCard
          title="Public content"
          body="Some profile, event, participation, group, and media information may be visible to other users or the public, depending on how the service is used."
        />
        <SummaryCard
          title="Contact"
          body={
            <a href="mailto:hello@litterlink.co.uk" className="font-medium text-brand hover:underline">
              hello@litterlink.co.uk
            </a>
          }
        />
      </div>

      <div className="mt-8 space-y-6">
        <TermsSection title="1. About these terms">
          <p>
            These terms apply to all visitors and users of LitterLink,
            including account holders, event organisers, event participants,
            group creators, and applicants for Verified Organiser status.
          </p>
          <p>
            By accessing or using LitterLink, you agree to these terms. If you
            do not agree, do not use the service.
          </p>
          <p>
            If you use LitterLink on behalf of an organisation, group, school,
            charity, or business, you confirm that you have authority to bind
            that organisation to these terms.
          </p>
        </TermsSection>

        <TermsSection title="2. Eligibility and your account">
          <TermsList>
            <li>
              You must be legally capable of agreeing to these terms. If you
              are under 18, a parent or guardian should review these terms with
              you and supervise your participation where appropriate.
            </li>
            <li>
              You must provide accurate information when creating an account,
              profile, event, group, or organiser application.
            </li>
            <li>
              You are responsible for keeping your login credentials
              confidential and for activity that takes place through your
              account.
            </li>
            <li>
              You must promptly update information that becomes inaccurate or
              misleading.
            </li>
          </TermsList>
        </TermsSection>

        <TermsSection title="3. What LitterLink provides">
          <p>
            LitterLink is a community platform for discovering, joining, and
            organising litter-picking events and related groups. Unless we
            explicitly say otherwise, LitterLink does not organise, supervise,
            insure, staff, or control the events listed on the platform.
          </p>
          <p>
            We currently provide the core service free of charge. If we add
            paid features later, we may introduce separate pricing,
            subscription, or purchase terms.
          </p>
          <p>
            We may add, change, suspend, or remove features at any time where
            reasonably necessary for product development, security, legal
            compliance, or operational reasons.
          </p>
        </TermsSection>

        <TermsSection title="4. Rules for using LitterLink">
          <p>You agree not to:</p>
          <TermsList>
            <li>break the law or encourage unlawful behaviour;</li>
            <li>impersonate another person or misrepresent your identity, authority, or affiliations;</li>
            <li>post false, misleading, defamatory, abusive, discriminatory, or infringing content;</li>
            <li>upload malware, interfere with the platform, or attempt unauthorised access to accounts, systems, or data;</li>
            <li>scrape, harvest, or extract data from LitterLink at scale without our written permission;</li>
            <li>publish sensitive personal data or personal data about other people without a valid reason and any required permission;</li>
            <li>use LitterLink to advertise unrelated services, spam users, or run scams; or</li>
            <li>use the platform as an emergency reporting service for dangerous waste, injuries, or urgent incidents.</li>
          </TermsList>
        </TermsSection>

        <TermsSection title="5. Extra responsibilities for organisers and group creators">
          <p>
            If you create or manage an event or group, you are responsible for
            the information and activities you publish and for your compliance
            with applicable law.
          </p>
          <TermsList>
            <li>Event and group details must be accurate, current, and not misleading.</li>
            <li>You are responsible for any permissions, notices, landowner consent, safeguarding steps, insurance, or risk controls that your event requires by law or that a prudent organiser would arrange.</li>
            <li>You must communicate material changes, postponements, or cancellations promptly.</li>
            <li>You must not describe yourself as verified, qualified, insured, or endorsed unless that is true and can be supported.</li>
            <li>You are responsible for the way you collect litter, handle equipment, manage volunteers, and dispose of waste during the event.</li>
          </TermsList>
        </TermsSection>

        <TermsSection title="6. Joining and attending events">
          <p>
            When you join or attend an event, you do so at your own discretion.
            Real-world community activities can involve hazards including
            weather, traffic, water, sharp objects, uneven ground, and other
            risks that are outside our control.
          </p>
          <TermsList>
            <li>You are responsible for deciding whether an event is suitable for you.</li>
            <li>You should wear appropriate clothing and use suitable equipment unless the organiser clearly states that equipment will be provided.</li>
            <li>You must follow lawful safety instructions from organisers, venue operators, landowners, and public authorities.</li>
            <li>Event details may change, and events may be cancelled, postponed, capped, or removed without notice.</li>
            <li>LitterLink does not guarantee attendance levels, safety outcomes, travel arrangements, weather conditions, or the accuracy of user-supplied event information.</li>
          </TermsList>
        </TermsSection>

        <TermsSection title="7. Content, uploads, and media">
          <p>
            You retain ownership of content you submit to LitterLink, including
            event descriptions, group information, photos, logos, avatars, and
            other media. However, you give us a non-exclusive, worldwide,
            royalty-free licence to host, store, reproduce, format, adapt,
            display, and distribute that content as needed to operate, secure,
            improve, and promote the service.
          </p>
          <TermsList>
            <li>You confirm that you own the content you upload or have the rights and permissions needed to share it.</li>
            <li>You are responsible for obtaining consent from identifiable people shown in photos or videos where required by law.</li>
            <li>We may remove or restrict content that appears to breach these terms, the law, or the rights of others.</li>
            <li>Please do not upload content containing confidential, sensitive, or unnecessary personal data.</li>
          </TermsList>
        </TermsSection>

        <TermsSection title="8. Verified Organiser status">
          <p>
            LitterLink may offer a Verified Organiser badge or similar status to
            organisers whose applications we review. That status only means we
            reviewed certain information at a point in time.
          </p>
          <p>
            Verified Organiser status is not a guarantee of identity,
            trustworthiness, experience, safety, legality, quality, insurance,
            or suitability. We may refuse, suspend, remove, or change verified
            status at our discretion.
          </p>
        </TermsSection>

        <TermsSection title="9. Privacy and public information">
          <p>
            Our {" "}
            <Link href="/privacy" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>{" "}
            explains how we collect, use, store, and share personal data.
          </p>
          <p>
            Because LitterLink is a community platform, some information is
            intended to be public or visible to other users. This can include
            organiser display names, event details, joined-participant names
            and dates, group information, and uploaded media.
          </p>
          <p>
            If you delete your account or stop using the service, some event,
            group, or impact records may be retained for community
            record-keeping, but we will handle personal data in line with our
            Privacy Policy.
          </p>
        </TermsSection>

        <TermsSection title="10. Intellectual property and platform rights">
          <p>
            The LitterLink service, including our branding, software, design,
            databases, and original site content, is owned by LitterLink or our
            licensors and is protected by intellectual property laws.
          </p>
          <TermsList>
            <li>You may use LitterLink only for its intended purpose and in accordance with these terms.</li>
            <li>You must not copy, reverse engineer, decompile, republish, sell, or create derivative works from the platform except where the law clearly allows it.</li>
            <li>These terms do not transfer any ownership rights in LitterLink to you.</li>
          </TermsList>
        </TermsSection>

        <TermsSection title="11. Third-party services and links">
          <p>
            LitterLink relies on third-party providers and may include links to
            third-party services. For example, authentication, hosting, email,
            postcode geocoding, maps, and external organiser links may involve
            third parties.
          </p>
          <p>
            Third-party services are governed by their own terms and privacy
            notices. We are not responsible for third-party content,
            availability, policies, or acts and omissions outside our
            reasonable control.
          </p>
        </TermsSection>

        <TermsSection title="12. Suspension, removal, and termination">
          <p>
            We may suspend or terminate your access, remove content, or limit
            features where reasonably necessary, including if:
          </p>
          <TermsList>
            <li>you breach these terms;</li>
            <li>your use creates legal, security, safety, or reputational risk;</li>
            <li>we receive a credible complaint about your content or conduct; or</li>
            <li>we are required to act by law, regulation, court order, or a competent authority.</li>
          </TermsList>
          <p>
            You may stop using LitterLink at any time. Termination will not
            affect rights or obligations that accrued before termination, or
            any provisions that are intended to continue after it.
          </p>
        </TermsSection>

        <TermsSection title="13. Availability, disclaimers, and liability">
          <p>
            LitterLink is provided on an "as is" and "as available" basis. We
            do not promise that the service will always be uninterrupted,
            secure, error-free, or suitable for every purpose.
          </p>
          <p>
            We do not guarantee the accuracy, completeness, legality, quality,
            or safety of user-generated content, events, groups, organiser
            claims, participant behaviour, or third-party links. You are
            responsible for your own decisions about whether to rely on
            information you see on the platform.
          </p>
          <p>
            Nothing in these terms excludes or limits liability for death or
            personal injury caused by negligence, fraud or fraudulent
            misrepresentation, or any other liability that cannot lawfully be
            excluded or limited.
          </p>
          <p>
            Subject to the paragraph above and to any non-excludable consumer
            rights, LitterLink is not liable for indirect, incidental,
            consequential, special, or business losses, or for losses arising
            from user conduct, organiser decisions, event attendance,
            third-party services, or matters outside our reasonable control.
          </p>
        </TermsSection>

        <TermsSection title="14. Changes to these terms">
          <p>
            We may update these terms from time to time to reflect changes to
            the service, applicable law, or our operating practices. When we do
            so, we will update the "Last updated" date on this page and may
            take additional steps to notify users where appropriate.
          </p>
          <p>
            Your continued use of LitterLink after updated terms take effect
            means you accept the revised terms.
          </p>
        </TermsSection>

        <TermsSection title="15. Governing law and contact">
          <p>
            These terms are governed by the laws of England and Wales, except
            where mandatory consumer protection laws in your country of
            residence give you additional rights.
          </p>
          <p>
            If a dispute cannot be resolved informally, the courts of England
            and Wales will have jurisdiction unless mandatory law says
            otherwise.
          </p>
          <p>
            If you have questions about these terms, contact us at {" "}
            <a href="mailto:hello@litterlink.co.uk" className="font-medium text-brand hover:underline">
              hello@litterlink.co.uk
            </a>
            .
          </p>
        </TermsSection>
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

function TermsSection({
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

function TermsList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-3 pl-5">{children}</ul>;
}
