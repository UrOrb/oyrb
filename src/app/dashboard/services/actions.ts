"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/current-site";
import { connectReady } from "@/lib/stripe-connect";

async function getBiz() {
  return await getCurrentBusiness();
}

function revalidate(slug: string | null | undefined) {
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard");
  if (slug) revalidatePath(`/s/${slug}`);
}

export async function createService(formData: FormData) {
  const biz = await getBiz();
  const businessId = biz?.id;
  if (!biz || !businessId) return { error: "Not authenticated" };
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name required" };
  const duration = parseInt((formData.get("duration_minutes") as string) || "60", 10);
  const priceDollars = parseFloat((formData.get("price_dollars") as string) || "0");
  const depositDollars = parseFloat((formData.get("deposit_dollars") as string) || "0");
  const description = (formData.get("description") as string)?.trim() || null;

  // Server-side gate: ignore any deposit value if the pro isn't fully
  // Connect-ready. The form's input is disabled too, but never trust the
  // form — a hand-crafted POST could still try to set one.
  const allowDeposit = connectReady(biz);

  const { error } = await supabase.from("services").insert({
    business_id: businessId,
    name,
    description,
    duration_minutes: duration,
    price_cents: Math.round(priceDollars * 100),
    deposit_cents: allowDeposit ? Math.round(depositDollars * 100) : 0,
    active: true,
  });
  if (error) return { error: error.message };
  revalidate(biz?.slug);
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const biz = await getBiz();
  const businessId = biz?.id;
  if (!biz || !businessId) return { error: "Not authenticated" };
  const supabase = await createClient();

  // Same gate as createService. Additionally: if the field is locked,
  // preserve the existing deposit_cents instead of zeroing it — disabled
  // inputs don't submit their value, so the form would otherwise wipe a
  // previously-set deposit on a routine name/description edit.
  const allowDeposit = connectReady(biz);
  const update: Record<string, unknown> = {
    name: (formData.get("name") as string) || "",
    description: (formData.get("description") as string) || null,
    duration_minutes: parseInt((formData.get("duration_minutes") as string) || "60", 10),
    price_cents: Math.round(parseFloat((formData.get("price_dollars") as string) || "0") * 100),
    active: formData.get("active") === "on",
  };
  if (allowDeposit) {
    update.deposit_cents = Math.round(
      parseFloat((formData.get("deposit_dollars") as string) || "0") * 100,
    );
  }
  const { error } = await supabase
    .from("services")
    .update(update)
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) return { error: error.message };
  revalidate(biz?.slug);
  return { success: true };
}

export async function deleteService(id: string) {
  const biz = await getBiz();
  const businessId = biz?.id;
  if (!businessId) return { error: "Not authenticated" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);
  if (error) return { error: error.message };
  revalidate(biz?.slug);
  return { success: true };
}
