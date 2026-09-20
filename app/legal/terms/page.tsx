import type { Metadata } from "next";
import Link from "next/link";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { FooterSection } from "@/_sections/09-footer";
import { ToastProvider } from "@/_components/ui/toast";
import { CommandPalette } from "@/_components/ui/command-palette";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "AutoPost Studio Terms of Service and acceptable use policies.",
};

export default function TermsPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        <CommandPalette />
        <StickyNav />

        <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full">
          {/* Legal Draft Notice Alert */}
          <div className="p-4 border border-accent-warn/40 bg-accent-warn/10 text-accent-warn rounded-xs text-xs font-mono mb-8 select-none">
            <strong>NOTICE // DRAFT — NOT LEGAL ADVICE:</strong> This terms agreement represents software operational guidelines. Commercial deployments should consult legal counsel to align with local regulatory frameworks.
          </div>

          <div className="space-y-4 pb-8 border-b border-border">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              LEGAL // POLICIES
            </span>
            <h1 className="text-display-lg font-bold text-foreground">
              Terms of Service
            </h1>
            <p className="text-body-sm text-muted font-mono">
              Last updated: September 18, 2026 · Version 2.1
            </p>
          </div>

          <div className="py-8 space-y-8 text-body-md text-foreground/90 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                1. Service Description
              </h2>
              <p className="text-muted">
                AutoPost Studio provides social media content workflow software enabling creators to import prompts, generate media via third-party AI APIs, review drafts, and schedule publications to supported platform endpoints.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                2. Acceptable Use Policy
              </h2>
              <p className="text-muted">
                You agree not to use the automated pipeline to generate, schedule, or publish defamatory, deceptive, unlawful, or sexually explicit content. All prompts and outputs must comply with Meta Platform Policies and Google Generative AI Prohibited Use Policies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                3. API Keys &amp; Account Responsibility
              </h2>
              <p className="text-muted">
                You are solely responsible for maintaining the confidentiality of any third-party API keys entered into the software and for all billable usage incurred on your personal AI provider accounts (Google Cloud / OpenAI).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                4. Disclaimer of Warranties
              </h2>
              <p className="text-muted">
                AutoPost Studio is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind. We do not guarantee uninterrupted social network connectivity or algorithm distribution outcomes on third-party platforms.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-border flex items-center justify-between text-xs font-mono text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Return to Home
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy →
            </Link>
          </div>
        </main>

        <FooterSection />
      </div>
    </ToastProvider>
  );
}
