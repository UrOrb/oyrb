import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

// 10MB — iPhone "Most Compatible" JPEGs routinely sit in the 6-9MB range,
// so the previous 5MB cap was silently rejecting most phone photos.
const MAX_SIZE = 10 * 1024 * 1024;

// Canonical MIME → file extension. Non-canonical MIMEs (heif, empty,
// octet-stream) fall through to a filename-extension sniff below.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heic",
};

function sniffMimeAndExt(file: File): { mime: string; ext: string } | null {
  // Trust a known MIME first.
  if (file.type && MIME_TO_EXT[file.type.toLowerCase()]) {
    const mime = file.type.toLowerCase();
    return { mime, ext: MIME_TO_EXT[mime] };
  }
  // Fallback: some iOS flows + older Android browsers send empty or
  // application/octet-stream. Derive from filename extension instead.
  const name = file.name || "";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (EXT_TO_MIME[ext]) {
    return { mime: EXT_TO_MIME[ext], ext: MIME_TO_EXT[EXT_TO_MIME[ext]] };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const minute = rateLimit(`upload:m:${ip}`, 10, 60_000);
  if (!minute.ok) {
    return NextResponse.json(
      { error: "Too many uploads — please slow down." },
      { status: 429 }
    );
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const slug = (form.get("slug") as string | null)?.trim() ?? "";

  if (!file || !slug) {
    return NextResponse.json({ error: "Missing file or slug" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `Photo is ${mb}MB — max 10MB. Try shooting in a lower resolution or a different photo.` },
      { status: 413 }
    );
  }

  const sniffed = sniffMimeAndExt(file);
  if (!sniffed) {
    return NextResponse.json(
      {
        error: `Unsupported file type (got "${file.type || "unknown"}"). Use JPG, PNG, WebP, or HEIC.`,
      },
      { status: 415 }
    );
  }

  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz || !biz.is_published) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const path = `bookings/${biz.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${sniffed.ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from("photos").upload(path, arrayBuffer, {
    contentType: sniffed.mime,
    upsert: false,
  });
  if (error) {
    console.error("Upload error:", { path, mime: sniffed.mime, size: file.size, err: error });
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
