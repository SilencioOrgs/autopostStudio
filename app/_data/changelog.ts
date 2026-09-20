export interface ChangelogRelease {
  version: string;
  date: string;
  badge?: string;
  title: string;
  description: string;
  changes: {
    type: "NEW" | "IMPROVED" | "FIX";
    text: string;
  }[];
}

export const CHANGELOG_RELEASES: ChangelogRelease[] = [
  {
    version: "v2.1.0",
    date: "2026-09-18",
    badge: "LATEST",
    title: "Monochrome Engineering UI & Meta Graph API v20.0",
    description: "Complete frontend platform overhaul, dark mode support, and direct BYO key model.",
    changes: [
      { type: "NEW", text: "Brand new high-contrast editorial Monochrome Engineering design system." },
      { type: "NEW", text: "Bring Your Own Key integration for Google AI Studio (Gemini / Imagen 3) and OpenAI." },
      { type: "NEW", text: "Global command palette (⌘K / Ctrl+K) for instant route jumping and pipeline control." },
      { type: "IMPROVED", text: "Visual scheduler now features recurring time slot allocation with conflict avoidance." },
      { type: "IMPROVED", text: "Side-by-side human approval gate with live markdown and caption editing." },
      { type: "FIX", text: "Eliminated layout shift on custom font swaps using next/font optimization." },
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-08-30",
    title: "Batch Prompt Pipeline & Automated Review Gate",
    description: "Transitioned from single-post manual scheduling to autonomous multi-item prompt spreadsheet pipelines.",
    changes: [
      { type: "NEW", text: "Bulk prompt spreadsheet ingestion (CSV and Google Sheets sync)." },
      { type: "NEW", text: "Interactive review card deck with swipe-like approve/reject controls." },
      { type: "IMPROVED", text: "Real-time background worker queue with concurrency tuning." },
      { type: "FIX", text: "Enhanced token refresh handling for connected Facebook Pages." },
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-07-15",
    title: "Facebook Pages Direct Publishing",
    description: "Native integration with Meta Facebook Graph API for direct feed photo publishing.",
    changes: [
      { type: "NEW", text: "Direct OAuth Facebook Page connection sequence." },
      { type: "NEW", text: "Automated schedule queue for time-slot delivery." },
      { type: "IMPROVED", text: "Support for custom 4:5 vertical portrait and 1:1 square media formats." },
    ],
  },
];
