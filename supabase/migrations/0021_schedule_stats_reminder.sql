-- =============================================================================
-- LitterLink — Schedule the send-event-reminders Edge Function
--
-- Uses pg_cron + pg_net to invoke the function every hour.
-- The project URL and publishable key are stored in Supabase Vault so they are
-- never exposed in plain SQL.
--
-- BEFORE running this migration, store the two secrets in Vault via the
-- Supabase dashboard SQL editor:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<your-publishable-key>', 'publishable_key');
--
-- Use the publishable key (Project Settings → API → publishable) — the modern
-- replacement for the legacy anon key. It is safe to store in Vault.
-- The function is deployed with --no-verify-jwt so this key is not actually
-- verified; the function uses SUPABASE_SERVICE_ROLE_KEY internally for DB access.
-- =============================================================================

-- Enable required extensions (safe to run if already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'stats-reminder-4h',       -- job name (must be unique)
  '0 */4 * * *',             -- every 4 hours
  $$
  select
    net.http_post(
      url := (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'project_url'
      ) || '/functions/v1/send-event-reminders',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
            from vault.decrypted_secrets
           where name = 'publishable_key'
        )
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
