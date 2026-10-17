import { jsonLd } from "@/lib/html";
import { jsonLdGraph, type JsonLdNode } from "@/lib/structured-data";

interface JsonLdProps {
  /** Rendered as one `@graph`; null nodes are skipped. */
  nodes: (JsonLdNode | null | undefined)[];
}

/** Structured data for search engines. `jsonLd()` makes user text safe inside the script element. */
export function JsonLd({ nodes }: JsonLdProps) {
  const graph = jsonLdGraph(nodes);
  if (!graph) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />;
}
