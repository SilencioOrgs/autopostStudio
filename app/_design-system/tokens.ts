/**
 * AutoPost Studio — Design System Tokens
 * Monochrome Engineering — Engineered, Restrained, High-Contrast
 */

export type StatusVariant =
  | "generate"
  | "ready"
  | "schedule"
  | "warn"
  | "error"
  | "neutral";

export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly href: string;
  readonly badge: string | null;
  readonly badgeVariant?: StatusVariant | null;
}

export const navItems: readonly NavItem[] = [
  { label: "Dashboard", icon: "space_dashboard", href: "/dashboard", badge: null, badgeVariant: null },
  { label: "Prompt library", icon: "collections_bookmark", href: "/dashboard/prompts", badge: "150", badgeVariant: null },
  { label: "Queue", icon: "hourglass_top", href: "/dashboard/queue", badge: "12", badgeVariant: "warn" },
  { label: "Review", icon: "fact_check", href: "/dashboard/review", badge: "8", badgeVariant: "ready" },
  { label: "Schedule", icon: "calendar_month", href: "/dashboard/schedule", badge: "14", badgeVariant: "schedule" },
  { label: "Posts", icon: "send", href: "/dashboard/posts", badge: "63", badgeVariant: null },
  { label: "Settings", icon: "settings", href: "/dashboard/settings", badge: null, badgeVariant: null },
] as const;

export interface PlatformConfig {
  readonly id: string;
  readonly name: string;
  readonly status: "live" | "coming_soon";
  readonly description: string;
}

export const platforms: readonly PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook Pages",
    status: "live",
    description: "Publish photo posts, carousels, and captions directly to your Facebook Page feed.",
  },
  {
    id: "instagram",
    name: "Instagram",
    status: "coming_soon",
    description: "Automate feed posts, stories, and carousel graphics on schedule.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    status: "coming_soon",
    description: "Automated photo carousels and slideshow video rendering.",
  },
  {
    id: "x",
    name: "X (Twitter)",
    status: "coming_soon",
    description: "Scheduled image attachments and multi-post threads.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    status: "coming_soon",
    description: "Company page and creator post scheduling with image carousels.",
  },
] as const;
