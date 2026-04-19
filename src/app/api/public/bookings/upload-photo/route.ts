import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file") as File | null;
  const slug = (form.get("slug") as string | null)?.trim() ?? "";

  if (!file || !slug) {
    return NextResponse.json({ error: "Missing file or slug" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
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
