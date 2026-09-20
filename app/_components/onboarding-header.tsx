import React from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Logo } from "@/_components/ui/logo";
import { ThemeToggle } from "@/_components/ui/theme-toggle";

export function OnboardingHeader() {
  return (
    <header className="w-full bg-surface border-b border-border sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo href="/" size="sm" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/#faq"
            className="text-body-sm font-mono text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <span>Need help</span>
            <HelpCircle size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
