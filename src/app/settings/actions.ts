"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/rides/actions";
import { requireUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name needs at least 2 characters")
    .max(40, "Display name can have at most 40 characters"),
  showOnLeaderboard: z.boolean(),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    showOnLeaderboard: formData.get("showOnLeaderboard") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const supabase = await createClient();
  // Only these two columns are grantable to users (TDD §4); role is not.
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      show_on_leaderboard: parsed.data.showOnLeaderboard,
    })
    .eq("id", user.id)
    .select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "Profile not found." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/"); // leaderboard reflects the opt-in/opt-out at once (FR7)
  return { ok: true, stamp: Date.now() };
}
