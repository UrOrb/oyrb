"use client";

import { useState } from "react";
import { Pencil, Eye, RefreshCw, ExternalLink } from "lucide-react";

type Props = {
  slug: string;
  origin: string;
  isPublished: boolean;
  editChildren: React.ReactNode;
};

export function EditorTabs({ slug, origin, isPublished, editChildren }: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [iframeKey, setIframeKey] = useState(0);

  const previewUrl = `${origin}/s/${slug}`;

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-5 flex items-center gap-1 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-1">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "edit" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#737373] hover:text-[#0A0A0A]"
          }`}
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          type="button"
          onClick={() => { setTab("preview"); setIframeKey((k) => k + 1); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "preview" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#737373] hover:text-[#0A0A0A]"
          }`}
        >
          <Eye size={14} /> Client preview
        </button>
      </div>

      {tab === "edit" ? (
        <div>{editChildren}</div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-[#E7E5E4] bg-white p-3 text-xs text-[#525252]">
            <p>
              This is exactly what your clients see when they visit{" "}
              <span className="font-mono text-[#0A0A0A]">oyrb.space/s/{slug}</span>
              {!isPublished && (
                <span className="ml-2 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  Owner preview · not yet published
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1.5 font-medium hover:bg-[#F5F5F4]"
              >
                <RefreshCw size={12} /> Refresh
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1.5 font-medium hover:bg-[#F5F5F4]"
              >
                <ExternalLink size={12} /> Open in new tab
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#E7E5E4] bg-white">
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="block h-[calc(100vh-260px)] w-full"
              title="Client site preview"
            />
          </div>
          <p className="mt-3 text-xs text-[#A3A3A3]">
            Tip: switch to <span className="font-medium text-[#525252]">Edit</span>, change a field,
            hit Save, then come back here and click <span className="font-medium text-[#525252]">Refresh</span>.
          </p>
        </div>
      )}
    </div>
  );
}
