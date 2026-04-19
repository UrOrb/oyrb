"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { getCurrentBusiness } from "@/lib/current-site";

export async function updateCustomDomain(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const business = await getCurrentBusiness();
  if (!business) return { error: "No business" };

  if (business.subscription_tier !== "scale") {
    return { error: "Custom domains are a Scale-tier feature." };
  }

  const raw = (formData.get("custom_domain") as string)?.trim().toLowerCase() ?? "";
  const domain = raw
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  // Basic validation
  if (domain && !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) {
    return { error: "Invalid domain format (example: yourstudio.com)" };
  }

  await supabase
    .from("businesses")
    .update({
      custom_domain: domain || null,
      custom_domain_verified: false, // reset verification on change
    })
    .eq("id", business.id);

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteAccount(formData: FormData) {
  const confirmText = formData.get("confirm") as string;
  if (confirmText !== "DELETE") {
    return { error: "You must type DELETE exactly to confirm." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  // Account deletion cleans up *every* site the user owns and every Stripe
  // subscription tied to those sites — multi-site users have one sub each.
  const { data: businesses } = await admin
    .from("businesses")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("owner_id", user.id);

  const customerIds = new Set<string>();
  for (const b of businesses ?? []) {
    if (b.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(b.stripe_subscription_id);
      } catch (err) {
        console.error("Failed to cancel subscription during account deletion:", err);
      }
    }
    if (b.stripe_customer_id) customerIds.add(b.stripe_customer_id);
  }

  for (const cid of customerIds) {
    try {
      await stripe.customers.del(cid);
    } catch (err) {
      console.error("Failed to delete Stripe customer:", err);
    }
  }

  // Delete every business owned by the user; FKs cascade the rest.
  if (businesses && businesses.length > 0) {
    await admin
      .from("businesses")
      .delete()
      .in("id", businesses.map((b: { id: string }) => b.id));
  }

  // 4. Delete the auth user (this removes Supabase account permanently)
  await admin.auth.admin.deleteUser(user.id);

  // Sign out and redirect home
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
