/**
 * AutoPost Studio — Design System Tokens
 * Monochrome Engineering — Engineered, Restrained, High-Contrast
 */

export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly href: string;
}

export const navItems: readonly NavItem[] = [
  { label: "Dashboard", icon: "space_dashboard", href: "/dashboard" },
  { label: "Prompt library", icon: "collections_bookmark", href: "/dashboard/prompts" },
  { label: "Queue", icon: "hourglass_top", href: "/dashboard/queue" },
  { label: "Review", icon: "fact_check", href: "/dashboard/review" },
  { label: "Schedule", icon: "calendar_month", href: "/dashboard/schedule" },
  { label: "Posts", icon: "send", href: "/dashboard/posts" },
  { label: "Settings", icon: "settings", href: "/dashboard/settings" },
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
