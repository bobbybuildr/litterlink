import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";
const defaultDescription =
  "Find and join local litter-picking events near you. Track your impact and help keep communities clean.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "LitterLink", template: "%s | LitterLink" },
  description: defaultDescription,
  openGraph: {
    siteName: "LitterLink",
    type: "website",
    url: "/",
    title: "LitterLink — Find Local Litter Picks",
    description: defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </body>
    </html>
  );
}
