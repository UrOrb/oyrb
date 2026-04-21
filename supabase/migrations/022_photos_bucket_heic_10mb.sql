-- ═════════════════════════════════════════════════════════════════════════
-- 022 — photos bucket: allow HEIC/HEIF + raise size cap to 10 MB
--
-- The `photos` bucket has its own MIME allowlist and size cap that sit
-- BELOW the application-layer checks. iPhones shooting in the default
-- "High Efficiency" mode produce image/heic (or image/heif) files that
-- Supabase Storage rejected before our route ever saw them.
-- Allowed MIMEs in the app (src/app/api/public/bookings/upload-photo/
-- route.ts) and bucket must agree — keep them in sync.
-- Size cap raised from 5 MB (iPhone Most-Compatible JPEGs routinely sit
-- in the 6-9 MB range).
-- ═════════════════════════════════════════════════════════════════════════

update storage.buckets
set
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'],
  file_size_limit   = 10485760  -- 10 MiB
where id = 'photos';
