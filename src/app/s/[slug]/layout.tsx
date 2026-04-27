import { ALL_FONT_VARIABLE_CLASSES } from "@/lib/storefront-fonts";

/**
 * Storefront wrapper. Mounts all 10 customizable Google fonts as CSS
 * variables so any descendant element can pick its font by referencing
 * `var(--font-<slug>)`. The page resolves the active business's
 * heading_font / body_font and overrides the theme's font strings
 * before passing them down to the template components.
 *
 * Why a layout (and not just a wrapper inside page.tsx): next/font only
 * preloads on routes that import the font module. Loading the variables
 * here keeps the 10 fonts bundled with /s/* routes and out of every
 * other route in the app.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={ALL_FONT_VARIABLE_CLASSES}>{children}</div>;
}
