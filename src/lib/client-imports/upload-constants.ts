// Upload constraints for the Phase 7 client-import flow. Single source
// of truth shared between the upload-token route (route-level pre-check
// before minting a signed URL) and the parse route (defensive re-check
// against the stored MIME, in case the bucket allowlist drifts later).
//
// Mirrors the dispute-evidence shape from `@/lib/disputes` so both
// upload pipelines validate the same way.
//
// The Supabase storage bucket also enforces these limits via
// `file_size_limit` + `allowed_mime_types` declared in migration 049 —
// the route-level checks here are belt-and-suspenders so the bucket
// rejection isn't the user's first sign of trouble.

export const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "text/plain",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 10 MB. A 5,000-row CSV with verbose columns sits at ~1–2 MB; 10 MB
// leaves ample headroom. Raise (and consider chunked upload) only if
// real-world imports start hitting the cap.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Cap on raw filename input — long enough for any reasonable export
// from a competitor platform, short enough that the storage path stays
// well under PostgREST's URL-length limits.
export const MAX_FILENAME_LENGTH = 255;

export function isAllowedMime(mime: string | null | undefined): mime is AllowedMimeType {
  if (!mime) return false;
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}
