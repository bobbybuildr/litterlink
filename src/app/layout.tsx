import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DEFAULT_DESCRIPTION, OPEN_GRAPH_DEFAULTS, SITE_NAME, SITE_URL, TWITTER_DEFAULTS } from "@/lib/seo";
import { BETA_BANNER_DISMISSED_COOKIE, SHOW_BETA_BANNER } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// No canonical or og:url/title here — nested fields are inherited by every page that doesn't set its own.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  openGraph: { ...OPEN_GRAPH_DEFAULTS },
  twitter: { ...TWITTER_DEFAULTS },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bannerDismissed = SHOW_BETA_BANNER && (await cookies()).has(BETA_BANNER_DISMISSED_COOKIE);

  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          {SHOW_BETA_BANNER && <BetaBanner initiallyDismissed={bannerDismissed} />}
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </body>
    </html>
  );
}
