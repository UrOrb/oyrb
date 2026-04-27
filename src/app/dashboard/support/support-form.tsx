"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Paperclip, X, CheckCircle2, AlertCircle } from "lucide-react";

const CATEGORIES = [
  { value: "booking", label: "Booking issue" },
  { value: "payment", label: "Payment / Billing" },
  { value: "account", label: "Account help" },
  { value: "feedback", label: "Feedback / Suggestion" },
  { value: "other", label: "Something else" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value));
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 5000;

const inputCls =
  "block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none";

type Props = {
  userEmail: string;
  businessName: string | null;
  initialMessage: string;
  initialCategory: string;
};

export function SupportForm({
  userEmail,
  businessName,
  initialMessage,
  initialCategory,
}: Props) {
  const [category, setCategory] = useState<CategoryValue | "">(
    VALID_CATEGORIES.has(initialCategory) ? (initialCategory as CategoryValue) : "",
  );
  const [message, setMessage] = useState(initialMessage);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // The escalation flow lands here with prefill set in the URL. After the
  // page mounts, drop those query params so a refresh doesn't re-pre-fill
  // (and so a copied URL doesn't carry the pro's chat summary). Pure
  // history replace — doesn't navigate or trigger a re-render of the page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("prefill") || url.searchParams.has("category")) {
      url.searchParams.delete("prefill");
      url.searchParams.delete("category");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, []);

  function handleFile(f: File | null) {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setFileError("Screenshots must be image files.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("Max 5 MB. Try cropping or compressing the screenshot.");
      return;
    }
    setFile(f);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function reset() {
    setCategory("");
    setMessage("");
    clearFile();
    setServerError(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setSuccess(false);

    if (!category) {
      setServerError("Pick a category so we can route your message.");
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE) {
      setServerError(`Add a few more details — at least ${MIN_MESSAGE} characters.`);
      return;
    }
    if (trimmed.length > MAX_MESSAGE) {
      setServerError(`Trim your message to ${MAX_MESSAGE} characters or fewer.`);
      return;
    }

    const fd = new FormData();
    fd.set("category", category);
    fd.set("message", trimmed);
    if (file) fd.set("screenshot", file);

    start(async () => {
      try {
        const res = await fetch("/api/dashboard/support", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setServerError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        setSuccess(true);
        reset();
      } catch {
        setServerError("Connection issue — please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      {success && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-900"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <p>
            Got it! We&apos;ll reply within 24 hours to{" "}
            <strong>{userEmail || "your account email"}</strong>.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="support-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="support-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as CategoryValue | "");
              if (success) setSuccess(false);
            }}
            required
            className={`${inputCls} mt-1.5`}
          >
            <option value="" disabled>
              Pick one…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <label htmlFor="support-message" className="text-sm font-medium">
              How can we help?
            </label>
            <span className="text-[11px] text-[#A3A3A3]">
              {message.length}/{MAX_MESSAGE}
            </span>
          </div>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (success) setSuccess(false);
            }}
            placeholder={
              businessName
                ? `Tell us what's going on. We'll reply to ${userEmail}.`
                : "Tell us what's going on."
            }
            rows={8}
            minLength={MIN_MESSAGE}
            maxLength={MAX_MESSAGE}
            required
            className={`${inputCls} mt-1.5 resize-y`}
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Screenshot <span className="font-normal text-[#A3A3A3]">(optional, max 5 MB)</span>
          </label>
          {file ? (
            <div className="mt-1.5 flex items-center justify-between rounded-md border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip size={14} className="shrink-0 text-[#737373]" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-[11px] text-[#A3A3A3]">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove screenshot"
                className="rounded p-1 text-[#737373] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0A0A0A] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
            />
          )}
          {fileError && (
            <p className="mt-1.5 text-xs text-red-700">{fileError}</p>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <p className="mr-auto text-xs text-[#A3A3A3]">
            Replies go to {userEmail || "your account email"}.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Send to OYRB
          </button>
        </div>
      </div>
    </form>
  );
}
