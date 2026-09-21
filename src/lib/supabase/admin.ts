import "server-only";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

// Service-role client for privileged operations (e.g. auth.admin.*).
// Never import this from anything reachable by the browser.
export function createAdminClient() {
  return createServiceClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey);
}
