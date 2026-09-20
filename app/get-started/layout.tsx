import React from "react";
import { OnboardingHeader } from "@/_components/onboarding-header";
import { ToastProvider } from "@/_components/ui/toast";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="bg-background min-h-dvh text-foreground flex flex-col justify-between antialiased selection:bg-foreground selection:text-background">
        <OnboardingHeader />
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
