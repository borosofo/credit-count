import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <div className="mx-auto grid w-full max-w-3xl items-stretch gap-6 py-4 md:grid-cols-[1fr_minmax(0,22rem)]">
      <AuthPanel />
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
