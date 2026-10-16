import { notFound } from "next/navigation";
import { getGroupBySlug } from "@/lib/events";
import { groupShareCard, SHARE_IMAGE_SIZE } from "@/lib/share-image";
import { renderShareImage } from "@/lib/share-image-render";

export const alt = "LitterLink litter-picking group card showing the group name, location and type";
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

// A separate request from the page HTML, so it fetches the group again. Old slugs 404 here; the page's 308
// redirect sends crawlers to the current slug, whose metadata points at the current image.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) notFound();
  return renderShareImage(groupShareCard(group));
}
