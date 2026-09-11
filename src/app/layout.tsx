import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Credit Count", template: "%s · Credit Count" },
  description:
    "A credit tracker for rollercoaster enthusiasts: log your rides, see your stats, compare on the leaderboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Toaster>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
          <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
            Credit Count · a fictional v1 built for the Koin Limited candidate task
          </footer>
        </Toaster>
      </body>
    </html>
  );
}
