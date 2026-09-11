import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import type { Coaster } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { AddCoasterDialog, DeleteCoasterDialog, EditCoasterDialog, MergeCoasterDialog } from "./coaster-dialogs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Admin · Catalogue" };

export default async function AdminCoastersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("coasters")
    .select("id, name, park, country, manufacturer, type")
    .order("name")
    .returns<Coaster[]>();
  const coasters = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Catalogue admin</h1>
          <p className="text-muted-foreground">
            Add, edit and merge coasters. You never see anyone&apos;s ride history here.
          </p>
        </div>
        <AddCoasterDialog />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{coasters.length} coasters</CardTitle>
          <CardDescription>
            Duplicates corrupt credit comparisons. Merge them rather than deleting, so rides move to the
            surviving entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coaster</TableHead>
                <TableHead className="hidden sm:table-cell">Country</TableHead>
                <TableHead className="hidden md:table-cell">Manufacturer</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coasters.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.park}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{c.country}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.manufacturer}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="capitalize">
                      {c.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <EditCoasterDialog coaster={c} />
                      <MergeCoasterDialog coaster={c} candidates={coasters} />
                      <DeleteCoasterDialog coaster={c} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
