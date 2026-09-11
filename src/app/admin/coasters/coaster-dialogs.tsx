"use client";

import { useActionState, useState } from "react";
import { createCoaster, deleteCoaster, mergeCoaster, updateCoaster } from "./actions";
import type { ActionState } from "@/app/rides/actions";
import type { Coaster } from "@/lib/stats";
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
import { GitMergeIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

const TYPES = { steel: "Steel", wooden: "Wooden", hybrid: "Hybrid" } as const;

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Shared hook: run the server action, toast and close the dialog on success. */
function useDialogAction(action: Action, successTitle: string) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        toast.add({ type: "success", title: successTitle });
        setOpen(false);
      }
      return result;
    },
    {},
  );
  return { open, setOpen, state, formAction, pending };
}

function CoasterFields({ coaster, idPrefix }: { coaster?: Coaster; idPrefix: string }) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>Name</FieldLabel>
        <Input id={`${idPrefix}-name`} name="name" required maxLength={120} defaultValue={coaster?.name} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-park`}>Park</FieldLabel>
        <Input id={`${idPrefix}-park`} name="park" required maxLength={120} defaultValue={coaster?.park} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
          <Input id={`${idPrefix}-country`} name="country" required maxLength={80} defaultValue={coaster?.country} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-manufacturer`}>Manufacturer</FieldLabel>
          <Input
            id={`${idPrefix}-manufacturer`}
            name="manufacturer"
            required
            maxLength={80}
            defaultValue={coaster?.manufacturer}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-type`}>Type</FieldLabel>
        <Select name="type" items={TYPES} defaultValue={coaster?.type ?? "steel"}>
          <SelectTrigger id={`${idPrefix}-type`} className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.entries(TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}

export function AddCoasterDialog() {
  const { open, setOpen, state, formAction, pending } = useDialogAction(createCoaster, "Coaster added");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="btn-glow" />}>
        <PlusIcon data-icon="inline-start" />
        Add coaster
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a coaster</DialogTitle>
          <DialogDescription>Check the catalogue first so we do not create a duplicate.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <CoasterFields idPrefix="add" />
          {state.error && <FieldError>{state.error}</FieldError>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Add coaster
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCoasterDialog({ coaster }: { coaster: Coaster }) {
  const { open, setOpen, state, formAction, pending } = useDialogAction(updateCoaster, "Coaster updated");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PencilIcon data-icon="inline-start" />
        Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit coaster</DialogTitle>
          <DialogDescription>Changes apply to every user&apos;s credits at once.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={coaster.id} />
          <CoasterFields coaster={coaster} idPrefix={`edit-${coaster.id}`} />
          {state.error && <FieldError>{state.error}</FieldError>}
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

export function MergeCoasterDialog({ coaster, candidates }: { coaster: Coaster; candidates: Coaster[] }) {
  const { open, setOpen, state, formAction, pending } = useDialogAction(mergeCoaster, "Coasters merged");
  const [target, setTarget] = useState<Coaster | null>(null);
  const options = candidates.filter((c) => c.id !== coaster.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <GitMergeIcon data-icon="inline-start" />
        Merge
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge &ldquo;{coaster.name}&rdquo; into another coaster</DialogTitle>
          <DialogDescription>
            Use this to remove a duplicate. Every ride logged on this entry is moved to the coaster you
            keep, so nobody loses credits. This entry is then deleted.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="fromId" value={coaster.id} />
          <input type="hidden" name="intoId" value={target?.id ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`merge-${coaster.id}`}>Keep this coaster</FieldLabel>
              <Combobox
                items={options}
                value={target}
                onValueChange={(value) => setTarget(value)}
                itemToStringLabel={(c) => `${c.name} (${c.park})`}
                autoHighlight
              >
                <ComboboxInput id={`merge-${coaster.id}`} placeholder="Search by name…" showClear className="w-full" />
                <ComboboxContent>
                  <ComboboxEmpty>No coaster matches.</ComboboxEmpty>
                  <ComboboxList>
                    {(c) => (
                      <ComboboxItem key={c.id} value={c}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{c.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {c.park} · {c.manufacturer}
                          </span>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription>The entry you keep should be the correctly spelled one.</FieldDescription>
            </Field>
            {state.error && <FieldError>{state.error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || !target}>
              {pending && <Spinner data-icon="inline-start" />}
              Merge and delete duplicate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCoasterDialog({ coaster }: { coaster: Coaster }) {
  const { open, setOpen, state, formAction, pending } = useDialogAction(deleteCoaster, "Coaster deleted");
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{coaster.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Only possible when nobody has logged a ride on it. If someone has, use Merge instead so their
            credits are preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={coaster.id} />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Delete coaster
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
