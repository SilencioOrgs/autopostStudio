import React from "react";
import Link from "next/link";
import { getCurrentYear } from "@/_lib/dates";
import { Logo } from "@/_components/ui/logo";

export function Footer() {
  const year = getCurrentYear();

  return (
    <footer className="border-t border-border bg-surface mt-auto py-8">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <Logo href="/" size="sm" />
        <div className="text-body-sm text-muted text-center md:text-left font-mono text-xs">
          © {year} AutoPost Studio. Engineered for autonomous content delivery.
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <Link
            href="/legal/privacy"
            className="text-muted hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/legal/terms"
            className="text-muted hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
