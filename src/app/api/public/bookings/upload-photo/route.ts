import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
// Storage path extension is derived from the original filename. Lock it to a
// strict allowlist so a crafted "foo.php" or "foo.svg" can't leak through.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

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
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type. Use JPG, PNG, WebP, or HEIC." }, { status: 415 });
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

  // Derive the extension from the verified MIME, never from the user filename.
  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const path = `bookings/${biz.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from("photos").upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
