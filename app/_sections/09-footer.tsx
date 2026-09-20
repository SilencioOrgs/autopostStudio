import React from "react";
import Link from "next/link";
import { Logo } from "@/_components/ui/logo";
import { ThemeToggle } from "@/_components/ui/theme-toggle";

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-surface py-16 text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-border">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <Logo href="/" size="md" />
            <p className="text-body-sm text-muted max-w-sm leading-relaxed">
              AutoPost Studio is the autonomous content pipeline for digital publishers, creator brands, and agencies.
            </p>
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-strong border border-border rounded-xs text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full status-dot-ready" />
              <span className="text-muted">ALL PIPELINE NODES OPERATIONAL</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground font-semibold">
              Product
            </h4>
            <ul className="space-y-2 text-body-sm text-muted">
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  Pipeline
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-foreground transition-colors">
                  Interactive Demo
                </a>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-foreground transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions & Resources */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground font-semibold">
              Resources
            </h4>
            <ul className="space-y-2 text-body-sm text-muted">
              <li>
                <Link href="/features" className="hover:text-foreground transition-colors">
                  Batch Prompt Templates
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Documentation &amp; FAQ
                </a>
              </li>
              <li>
                <Link href="/get-started" className="hover:text-foreground transition-colors">
                  Onboarding Guide
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Creator Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links & Theme Toggle */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground font-semibold">
              Legal &amp; System
            </h4>
            <ul className="space-y-2 text-body-sm text-muted">
              <li>
                <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-[11px] font-mono text-muted">
                  Meta Graph API v20.0 Compliant
                </span>
              </li>
            </ul>

            <div className="pt-2">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted">
          <p>© {new Date().getFullYear()} AutoPost Studio. All rights reserved.</p>
          <p>Engineered for creators with high standards.</p>
        </div>
      </div>
    </footer>
  );
}
