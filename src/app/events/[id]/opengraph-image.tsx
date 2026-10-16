import { notFound } from "next/navigation";
import { getEventById } from "@/lib/events";
import { eventShareCard, SHARE_IMAGE_SIZE } from "@/lib/share-image";
import { renderShareImage } from "@/lib/share-image-render";

export const alt = "LitterLink litter-picking event card showing the event title, meeting point, date and host";
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

// A separate request from the page HTML, so it fetches the event again (under the same RLS as the page).
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  return renderShareImage(eventShareCard(event));
}
