import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import type { RideWithCoaster } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { DeleteRideDialog, EditRideDialog } from "./ride-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "My rides" };

export default async function RidesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("rides")
    .select("id, coaster_id, ridden_on, note, coaster:coasters(id, name, park, country, manufacturer, type)")
    .eq("user_id", user.id)
    .order("ridden_on", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<RideWithCoaster[]>();
  const rides = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">My rides</h1>
        <p className="text-muted-foreground">
          Every ride you have logged, newest first. Only you can see this list.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{rides.length} {rides.length === 1 ? "ride" : "rides"}</CardTitle>
          <CardDescription>Edit the date or note, or delete a ride you logged by mistake.</CardDescription>
        </CardHeader>
        <CardContent>
          {rides.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No rides yet</EmptyTitle>
                <EmptyDescription>Log your first ride from the dashboard.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/dashboard" className={buttonVariants()}>
                  Go to dashboard
                </Link>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coaster</TableHead>
                  <TableHead className="hidden md:table-cell">Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDate(ride.ridden_on)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{ride.coaster.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {ride.coaster.park} · {ride.coaster.country}
                        </span>
                        {ride.note && (
                          <span className="mt-1 text-xs text-muted-foreground md:hidden">{ride.note}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs md:table-cell">
                      <span className="line-clamp-2 text-muted-foreground">{ride.note ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EditRideDialog
                          ride={{ id: ride.id, ridden_on: ride.ridden_on, note: ride.note, coasterName: ride.coaster.name }}
                        />
                        <DeleteRideDialog
                          ride={{ id: ride.id, ridden_on: ride.ridden_on, note: ride.note, coasterName: ride.coaster.name }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
