import fs from "node:fs";
import path from "node:path";

/**
 * Loads the four pro-facing help docs once per cold start and exposes
 * them concatenated as a single string for the help-chat system prompt.
 *
 * Each doc is wrapped in a delimiter comment + filename so the model can
 * cite "see connect-setup.md" when it answers. The total weight is well
 * over the 1024-token minimum required to enable Anthropic prompt
 * caching, so the caller wraps this string in a `cache_control:
 * ephemeral` block.
 *
 * Vercel bundling: `next.config.ts` lists `./help/**\/*.md` under
 * `outputFileTracingIncludes` for the help-chat function so the .md
 * files are deployed alongside the function and available to
 * fs.readFileSync at runtime.
 */
const HELP_FILES = [
  "connect-setup.md",
  "connect-troubleshooting.md",
  "connect-taxes.md",
  "connect-faq.md",
] as const;

function loadDocs(): string {
  const helpDir = path.join(process.cwd(), "help");
  return HELP_FILES.map((filename) => {
    const text = fs.readFileSync(path.join(helpDir, filename), "utf8");
    return `<!-- FILE: ${filename} -->\n${text}`;
  }).join("\n\n---\n\n");
}

export const HELP_DOCS_CONCAT: string = loadDocs();
