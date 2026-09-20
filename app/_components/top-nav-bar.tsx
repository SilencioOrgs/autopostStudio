"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/_design-system/icons";
import { Logo } from "@/_components/ui/logo";
import { Button } from "@/_components/ui/button";

export function TopNavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-surface/90 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <Logo href="/" />

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
          <Link
            href="#how-it-works"
            className="text-muted hover:text-foreground transition-colors text-xs font-mono uppercase tracking-wider py-1"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="text-muted hover:text-foreground transition-colors text-xs font-mono uppercase tracking-wider py-1"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-muted hover:text-foreground transition-colors text-xs font-mono uppercase tracking-wider py-1"
          >
            Pricing
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-foreground text-xs font-mono uppercase tracking-wider hover:text-muted transition-colors px-3 py-2 rounded-lg"
          >
            Log in
          </Link>
          <Button href="/get-started" size="md" iconTrailing="arrow_forward">
            Get started
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground hover:bg-surface-raised rounded-lg"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-6 py-6 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-foreground hover:text-muted py-2 border-b border-border"
            >
              How it works
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-foreground hover:text-muted py-2 border-b border-border"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-foreground hover:text-muted py-2 border-b border-border"
            >
              Pricing
            </Link>
          </nav>
          <div className="pt-4 flex flex-col gap-3">
            <Button
              href="/login"
              variant="secondary"
              size="md"
              className="w-full justify-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in
            </Button>
            <Button
              href="/get-started"
              size="md"
              className="w-full justify-center"
              iconTrailing="arrow_forward"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
