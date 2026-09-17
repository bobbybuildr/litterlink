-- =============================================================================
-- LitterLink — Extended group fields + group-logos storage bucket
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add new columns to groups
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS website_url   TEXT,
  ADD COLUMN IF NOT EXISTS social_url    TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS group_type    TEXT NOT NULL DEFAULT 'other'
    CHECK (group_type IN ('community', 'school', 'corporate', 'council', 'charity', 'other'));


-- ---------------------------------------------------------------------------
-- 2. group-logos storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-logos',
  'group-logos',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Anyone can read group logos (bucket is public)
CREATE POLICY "group-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-logos');

-- Authenticated users can upload to their own group folder ({group_id}/logo.{ext})
CREATE POLICY "group-logos: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'group-logos');

-- Owners can replace their logo
CREATE POLICY "group-logos: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'group-logos');

-- Owners can delete their logo
CREATE POLICY "group-logos: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'group-logos');
