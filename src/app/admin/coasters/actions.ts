"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/rides/actions";
import { requireAdmin } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// requireAdmin() gives non-admins a redirect instead of a cryptic error. The
// real gate is RLS: coasters accept writes only where is_admin() (FR8).

const coasterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  park: z.string().trim().min(1, "Park is required").max(120),
  country: z.string().trim().min(2, "Country is required").max(80),
  manufacturer: z.string().trim().min(1, "Manufacturer is required").max(80),
  type: z.enum(["steel", "wooden", "hybrid"], { message: "Pick a type" }),
});

function fields(formData: FormData) {
  return {
    name: formData.get("name"),
    park: formData.get("park"),
    country: formData.get("country"),
    manufacturer: formData.get("manufacturer"),
    type: formData.get("type"),
  };
}

function revalidateCatalogue() {
  revalidatePath("/admin/coasters");
  revalidatePath("/coasters");
  revalidatePath("/dashboard");
  revalidatePath("/rides");
}

export async function createCoaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = coasterSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  const { error } = await supabase.from("coasters").insert(parsed.data);
  if (error) {
    return { error: error.code === "23505" ? "That coaster already exists at that park." : friendlyDbError(error) };
  }
  revalidateCatalogue();
  return { ok: true, stamp: Date.now() };
}

export async function updateCoaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = coasterSchema.safeParse(fields(formData));
  if (!id.success) return { error: "Invalid coaster." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("coasters").update(parsed.data).eq("id", id.data).select("id");
  if (error) {
    return { error: error.code === "23505" ? "Another coaster with that name already exists at that park." : friendlyDbError(error) };
  }
  if (!data?.length) return { error: "Coaster not found, or you are not an admin." };
  revalidateCatalogue();
  return { ok: true, stamp: Date.now() };
}

export async function deleteCoaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid coaster." };

  const supabase = await createClient();
  // ON DELETE RESTRICT on rides: a coaster with rides cannot be deleted, only merged.
  const { data, error } = await supabase.from("coasters").delete().eq("id", id.data).select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "Coaster not found, or you are not an admin." };
  revalidateCatalogue();
  return { ok: true, stamp: Date.now() };
}

const mergeSchema = z
  .object({ fromId: z.uuid("Invalid coaster"), intoId: z.uuid("Pick the coaster to keep") })
  .refine((v) => v.fromId !== v.intoId, { message: "Pick a different coaster to merge into" });

export async function mergeCoaster(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = mergeSchema.safeParse({ fromId: formData.get("fromId"), intoId: formData.get("intoId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  // security definer function: re-points every user's rides, then deletes the
  // duplicate. It re-checks is_admin() itself.
  const { error } = await supabase.rpc("merge_coaster", {
    p_from: parsed.data.fromId,
    p_into: parsed.data.intoId,
  });
  if (error) return { error: friendlyDbError(error) };
  revalidateCatalogue();
  return { ok: true, stamp: Date.now() };
}
