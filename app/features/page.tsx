import type { Metadata } from "next";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { FooterSection } from "@/_sections/09-footer";
import { SectionHeader } from "@/_components/ui/section-header";
import { Button } from "@/_components/ui/button";
import { ToastProvider } from "@/_components/ui/toast";
import { CommandPalette } from "@/_components/ui/command-palette";
import {
  FileSpreadsheet,
  Sparkles,
  CheckSquare,
  Calendar,
  Key,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Platform Capabilities & Features",
  description: "Explore the technical capabilities powering the AutoPost Studio autonomous content automation pipeline.",
};

const DETAILED_FEATURES = [
  {
    id: "bulk-import",
    icon: <FileSpreadsheet size={24} className="text-foreground" />,
    tag: "CAPABILITY 01",
    title: "Structured Prompt Spreadsheet Ingestion",
    description:
      "Eliminate repetitive prompt-pasting. Import your spreadsheet with columns for style, visual prompt, caption, and hashtags. AutoPost Studio validates formatting client-side and enqueues up to 300 rows instantly.",
    highlights: [
      "Compatible with CSV and live Google Sheets export",
      "Automatic hashtag extraction and character limit validation",
      "Per-row aspect ratio selection (4:5, 1:1, 16:9)",
      "Instant duplicate prompt detection",
    ],
  },
  {
    id: "batch-queue",
    icon: <Sparkles size={24} className="text-accent-generate" />,
    tag: "CAPABILITY 02",
    title: "Concurrent Background Rendering Queue",
    description:
      "Our generation engine manages concurrent background workers against direct AI provider endpoints. Keep working while your assets render with live progress percentage indicators.",
    highlights: [
      "Direct connection to Google AI Studio (Imagen 3 / Gemini 2.5)",
      "Zero middleman markup on image generation costs (~$0.03/image)",
      "Automated retry backoff for rate-limited requests",
      "Per-batch estimated time to completion",
    ],
  },
  {
    id: "approval-gate",
    icon: <CheckSquare size={24} className="text-accent-ready" />,
    tag: "CAPABILITY 03",
    title: "Human-in-the-Loop Approval Gate",
    description:
      "Autonomous efficiency with zero loss of creative control. Every generated graphic and caption is held in a review gate where you can edit copy, tweak hashtags, and approve with a single keypress.",
    highlights: [
      "Side-by-side feed-accurate Facebook post preview",
      "Inline markdown editor for captions and calls-to-action",
      "Swipe-like keyboard shortcuts (ArrowLeft: Reject, ArrowRight: Approve)",
      "One-click prompt retry for imperfect drafts",
    ],
  },
  {
    id: "visual-scheduler",
    icon: <Calendar size={24} className="text-accent-schedule" />,
    tag: "CAPABILITY 04",
    title: "Visual Drag-Free Scheduling Engine",
    description:
      "Calendar planning engineered for consistency. Allocate daily posting time slots, monitor monthly publishing volume, and synchronize directly with Facebook Page feeds.",
    highlights: [
      "Multi-timezone awareness with localized scheduling hints",
      "Automatic slot filling from approved review deck",
      "Live publication status tracking (posted, scheduled, retrying)",
      "Direct Facebook Page Graph API delivery",
    ],
  },
  {
    id: "byo-key",
    icon: <Key size={24} className="text-foreground" />,
    tag: "CAPABILITY 05",
    title: "Bring Your Own Key (BYO Model)",
    description:
      "Never pay inflated platform credit markups. Store your own Google AI Studio or OpenAI API key securely in your workspace session to access model endpoints at wholesale provider pricing.",
    highlights: [
      "Client-side encrypted key storage with masked display",
      "Pay actual provider rates with 0% SaaS tax on compute",
      "Instant API key testing with interactive verification modal",
      "Supports Gemini 2.5 Flash, Imagen 3, and DALL-E 3",
    ],
  },
  {
    id: "meta-api",
    icon: <ShieldCheck size={24} className="text-accent-ready" />,
    tag: "CAPABILITY 06",
    title: "Verified Meta Facebook Graph API Integration",
    description:
      "Direct, reliable publishing built on official Meta Graph API v20.0 endpoints. Schedule photos, multi-image carousel sets, and formatted captions to Pages you manage.",
    highlights: [
      "Zero third-party scraping or unofficial browser automation",
      "Secure OAuth 2.0 permission scoping",
      "Automatic token health check and expiration alerts",
      "Full compliance with Facebook Platform Developer Policies",
    ],
  },
];

export function FeaturesPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        <CommandPalette />
        <StickyNav />

        <main className="flex-1 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20">
            {/* Header */}
            <SectionHeader
              counter="CAPABILITIES"
              eyebrow="ENGINEERING & FEATURES"
              title="Built for autonomous content engineering"
              description="A systematic breakdown of the six core systems powering the AutoPost Studio pipeline."
            />

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {DETAILED_FEATURES.map((feat) => (
                <div
                  key={feat.id}
                  id={feat.id}
                  className="p-8 border border-border bg-surface rounded-xs space-y-6 flex flex-col justify-between hover:border-border-strong transition-all shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xs border border-border bg-surface-strong flex items-center justify-center">
                        {feat.icon}
                      </div>
                      <span className="font-mono text-[10px] text-muted tracking-widest uppercase font-semibold">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="font-display font-semibold text-xl text-foreground">
                      {feat.title}
                    </h3>

                    <p className="text-body-sm text-muted leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border space-y-2">
                    <span className="text-[11px] font-mono text-muted uppercase tracking-wider block font-semibold">
                      Highlights:
                    </span>
                    <ul className="space-y-1.5 text-xs text-foreground">
                      {feat.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted mt-0.5">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Call to Action */}
            <div className="p-10 border border-border bg-surface-strong rounded-xs text-center space-y-6">
              <h3 className="text-display-lg font-bold text-foreground">
                Ready to deploy your content pipeline?
              </h3>
              <p className="text-body-md text-muted max-w-xl mx-auto">
                Set up your first automated Facebook Page schedule in under 10 minutes with zero credit card required.
              </p>
              <div className="pt-2 flex justify-center gap-4">
                <Button href="/get-started" size="lg" variant="primary">
                  <span>Get started free</span>
                  <ArrowRight size={16} />
                </Button>
                <Button href="/pricing" size="lg" variant="outline">
                  <span>View pricing tiers</span>
                </Button>
              </div>
            </div>
          </div>
        </main>

        <FooterSection />
      </div>
    </ToastProvider>
  );
}

export default FeaturesPage;
