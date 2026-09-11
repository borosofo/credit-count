import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { getProfile, getSessionUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLink =
  "rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export async function SiteHeader() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;

  return (
    <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-heading text-lg uppercase tracking-wider">
          Credit Count
        </Link>

        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm">
          <Link href="/" className={navLink}>
            Leaderboard
          </Link>
          {user && (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              <Link href="/rides" className={navLink}>
                My rides
              </Link>
              <Link href="/coasters" className={navLink}>
                Catalogue
              </Link>
              <Link href="/settings" className={navLink}>
                Settings
              </Link>
              {profile?.role === "admin" && (
                <Link href="/admin/coasters" className={cn(navLink, "font-semibold")}>
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
                {profile?.display_name ?? user.email}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Sign in
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "btn-glow")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
