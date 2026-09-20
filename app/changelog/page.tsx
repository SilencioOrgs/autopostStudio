import type { Metadata } from "next";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { FooterSection } from "@/_sections/09-footer";
import { SectionHeader } from "@/_components/ui/section-header";
import { CHANGELOG_RELEASES } from "@/_data/changelog";
import { ToastProvider } from "@/_components/ui/toast";
import { CommandPalette } from "@/_components/ui/command-palette";

export const metadata: Metadata = {
  title: "Changelog & Release Notes",
  description: "Product updates, feature releases, and engineering improvements to AutoPost Studio.",
};

export default function ChangelogPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        <CommandPalette />
        <StickyNav />

        <main className="flex-1 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16">
            <SectionHeader
              counter="RELEASES"
              eyebrow="VERSION HISTORY"
              title="Changelog & Updates"
              description="Chronological record of new capabilities, infrastructure improvements, and bug fixes."
            />

            <div className="space-y-12">
              {CHANGELOG_RELEASES.map((release) => (
                <article
                  key={release.version}
                  className="p-8 border border-border bg-surface rounded-xs space-y-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-foreground">
                        {release.version}
                      </span>
                      {release.badge && (
                        <span className="code-pill text-[10px] bg-accent-ready/15 text-accent-ready border-accent-ready/30">
                          {release.badge}
                        </span>
                      )}
                    </div>
                    <time className="font-mono text-xs text-muted">
                      {release.date}
                    </time>
                  </div>

                  <div>
                    <h3 className="font-display font-semibold text-xl text-foreground mb-2">
                      {release.title}
                    </h3>
                    <p className="text-body-md text-muted leading-relaxed">
                      {release.description}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <h4 className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
                      Changes in this release:
                    </h4>
                    <ul className="space-y-2 text-body-sm text-foreground">
                      {release.changes.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-xs uppercase tracking-wider font-semibold shrink-0 mt-0.5 ${
                              change.type === "NEW"
                                ? "bg-accent-ready/15 text-accent-ready border border-accent-ready/30"
                                : change.type === "IMPROVED"
                                ? "bg-accent-schedule/15 text-accent-schedule border border-accent-schedule/30"
                                : "bg-surface-strong text-muted border border-border"
                            }`}
                          >
                            {change.type}
                          </span>
                          <span className="leading-snug">{change.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>

        <FooterSection />
      </div>
    </ToastProvider>
  );
}
