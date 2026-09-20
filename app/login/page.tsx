import { Suspense } from "react";
import { Metadata } from "next";
import { SimpleAuthCard } from "@/_components/auth/simple-auth-card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to AutoPost Studio using email and password.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SimpleAuthCard initialMode="signin" />
    </Suspense>
  );
}
