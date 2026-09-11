import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl items-stretch gap-6 py-4 md:grid-cols-[1fr_minmax(0,22rem)]">
      <AuthPanel />
      <AuthForm mode="signup" />
    </div>
  );
}
