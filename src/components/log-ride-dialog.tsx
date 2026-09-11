"use client";

import { useActionState, useState } from "react";
import { logRide, type ActionState } from "@/app/rides/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";

type Props = { coaster: { id: string; name: string; park: string } };

/** "Log ride" from the catalogue: the coaster is already chosen, so date + save. */
export function LogRideDialog({ coaster }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await logRide(prev, formData);
      if (result.ok) {
        toast.add(
          result.newCredit
            ? { type: "success", title: "New credit unlocked", description: `${coaster.name} joins your count.` }
            : { type: "success", title: "Another lap logged", description: `${coaster.name} again. Rides up, credits unchanged.` },
        );
        setOpen(false);
      }
      return result;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Log ride</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a ride on {coaster.name}</DialogTitle>
          <DialogDescription>{coaster.park}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="coasterId" value={coaster.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`riddenOn-${coaster.id}`}>Date</FieldLabel>
              <Input id={`riddenOn-${coaster.id}`} name="riddenOn" type="date" required defaultValue={todayISO()} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`note-${coaster.id}`}>Note (optional)</FieldLabel>
              <Textarea id={`note-${coaster.id}`} name="note" maxLength={280} rows={2} />
            </Field>
            {state.error && <FieldError>{state.error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Log ride
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
