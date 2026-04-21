-- ═════════════════════════════════════════════════════════════════════════
-- 018 — Drop broad SELECT policy on the `photos` storage bucket
--
-- Supabase's linter flags the "Public read photos" SELECT policy on
-- storage.objects as overly broad: it lets clients enumerate every file
-- in the bucket via storage.from('photos').list().
--
-- The app never calls .list(); it only uses .getPublicUrl() (served
-- by Supabase's public CDN endpoint, which does not hit RLS) and
-- .upload() (governed by the INSERT policy). So the SELECT policy is
-- pure attack surface — drop it and image URLs continue to render.
-- ═════════════════════════════════════════════════════════════════════════

drop policy if exists "Public read photos" on storage.objects;
