#!/usr/bin/env node
// STAXK go-live seed — run once from the staxk folder:
//
//   node scripts/seed.mjs ./my-resume.md "Front-End UI v1" "React,TypeScript,Next.js,Accessibility"
//
// Creates your active, embedded resume and the target-company list Scout
// scans twice a day. Reads .env.local for:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAXK_USER_ID,
//   and OPENAI_API_KEY or VOYAGE_API_KEY (for the resume embedding).
//
// Safe to re-run: companies upsert on domain, boards skip if already
// present, and each run adds a NEW resume version and makes it active.
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- EDIT ME: the boards Scout scans (SPEC: ~20 hand-picked companies). ---
// board_slug is the company's public job-board token — verify each one by
// opening the URL pattern in a browser first:
//   greenhouse: https://boards.greenhouse.io/{slug}
//   lever:      https://jobs.lever.co/{slug}
//   ashby:      https://jobs.ashbyhq.com/{slug}
const TARGETS = [
  { name: "Figma", domain: "figma.com", ats: "greenhouse", board_slug: "figma" },
  { name: "Vercel", domain: "vercel.com", ats: "greenhouse", board_slug: "vercel" },
  { name: "Calendly", domain: "calendly.com", ats: "greenhouse", board_slug: "calendly" },
  { name: "Linear", domain: "linear.app", ats: "ashby", board_slug: "Linear" },
];

// --- env ------------------------------------------------------------------
function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvLocal();

const need = (key) => {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing ${key} — set it in .env.local`);
    process.exit(1);
  }
  return v;
};

const url = need("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
const userId = need("STAXK_USER_ID");

// --- embedding (same adapter logic as src/lib/embeddings.ts) ---------------
async function embed(text) {
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
    return (await res.json()).data[0].embedding;
  }
  if (process.env.VOYAGE_API_KEY) {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: "voyage-3-lite", input: [text.slice(0, 8000)] }),
    });
    if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    return (await res.json()).data[0].embedding;
  }
  console.error("Set OPENAI_API_KEY or VOYAGE_API_KEY — the resume must be embedded for Scout to score jobs.");
  process.exit(1);
}

// --- main -------------------------------------------------------------------
const [resumePath, label = "Resume v1", skillsCsv = ""] = process.argv.slice(2);
if (!resumePath || !existsSync(resumePath)) {
  console.error(
    'Usage: node scripts/seed.mjs <resume.md> ["Label"] ["skill1,skill2,..."]',
  );
  process.exit(1);
}
const contentMd = readFileSync(resumePath, "utf8");
const skills = skillsCsv.split(",").map((s) => s.trim()).filter(Boolean);

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log("Embedding resume…");
const embedding = await embed(contentMd);

console.log("Saving resume version…");
await supabase.from("resumes").update({ is_active: false }).eq("user_id", userId);
const { data: resume, error: resumeErr } = await supabase
  .from("resumes")
  .insert({
    user_id: userId,
    label,
    content_md: contentMd,
    skills,
    embedding,
    is_active: true,
  })
  .select("id")
  .single();
if (resumeErr) throw resumeErr;
console.log(`  active resume: ${resume.id} (${label})`);

console.log("Seeding target companies…");
for (const t of TARGETS) {
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .upsert(
      { name: t.name, domain: t.domain, ats: t.ats },
      { onConflict: "domain" },
    )
    .select("id")
    .single();
  if (companyErr) throw companyErr;

  const { data: existing } = await supabase
    .from("target_companies")
    .select("id")
    .eq("user_id", userId)
    .eq("board_slug", t.board_slug)
    .maybeSingle();
  if (!existing) {
    const { error: targetErr } = await supabase.from("target_companies").insert({
      user_id: userId,
      company_id: company.id,
      board_slug: t.board_slug,
      ats: t.ats,
    });
    if (targetErr) throw targetErr;
  }
  console.log(`  ${t.name} (${t.ats}:${t.board_slug})`);
}

console.log(
  "\nDone. Scout scans at 6am + 2pm ET — or trigger it now from the Inngest dashboard (Functions → scout-run → Invoke).",
);
