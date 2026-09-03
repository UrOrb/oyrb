import { LAYOUT_TYPES, TEMPLATE_THEMES } from "@/lib/template-themes";

export type TemplateUnlock = {
  layout_id: string | null;
  theme_id: string;
};

export type TemplateAccessInput = {
  tier?: string | null;
  layout: string;
  theme: string;
  unlocks?: TemplateUnlock[];
};

export const STARTER_THEME_IDS = ["aura", "minimal", "bold"] as const;
export const ALL_THEME_IDS = Object.keys(TEMPLATE_THEMES);
export const ALL_LAYOUT_IDS = LAYOUT_TYPES.map((layout) => layout.id);

const STARTER_THEME_SET = new Set<string>(STARTER_THEME_IDS);
const ALL_THEME_SET = new Set<string>(ALL_THEME_IDS);
const ALL_LAYOUT_SET = new Set<string>(ALL_LAYOUT_IDS);

export function isValidTemplateSelection(layout: string, theme: string): boolean {
  return ALL_LAYOUT_SET.has(layout) && ALL_THEME_SET.has(theme);
}

export function isStarterTheme(theme: string): boolean {
  return STARTER_THEME_SET.has(theme);
}

export function hasTemplateUnlock(
  unlocks: TemplateUnlock[] | undefined,
  layout: string,
  theme: string,
): boolean {
  return (unlocks ?? []).some(
    (unlock) =>
      unlock.theme_id === theme &&
      (unlock.layout_id === layout || unlock.layout_id === null),
  );
}

export function canUseTemplate({
  tier,
  layout,
  theme,
  unlocks,
}: TemplateAccessInput): boolean {
  if (!isValidTemplateSelection(layout, theme)) return false;
  if (tier === "studio" || tier === "scale") return true;
  return isStarterTheme(theme) || hasTemplateUnlock(unlocks, layout, theme);
}

export function themesForTemplateAccess(
  tier: string | null | undefined,
  layout: string,
  unlocks: TemplateUnlock[] = [],
): string[] {
  if (tier === "studio" || tier === "scale") return ALL_THEME_IDS;
  return ALL_THEME_IDS.filter((theme) =>
    canUseTemplate({ tier, layout, theme, unlocks }),
  );
}

export function fallbackThemeForAccess(
  tier: string | null | undefined,
  layout: string,
  requestedTheme: string | null | undefined,
  unlocks: TemplateUnlock[] = [],
): string {
  const theme = requestedTheme || "aura";
  if (canUseTemplate({ tier, layout, theme, unlocks })) return theme;
  return STARTER_THEME_IDS[0];
}
