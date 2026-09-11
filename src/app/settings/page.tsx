import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth";
import { SettingsForm } from "./settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Signed in as {user.email}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Profile and privacy</CardTitle>
          <CardDescription>Your ride history is always private. The leaderboard is opt-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
