"use client";

import { useActionState, useState } from "react";
import { logRide, type ActionState } from "@/app/rides/actions";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";

export type CoasterOption = {
  id: string;
  name: string;
  park: string;
  country: string;
};

/**
 * Logging a ride in three interactions (FR2): type to search, pick the
 * coaster, press "Log ride". Date defaults to today; the note is optional.
 */
export function QuickLog({ coasters }: { coasters: CoasterOption[] }) {
  const [selected, setSelected] = useState<CoasterOption | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await logRide(prev, formData);
      if (result.ok) {
        toast.add({ type: "success", title: "Ride logged", description: "Your stats are up to date." });
        setSelected(null);
        setFormKey((k) => k + 1); // remount the form so date and note reset
      }
      return result;
    },
    {},
  );

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={state.error && !selected ? true : undefined}>
          <FieldLabel htmlFor="coaster">Coaster</FieldLabel>
          <Combobox
            items={coasters}
            value={selected}
            onValueChange={(value) => setSelected(value)}
            itemToStringLabel={(c) => c.name}
            autoHighlight
          >
            <ComboboxInput
              id="coaster"
              placeholder="Search by name…"
              showClear
              className="w-full"
              aria-invalid={state.error && !selected ? true : undefined}
            />
            <ComboboxContent>
              <ComboboxEmpty>No coaster matches. Ask an admin to add it.</ComboboxEmpty>
              <ComboboxList>
                {(c) => (
                  <ComboboxItem key={c.id} value={c}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{c.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.park} · {c.country}
                      </span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <input type="hidden" name="coasterId" value={selected?.id ?? ""} />
          <FieldDescription>Start typing; pick from the shared catalogue.</FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field>
            <FieldLabel htmlFor="riddenOn">Date</FieldLabel>
            <Input id="riddenOn" name="riddenOn" type="date" required defaultValue={todayISO()} />
          </Field>
          <Field>
            <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
            <Textarea id="note" name="note" maxLength={280} rows={2} placeholder="Front row, first drop in the rain…" />
          </Field>
        </div>

        {state.error && <FieldError>{state.error}</FieldError>}
      </FieldGroup>

      <div>
        <Button type="submit" disabled={pending || !selected}>
          {pending && <Spinner data-icon="inline-start" />}
          Log ride
        </Button>
      </div>
    </form>
  );
}
