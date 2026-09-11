import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import type { Coaster } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { LogRideDialog } from "@/components/log-ride-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Catalogue" };

// v1 catalogue is ~50 rows: fetch once, filter in memory. A trigram index and
// server-side pagination are the v2 step once the catalogue grows (TDD §10).
function matches(c: Coaster, q: string) {
  const hay = `${c.name} ${c.park} ${c.country} ${c.manufacturer} ${c.type}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export default async function CoastersPage(props: PageProps<"/coasters">) {
  await requireUser();
  const { q: rawQ } = await props.searchParams;
  const q = (typeof rawQ === "string" ? rawQ : "").trim().toLowerCase();

  const supabase = await createClient();
  const { data } = await supabase
    .from("coasters")
    .select("id, name, park, country, manufacturer, type")
    .order("name")
    .returns<Coaster[]>();
  const all = data ?? [];
  const coasters = q ? all.filter((c) => matches(c, q)) : all;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1>
        <p className="text-muted-foreground">
          The shared list every credit is counted against. Missing a coaster? Ask an admin.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {coasters.length} of {all.length} coasters
          </CardTitle>
          <CardDescription>Search by name, park, country, manufacturer or type.</CardDescription>
          <form className="flex max-w-md gap-2 pt-2" role="search">
            <Input name="q" defaultValue={q} placeholder="e.g. Intamin Germany" aria-label="Search the catalogue" />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {coasters.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No coaster matches</EmptyTitle>
                <EmptyDescription>Try fewer words, or ask an admin to add it to the catalogue.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coaster</TableHead>
                  <TableHead className="hidden sm:table-cell">Country</TableHead>
                  <TableHead className="hidden md:table-cell">Manufacturer</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Ride</TableHead>
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
                      <LogRideDialog coaster={{ id: c.id, name: c.name, park: c.park }} />
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
