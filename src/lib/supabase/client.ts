import { createBrowserClient } from "@supabase/ssr";

// Browser client for Client Components. Only the publishable key is used; it is
// designed to be public and Row Level Security is what protects the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
