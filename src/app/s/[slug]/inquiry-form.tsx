"use client";

import { useState } from "react";
import { MessageSquare, Check, X } from "lucide-react";

interface Props {
  slug: string;
  businessName: string;
  accent: string;
  btnBg: string;
  btnText: string;
  ink: string;
  muted: string;
  surface: string;
  border: string;
  displayFont: string;
}

export function InquiryForm({
  slug,
  businessName,
  accent,
  btnBg,
  btnText,
  ink,
  muted,
  surface,
  border,
  displayFont,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      const res = await fetch("/api/public/bookings/upload-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Upload failed");
      else setPhotos((p) => [...p, data.url]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name || !email || !message) {
      setError("Please fill in your name, email, and question.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, phone, message, photos }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      className="px-6 py-16"
      style={{ backgroundColor: surface, borderTop: `1px solid ${border}`, color: ink }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="text-2xl font-medium tracking-[-0.02em] md:text-3xl"
          style={{ fontFamily: displayFont }}
        >
          Not sure what to book?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: muted }}>
          Ask {businessName} a question before booking — send a reference photo, describe what you want, or check if they can help with a repair.
        </p>
        {!open && !sent && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
            style={{ backgroundColor: btnBg, color: btnText }}
          >
            <MessageSquare size={14} />
            Ask a question
          </button>
        )}

        {sent && (
          <div
            className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-lg p-4 text-left text-sm"
            style={{ backgroundColor: "#ECFDF5", color: "#166534" }}
          >
            <Check size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">Message sent!</p>
              <p className="mt-0.5 text-xs">{businessName} will reply to your email within 24 hours.</p>
            </div>
          </div>
        )}

        {open && !sent && (
          <div
            className="mx-auto mt-6 max-w-xl rounded-lg p-6 text-left"
            style={{ backgroundColor: "#FFFFFF", border: `1px solid ${border}` }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Your email"
                className="rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
              />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="Phone (optional)"
              className="mt-3 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What would you like to ask? Include details about the service you're interested in."
              className="mt-3 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
              maxLength={1200}
            />

            {photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((url, i) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Photo ${i + 1}`} className="h-14 w-14 rounded-md border border-[#E7E5E4] object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A] text-white hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium hover:bg-[#F5F5F4]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                disabled={uploading || photos.length >= 3}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = "";
                }}
              />
              {uploading ? "Uploading…" : photos.length >= 3 ? "3 photo max" : "+ Attach photo"}
            </label>

            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={sending || uploading || !name || !email || !message}
                className="rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: accent, color: "#fff" }}
              >
                {sending ? "Sending…" : "Send question"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#E7E5E4] bg-white px-5 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
