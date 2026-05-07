import { redirect } from "next/navigation";

/**
 * Root /dashboard/business-brain → redirect to the default tab.
 * Each tab is a sub-route so the URL is bookmarkable.
 */
export default function BusinessBrainRootPage() {
  redirect("/dashboard/business-brain/this-week");
}
