import type { VisibilityPreset } from "@/lib/directory";
import type { SaveVisibilityInput } from "./actions";

/**
 * Applies a preset — setting a bundle of toggles in one call. Pure utility;
 * lives outside actions.ts because "use server" modules may only export
 * async functions (Next.js + Turbopack enforce this at build time).
 *
 * After the caller merges a preset, they still click "Publish" to go live.
 */
export function presetToggles(preset: VisibilityPreset): Partial<SaveVisibilityInput> {
  switch (preset) {
    case "minimal":
      return {
        show_avatar: true,
        show_profession: true,
        show_city: true,
        show_booking_link: true,
        show_specialty_tags: false,
        show_bio: false,
        show_instagram: false,
        show_tiktok: false,
        show_full_site_link: false,
        show_gallery: false,
        show_accepting_clients: false,
        show_price_range: false,
        allow_search_engine_indexing: false,
      };
    case "social":
      return {
        show_avatar: true,
        show_profession: true,
        show_city: true,
        show_booking_link: false,
        show_specialty_tags: false,
        show_bio: false,
        show_instagram: true,
        show_tiktok: true,
        show_full_site_link: false,
        show_gallery: false,
        show_accepting_clients: false,
        show_price_range: false,
        allow_search_engine_indexing: false,
      };
    case "full":
      return {
        show_avatar: true,
        show_profession: true,
        show_city: true,
        show_booking_link: true,
        show_specialty_tags: true,
        show_bio: true,
        show_instagram: true,
        show_tiktok: true,
        show_full_site_link: true,
        show_gallery: true,
        show_accepting_clients: true,
        show_price_range: true,
        allow_search_engine_indexing: true,
      };
    default:
      return {};
  }
}
