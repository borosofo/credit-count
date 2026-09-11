"use client";

import { useActionState, useState } from "react";
import { deleteRide, updateRide, type ActionState } from "@/app/rides/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PencilIcon, Trash2Icon } from "lucide-react";
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

export type RideSummary = {
  id: string;
  ridden_on: string;
  note: string | null;
  coasterName: string;
};

export function EditRideDialog({ ride }: { ride: RideSummary }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateRide(prev, formData);
      if (result.ok) {
        toast.add({ type: "success", title: "Ride updated" });
        setOpen(false);
      }
      return result;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PencilIcon data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit ride</DialogTitle>
          <DialogDescription>{ride.coasterName}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={ride.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-date-${ride.id}`}>Date</FieldLabel>
              <Input id={`edit-date-${ride.id}`} name="riddenOn" type="date" required defaultValue={ride.ridden_on} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-note-${ride.id}`}>Note (optional)</FieldLabel>
              <Textarea id={`edit-note-${ride.id}`} name="note" maxLength={280} rows={3} defaultValue={ride.note ?? ""} />
            </Field>
            {state.error && <FieldError>{state.error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRideDialog({ ride }: { ride: RideSummary }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await deleteRide(prev, formData);
      if (result.ok) {
        toast.add({ type: "success", title: "Ride deleted" });
        setOpen(false);
      }
      return result;
    },
    {},
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this ride?</AlertDialogTitle>
          <AlertDialogDescription>
            {ride.coasterName} on {ride.ridden_on}. If it was your only ride on this coaster, you lose
            the credit. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={ride.id} />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Delete ride
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
