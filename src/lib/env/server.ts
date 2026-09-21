import "server-only";

// Validated server-only secrets. Importing this file from a Client Component
// or the browser Supabase factory is a build-time error (see `server-only`).

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const serverEnv = {
  supabaseSecretKey: required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
};
