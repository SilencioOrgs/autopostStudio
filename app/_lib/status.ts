export type PromptStatus =
  | "unused"
  | "draft"
  | "queued"
  | "generating"
  | "ready"
  | "approved"
  | "scheduled"
  | "posted"
  | "failed";

export type ExtendedStatus =
  | PromptStatus
  | "running"
  | "succeeded"
  | "cancelled"
  | "available"
  | "coming-soon"
  | "connected";

export interface StatusConfig {
  dotClass: string;
  bg: string;
  text: string;
  label: string;
}

export const STATUS_CONFIG: Record<ExtendedStatus, StatusConfig> = {
  draft: {
    dotClass: "status-dot-neutral",
    bg: "bg-surface-strong border border-border",
    text: "text-muted",
    label: "Draft",
  },
  running: {
    dotClass: "status-dot-generate",
    bg: "bg-accent-generate/10 border border-accent-generate/30",
    text: "text-accent-generate",
    label: "Running",
  },
  succeeded: {
    dotClass: "status-dot-ready",
    bg: "bg-accent-ready/10 border border-accent-ready/30",
    text: "text-accent-ready",
    label: "Completed",
  },
  cancelled: {
    dotClass: "status-dot-neutral",
    bg: "bg-surface-strong border border-border",
    text: "text-muted",
    label: "Cancelled",
  },
  unused: {
    dotClass: "status-dot-neutral",
    bg: "bg-surface-strong border border-border",
    text: "text-muted",
    label: "Draft",
  },
  queued: {
    dotClass: "status-dot-warn",
    bg: "bg-surface-strong border border-border",
    text: "text-foreground",
    label: "Queued",
  },
  generating: {
    dotClass: "status-dot-generate",
    bg: "bg-accent-generate/10 border border-accent-generate/30",
    text: "text-accent-generate",
    label: "Generating",
  },
  ready: {
    dotClass: "status-dot-ready",
    bg: "bg-accent-ready/10 border border-accent-ready/30",
    text: "text-accent-ready",
    label: "Ready",
  },
  approved: {
    dotClass: "status-dot-ready",
    bg: "bg-accent-ready/10 border border-accent-ready/30",
    text: "text-accent-ready",
    label: "Approved",
  },
  scheduled: {
    dotClass: "status-dot-schedule",
    bg: "bg-accent-schedule/10 border border-accent-schedule/30",
    text: "text-accent-schedule",
    label: "Scheduled",
  },
  posted: {
    dotClass: "status-dot-ready",
    bg: "bg-surface-strong border border-border",
    text: "text-foreground",
    label: "Posted",
  },
  failed: {
    dotClass: "status-dot-error",
    bg: "bg-accent-error/10 border border-accent-error/30",
    text: "text-accent-error",
    label: "Failed",
  },
  available: {
    dotClass: "status-dot-ready",
    bg: "bg-accent-ready/10 border border-accent-ready/30",
    text: "text-accent-ready",
    label: "Available",
  },
  "coming-soon": {
    dotClass: "status-dot-neutral",
    bg: "bg-surface-strong border border-border",
    text: "text-muted",
    label: "Coming soon",
  },
  connected: {
    dotClass: "status-dot-ready",
    bg: "bg-accent-ready/10 border border-accent-ready/30",
    text: "text-accent-ready",
    label: "Connected",
  },
};
