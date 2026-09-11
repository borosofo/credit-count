import type { Metadata } from "next";
import { Chakra_Petch, Russo_One } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";

// Russo One for the numbers and headings only; Chakra Petch carries the text.
const display = Russo_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Chakra_Petch({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: { default: "Credit Count", template: "%s · Credit Count" },
  description:
    "A credit tracker for rollercoaster enthusiasts: log your rides, see your stats, compare on the leaderboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html> before paint.
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <Toaster>
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
            <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
              Credit Count · a fictional v1 built for the Koin Limited candidate task
            </footer>
          </Toaster>
        </ThemeProvider>
      </body>
    </html>
  );
}
