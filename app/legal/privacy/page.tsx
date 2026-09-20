import type { Metadata } from "next";
import Link from "next/link";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { FooterSection } from "@/_sections/09-footer";
import { ToastProvider } from "@/_components/ui/toast";
import { CommandPalette } from "@/_components/ui/command-palette";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "AutoPost Studio Privacy Policy and data processing terms.",
};

export default function PrivacyPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        <CommandPalette />
        <StickyNav />

        <main className="flex-1 py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full">
          {/* Legal Draft Notice Alert */}
          <div className="p-4 border border-accent-warn/40 bg-accent-warn/10 text-accent-warn rounded-xs text-xs font-mono mb-8 select-none">
            <strong>NOTICE // DRAFT — NOT LEGAL ADVICE:</strong> This document represents product privacy mechanics in mock development mode. Consult qualified legal counsel before production Meta App Review submission.
          </div>

          <div className="space-y-4 pb-8 border-b border-border">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">
              LEGAL // POLICIES
            </span>
            <h1 className="text-display-lg font-bold text-foreground">
              Privacy Policy
            </h1>
            <p className="text-body-sm text-muted font-mono">
              Last updated: September 18, 2026 · Version 2.1
            </p>
          </div>

          <div className="py-8 space-y-8 text-body-md text-foreground/90 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                1. Data Infrastructure &amp; Local Execution
              </h2>
              <p className="text-muted">
                AutoPost Studio operates strictly as an automation pipeline interface. When running in offline or mock mode, all generation parameters, test prompts, and mock keys remain localized to your client browser session and are never transmitted to unauthorized third-party logging servers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                2. Meta Facebook Graph API Integration
              </h2>
              <p className="text-muted">
                When connecting your Facebook Page, permissions (`pages_manage_posts`, `pages_read_engagement`) are requested solely to publish approved media, captions, and scheduling slots to Pages you administer. We do not inspect personal feeds, private messenger communications, or profile data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                3. AI Provider Keys &amp; Storage
              </h2>
              <p className="text-muted">
                Under the Bring Your Own Key (BYO) model, API keys provided for Google AI Studio (Imagen 3 / Gemini) or OpenAI are stored client-side in encrypted session storage. Full secret keys are never retained on our servers in plaintext. Calls to model generation endpoints occur with direct authorization headers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                4. Content Ownership &amp; Licensing
              </h2>
              <p className="text-muted">
                All prompt spreadsheets, generated visual media, and published captions remain the exclusive intellectual property of the account creator. AutoPost Studio asserts no ownership claims, distribution rights, or licensing royalties over your generated content.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-headline-sm font-semibold text-foreground">
                5. Contact &amp; Inquiries
              </h2>
              <p className="text-muted">
                For security inquiries, data removal requests, or developer policy compliance questions, contact our engineering team at{" "}
                <span className="font-mono text-foreground">security@autopost.studio</span>.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-border flex items-center justify-between text-xs font-mono text-muted">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Return to Home
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Terms of Service →
            </Link>
          </div>
        </main>

        <FooterSection />
      </div>
    </ToastProvider>
  );
}
