"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok?: boolean;
  error?: string;
  /** Changes on every successful submit so forms can reset themselves. */
  stamp?: number;
  /** logRide only: true when this ride added a credit, false for a repeat. */
  newCredit?: boolean;
};

// The server runs in UTC; a user west or east of it may legitimately be one
// day off. The database applies the same one-day tolerance.
const rideSchema = z.object({
  coasterId: z.uuid("Pick a coaster from the list"),
  riddenOn: z.iso
    .date("Enter a valid date")
    .refine((d) => d <= addDaysISO(todayISO(), 1), "The date cannot be in the future"),
  note: z.string().trim().max(280, "Notes can have at most 280 characters"),
});

function revalidateRideViews() {
  revalidatePath("/dashboard");
  revalidatePath("/rides");
  revalidatePath("/");
}

export async function logRide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rideSchema.safeParse({
    coasterId: formData.get("coasterId"),
    riddenOn: formData.get("riddenOn"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();

  // Is this a new credit or another lap? RLS scopes the lookup to the user's own rides.
  const { data: earlier } = await supabase
    .from("rides")
    .select("id")
    .eq("coaster_id", parsed.data.coasterId)
    .limit(1);
  const newCredit = !earlier?.length;

  // user_id comes from the verified session, never from the form. RLS
  // (WITH CHECK user_id = auth.uid()) would reject anything else anyway.
  const { error } = await supabase.from("rides").insert({
    user_id: user.id,
    coaster_id: parsed.data.coasterId,
    ridden_on: parsed.data.riddenOn,
    note: parsed.data.note || null,
  });
  if (error) return { error: friendlyDbError(error) };

  revalidateRideViews();
  return { ok: true, stamp: Date.now(), newCredit };
}

const updateSchema = rideSchema.omit({ coasterId: true }).extend({ id: z.uuid() });

export async function updateRide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    riddenOn: formData.get("riddenOn"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  // No explicit owner filter needed: RLS only lets the user reach their own
  // rows. We still check the row count so a stranger's id gives an honest error.
  const { data, error } = await supabase
    .from("rides")
    .update({ ridden_on: parsed.data.riddenOn, note: parsed.data.note || null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "That ride could not be found." };

  revalidateRideViews();
  return { ok: true, stamp: Date.now() };
}

export async function deleteRide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid ride." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("rides").delete().eq("id", id.data).select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "That ride could not be found." };

  revalidateRideViews();
  return { ok: true, stamp: Date.now() };
}
