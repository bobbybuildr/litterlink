import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://litterlink.co.uk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, created_at")
    .in("status", ["published", "completed"]);

  const eventUrls: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${siteUrl}/events/${event.id}`,
    lastModified: new Date(event.created_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...eventUrls,
  ];
}
