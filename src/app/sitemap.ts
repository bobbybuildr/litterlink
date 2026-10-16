import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/events";
import { buildSitemap, SITEMAP_URL_LIMIT } from "@/lib/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = buildSitemap(await getSitemapData());

  if (entries.length > SITEMAP_URL_LIMIT) {
    console.warn(
      `[sitemap] ${entries.length} URLs exceeds the ${SITEMAP_URL_LIMIT}-URL limit; split it with generateSitemaps().`
    );
  }

  return entries;
}
