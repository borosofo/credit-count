import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
