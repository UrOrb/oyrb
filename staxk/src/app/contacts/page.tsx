import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { getContacts } from "@/lib/data";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const contacts = await getContacts();
  return (
    <>
      <PageHeader
        title="Contacts"
        sub="Verified by Sleuth · ≥ 0.85 email confidence required for outreach"
      />
      <ul className="grid gap-3 px-4 py-6 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {contacts.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="font-display text-lg font-semibold">{c.full_name}</p>
            <p className="text-sm text-muted">
              {c.title} · {c.company?.name}
            </p>
            {c.email && (
              <p className="mt-2 font-mono text-xs">
                {c.email}{" "}
                <span
                  className={
                    (c.email_confidence ?? 0) >= 0.85
                      ? "text-signal"
                      : "text-caution"
                  }
                >
                  ({Math.round((c.email_confidence ?? 0) * 100)}%)
                </span>
              </p>
            )}
            {c.personalization_notes_md && (
              <p className="mt-2 text-sm leading-snug text-muted">
                <span className="font-mono text-[10px] uppercase tracking-wide text-pulse">
                  hook ·{" "}
                </span>
                {c.personalization_notes_md}
              </p>
            )}
            {c.linkedin_url && (
              <a
                href={c.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-mono text-xs text-signal underline"
              >
                LinkedIn profile
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
