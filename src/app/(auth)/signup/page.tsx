import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <AuthForm mode="signup" />
    </div>
  );
}
