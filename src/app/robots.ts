import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/profile", "/auth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
