import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /profile is deliberately crawlable: it relies on X-Robots-Tag noindex, which a disallowed URL never exposes.
      disallow: ["/dashboard", "/admin", "/auth", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
