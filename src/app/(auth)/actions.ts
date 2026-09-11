"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  values?: { email?: string; displayName?: string };
};

const email = z.email("Enter a valid email address");

const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z.object({
  email,
  password: z.string().min(8, "Use at least 8 characters"),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name needs at least 2 characters")
    .max(40, "Display name can have at most 40 characters"),
});

function safeNext(value: FormDataEntryValue | null): string {
  // Only allow same-site relative paths as a post-login destination.
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email or password is incorrect", values };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  const values = {
    email: String(formData.get("email") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Read by the handle_new_user trigger, which creates the profile row.
    options: { data: { display_name: parsed.data.displayName } },
  });

  if (error) {
    const taken = /already|exists|registered/i.test(error.message);
    return {
      error: taken ? "An account with this email already exists. Try signing in." : error.message,
      values,
    };
  }
  if (!data.session) {
    // Only happens if email confirmation is turned on in Supabase (off in v1, TDD §5).
    return { error: "Check your inbox to confirm your email, then sign in.", values };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
