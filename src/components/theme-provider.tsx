"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** System preference by default; the header toggle pins light or dark and remembers it. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
