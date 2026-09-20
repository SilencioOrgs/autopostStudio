export interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface ComparisonFeature {
  name: string;
  starter: boolean | string;
  studio: boolean | string;
  scale: boolean | string;
}

export interface ComparisonCategory {
  category: string;
  features: ComparisonFeature[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    priceAnnual: 15,
    description: "For solo creators and individual brand builders establishing a consistent social presence.",
    features: [
      "1 Facebook Page connected",
      "Up to 60 image generations / month",
      "Manual batch CSV prompt import",
      "Standard approval review gate",
      "7-day visual calendar view",
      "Community support",
    ],
    ctaLabel: "Start with Starter",
    ctaHref: "/get-started",
  },
  {
    id: "studio",
    name: "Studio",
    popular: true,
    badge: "MOST POPULAR",
    priceMonthly: 49,
    priceAnnual: 39,
    description: "For digital agencies and active publishers running multi-slot automated content pipelines.",
    features: [
      "3 Facebook Pages connected",
      "Up to 300 image generations / month",
      "Google Sheets live sync & bulk import",
      "Side-by-side human approval gate",
      "30-day visual drag-free scheduler",
      "Bring Your Own AI Key (Gemini / OpenAI)",
      "Priority generation queue",
      "Direct email support",
    ],
    ctaLabel: "Start 14-day trial",
    ctaHref: "/get-started",
  },
  {
    id: "scale",
    name: "Scale",
    priceMonthly: 99,
    priceAnnual: 79,
    description: "For high-volume media teams requiring multi-brand management and higher generation quotas.",
    features: [
      "10 Facebook Pages connected",
      "Unlimited batch rendering (BYO key)",
      "Automated fallback retry engine",
      "Team review permissions & roles",
      "Quarterly calendar scheduling",
      "Custom aspect ratios (4:5, 1:1, 16:9)",
      "Early access to TikTok & Instagram beta",
      "Dedicated account engineer",
    ],
    ctaLabel: "Upgrade to Scale",
    ctaHref: "/get-started",
  },
];

export const COMPARISON_TABLE: ComparisonCategory[] = [
  {
    category: "Pipeline & Volume",
    features: [
      { name: "Monthly generations", starter: "60 / mo", studio: "300 / mo", scale: "Unlimited (BYO)" },
      { name: "Connected Pages", starter: "1 Page", studio: "3 Pages", scale: "10 Pages" },
      { name: "CSV / Sheets import", starter: "CSV only", studio: "CSV + Google Sheets", scale: "Sheets + API Webhook" },
      { name: "Batch rendering concurrency", starter: "1 post at a time", studio: "3 concurrent", scale: "10 concurrent" },
    ],
  },
  {
    category: "Review & Quality",
    features: [
      { name: "Human approval gate", starter: true, studio: true, scale: true },
      { name: "Inline caption & hashtag editor", starter: true, studio: true, scale: true },
      { name: "Custom aspect ratios (4:5, 1:1, 16:9)", starter: "4:5 only", studio: true, scale: true },
      { name: "AI prompt enhancement", starter: false, studio: true, scale: true },
    ],
  },
  {
    category: "Scheduling & Delivery",
    features: [
      { name: "Visual calendar planner", starter: "7 days", studio: "30 days", scale: "90 days" },
      { name: "Automatic retry on failure", starter: false, studio: true, scale: true },
      { name: "Best-time posting recommendations", starter: false, studio: true, scale: true },
      { name: "Multi-platform beta access", starter: false, studio: "Instagram queue", scale: "Full beta suite" },
    ],
  },
  {
    category: "API & Infrastructure",
    features: [
      { name: "Bring Your Own AI Key", starter: false, studio: true, scale: true },
      { name: "Zero markup on generation", starter: false, studio: true, scale: true },
      { name: "Dedicated rate limit bucket", starter: false, studio: false, scale: true },
      { name: "SLA uptime guarantee", starter: false, studio: "99.5%", scale: "99.9%" },
    ],
  },
];
