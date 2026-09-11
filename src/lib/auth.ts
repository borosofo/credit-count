import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "enthusiast" | "admin";

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  show_on_leaderboard: boolean;
};

export type SessionUser = { id: string; email: string | null };

/**
 * Identity of the current request, verified from the JWT signature
 * (getClaims), deduplicated per request with React cache. Returns null for
 * visitors. This is the only place the app reads the session.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** The current user's profile row (RLS lets a user read only their own). */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role, show_on_leaderboard")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  return data ?? null;
});

/** For pages and actions that need a signed-in user. Redirects visitors. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * For admin pages and actions. This is the friendly layer only: the database
 * refuses catalogue writes from non-admins regardless (FR8).
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
