"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "square" | "wide" | "tall";
  userId: string;
};

export function ImageUpload({ label, value, onChange, aspect = "wide", userId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErr("Must be an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("Max file size is 5MB");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const aspectCls =
    aspect === "square" ? "aspect-square" :
    aspect === "tall" ? "aspect-[3/4]" :
    "aspect-video";

  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium">{label}</label>}
      <div className={`relative flex items-center justify-center overflow-hidden rounded-md border border-dashed border-[#E7E5E4] bg-[#FAFAF9] ${aspectCls} max-h-48`}>
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white"
              aria-label="Remove"
            >
              <X size={14} />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-1 text-xs text-[#737373]">
            <Loader2 size={20} className="animate-spin" />
            Uploading...
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A]"
          >
            <Upload size={18} />
            Upload image
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {value && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-2 text-xs text-[#B8896B] hover:underline"
        >
          Replace
        </button>
      )}
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
    </div>
  );
}


type GalleryProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  userId: string;
  max?: number;
};

export function GalleryUpload({ value, onChange, userId, max = 12 }: GalleryProps) {
  const add = (url: string) => {
    if (!url) return;
    onChange([...value, url].slice(0, max));
  };
  const remove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {value.map((u) => (
          <div key={u} className="relative aspect-square overflow-hidden rounded-md border border-[#E7E5E4]">
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(u)}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow-sm hover:bg-white"
              aria-label="Remove"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <div className="aspect-square">
            <ImageUpload
              value=""
              onChange={add}
              userId={userId}
              aspect="square"
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-[#A3A3A3]">{value.length} / {max} photos · tap an image to remove</p>
    </div>
  );
}
