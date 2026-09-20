import { Suspense } from "react";
import { Metadata } from "next";
import { SimpleAuthCard } from "@/_components/auth/simple-auth-card";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create an AutoPost Studio account with email and password.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SimpleAuthCard initialMode="signup" />
    </Suspense>
  );
}
