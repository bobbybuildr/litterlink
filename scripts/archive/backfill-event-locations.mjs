/**
 * One-off backfill: populates `location_outcode` and `location_admin_district`
 * on existing `events` rows that predate migration 0031.
 *
 * Uses postcodes.io's bulk lookup endpoint (POST /postcodes, up to 100
 * postcodes per request) instead of one geocode call per event.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-event-locations.mjs [--dry-run]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (service role,
 * needed to bypass RLS and update every organiser's events).
 *
 * Safe to re-run: only targets rows where location_outcode IS NULL.
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const FETCH_PAGE_SIZE = 1000;
const BULK_LOOKUP_SIZE = 100; // postcodes.io bulk endpoint hard limit
const BULK_LOOKUP_DELAY_MS = 250; // be polite to the free API between chunks

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Run with:\n" +
      "  node --env-file=.env.local scripts/backfill-event-locations.mjs"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Fetches every event row missing location_outcode, paginated. */
async function fetchEventsMissingLocation() {
  const rows = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("events")
      .select("id, location_postcode")
      .is("location_outcode", null)
      .range(from, from + FETCH_PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to fetch events: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }

  return rows;
}

/**
 * Looks up a batch of postcodes (max 100) via the postcodes.io bulk endpoint.
 * Returns a Map keyed by the exact postcode string sent, so it always lines
 * up with the `location_postcode` values already stored on events.
 */
async function bulkLookup(postcodes) {
  const res = await fetch("https://api.postcodes.io/postcodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcodes }),
  });

  if (!res.ok) {
    console.warn(`  Bulk lookup request failed (${res.status}), skipping this batch.`);
    return new Map();
  }

  const json = await res.json();
  if (json.status !== 200 || !Array.isArray(json.result)) {
    console.warn("  Bulk lookup returned an unexpected response, skipping this batch.");
    return new Map();
  }

  const map = new Map();
  for (const entry of json.result) {
    if (entry.result) {
      map.set(entry.query, {
        outcode: entry.result.outcode,
        adminDistrict: entry.result.admin_district ?? null,
      });
    } else {
      console.warn(`  Postcode not recognised by postcodes.io: "${entry.query}"`);
    }
  }
  return map;
}

async function main() {
  console.log(DRY_RUN ? "Running in --dry-run mode (no writes will be made).\n" : "");

  const events = await fetchEventsMissingLocation();
  if (events.length === 0) {
    console.log("No events need backfilling — location_outcode is already set on all rows.");
    return;
  }
  console.log(`Found ${events.length} event(s) missing location_outcode.`);

  const uniquePostcodes = [...new Set(events.map((e) => e.location_postcode))];
  console.log(`Resolving ${uniquePostcodes.length} unique postcode(s) via postcodes.io bulk lookup...`);

  const resolved = new Map();
  const postcodeChunks = chunk(uniquePostcodes, BULK_LOOKUP_SIZE);
  for (let i = 0; i < postcodeChunks.length; i++) {
    const batch = postcodeChunks[i];
    console.log(`  Batch ${i + 1}/${postcodeChunks.length} (${batch.length} postcodes)`);
    const batchResult = await bulkLookup(batch);
    for (const [postcode, geo] of batchResult) resolved.set(postcode, geo);
    if (i < postcodeChunks.length - 1) await sleep(BULK_LOOKUP_DELAY_MS);
  }

  // Group event ids by their resolved (outcode, adminDistrict) pair so we can
  // update many rows per DB call instead of one call per event.
  const groups = new Map();
  let unresolvedCount = 0;

  for (const event of events) {
    const geo = resolved.get(event.location_postcode);
    if (!geo) {
      unresolvedCount++;
      continue;
    }
    const key = `${geo.outcode}|${geo.adminDistrict ?? ""}`;
    const group = groups.get(key) ?? {
      outcode: geo.outcode,
      adminDistrict: geo.adminDistrict,
      ids: [],
    };
    group.ids.push(event.id);
    groups.set(key, group);
  }

  const totalToUpdate = events.length - unresolvedCount;
  console.log(
    `Resolved ${totalToUpdate}/${events.length} event(s) into ${groups.size} update group(s).` +
      (unresolvedCount > 0 ? ` ${unresolvedCount} could not be resolved and will be left as-is.` : "")
  );

  if (DRY_RUN) {
    for (const { outcode, adminDistrict, ids } of groups.values()) {
      console.log(`  [dry-run] ${outcode} / ${adminDistrict ?? "(no district)"} -> ${ids.length} event(s)`);
    }
    console.log("\nDry run complete. Re-run without --dry-run to apply these updates.");
    return;
  }

  let updatedCount = 0;
  for (const { outcode, adminDistrict, ids } of groups.values()) {
    const { error } = await supabase
      .from("events")
      .update({ location_outcode: outcode, location_admin_district: adminDistrict })
      .in("id", ids);

    if (error) {
      console.error(`  Failed to update group ${outcode}/${adminDistrict}: ${error.message}`);
      continue;
    }
    updatedCount += ids.length;
  }

  console.log(`\nDone. Updated ${updatedCount}/${events.length} event(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
