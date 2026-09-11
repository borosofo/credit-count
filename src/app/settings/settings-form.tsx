"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import type { ActionState } from "@/app/rides/actions";
import type { Profile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateProfile(prev, formData);
      if (result.ok) toast.add({ type: "success", title: "Settings saved" });
      return result;
    },
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="displayName">Display name</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            required
            minLength={2}
            maxLength={40}
            defaultValue={profile.display_name}
            className="max-w-sm"
          />
          <FieldDescription>
            Names are not unique, so pick one your friends will recognise.
          </FieldDescription>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="showOnLeaderboard">Appear on the public leaderboard</FieldLabel>
            <FieldDescription>
              Off by default. When on, visitors see your display name and credit count, nothing else:
              never which coasters you rode, when, or your notes. Turning it off removes you at once.
            </FieldDescription>
          </FieldContent>
          <Switch id="showOnLeaderboard" name="showOnLeaderboard" defaultChecked={profile.show_on_leaderboard} />
        </Field>

        {state.error && <FieldError>{state.error}</FieldError>}
      </FieldGroup>

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
