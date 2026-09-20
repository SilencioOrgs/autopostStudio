"use client";

import Link from "next/link";
import { Icon } from "@/_design-system/icons";
import { Button } from "@/_components/ui/button";
import { FacebookIcon } from "@/_components/ui/icons";
import { getTimeOfDayGreeting } from "@/_lib/dates";
import { useMe } from "@/_lib/hooks/use-me";

export default function DashboardPage() {
  const greeting = getTimeOfDayGreeting();
  const { data, isLoading: loading } = useMe();

  const counts = data?.counts || {
    prompts: 0,
    generating: 0,
    ready: 0,
    scheduled: 0,
    published: 0,
  };

  const hasKey = Boolean(data?.providerKey);
  const hasPage = Boolean(data?.pages && data.pages.length > 0);
  const defaultPage = data?.pages?.find((p) => p.is_default) || data?.pages?.[0];
  const userName = data?.profile?.username || data?.user?.email?.split("@")[0] || "Operator";

  const pipelineStages = [
    {
      label: "Prompt Library",
      count: counts.prompts,
      href: "/dashboard/prompts",
      sub: counts.prompts === 0 ? "No prompts saved" : "Available in library",
      icon: "collections_bookmark",
      statusVariant: "neutral",
    },
    {
      label: "Generating",
      count: counts.generating,
      href: "/dashboard/queue",
      sub: counts.generating === 0 ? "Queue idle" : "Active rendering",
      icon: "progress_activity",
      pulse: counts.generating > 0,
      statusVariant: counts.generating > 0 ? "warn" : "neutral",
    },
    {
      label: "Ready to Review",
      count: counts.ready,
      href: "/dashboard/review",
      sub: counts.ready === 0 ? "None pending" : "Awaiting approval",
      badge: counts.ready > 0 ? "Action" : undefined,
      statusVariant: counts.ready > 0 ? "ready" : "neutral",
    },
    {
      label: "Scheduled",
      count: counts.scheduled,
      href: "/dashboard/schedule",
      sub: counts.scheduled === 0 ? "No posts scheduled" : "In queue",
      icon: "calendar_month",
      statusVariant: counts.scheduled > 0 ? "schedule" : "neutral",
    },
    {
      label: "Published",
      count: counts.published,
      href: "/dashboard/posts",
      sub: counts.published === 0 ? "No posts published" : "Live on Facebook",
      icon: "check_circle",
      statusVariant: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-2 w-2 rounded-full ${
                hasKey && hasPage ? "bg-status-success" : "bg-status-warning animate-pulse"
              }`}
            />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              {hasKey && hasPage ? "Automation Engine Active" : "Configuration Needed"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted mt-1">
            {hasKey && hasPage
              ? `Connected to ${defaultPage?.page_name} • Google AI Studio key active.`
              : "Complete workspace configuration below to start automated rendering and publishing."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button href="/dashboard/prompts" variant="secondary" size="sm" icon="table_view">
            Import Prompts
          </Button>
          <Button href="/dashboard/settings" variant="outline" size="sm" icon="tune">
            Settings
          </Button>
        </div>
      </div>

      {/* Setup Alert Banner (if Facebook or AI Studio key missing) */}
      {(!hasKey || !hasPage) && !loading && (
        <section className="bg-surface border border-status-warning/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="warning" size={18} className="text-status-warning" />
            <h2 className="text-sm font-bold font-display text-foreground">
              Required Setup Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!hasKey && (
              <div className="p-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block">
                    1. Configure Google AI Studio Key
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Required for photorealistic Imagen 3 rendering.
                  </span>
                </div>
                <Button href="/dashboard/settings?tab=credentials" size="sm" variant="primary">
                  Add Key
                </Button>
              </div>
            )}

            {!hasPage && (
              <div className="p-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block">
                    2. Connect Facebook Page
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Link your Page ID and Access Token for auto-posting.
                  </span>
                </div>
                <Button href="/dashboard/settings?tab=channels" size="sm" variant="secondary">
                  Connect Page
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pipeline Status Cards */}
      <section className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted">
            Automated Generation Pipeline
          </span>
          <span className="text-xs text-muted flex items-center gap-1.5 font-mono">
            <Icon
              name="autorenew"
              size={14}
              className={hasKey && hasPage ? "text-status-success" : "text-muted"}
            />
            <span>{hasKey && hasPage ? "Auto-publishing ready" : "Awaiting credentials"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pipelineStages.map((stage) => (
            <Link
              key={stage.label}
              href={stage.href}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer relative group ${
                stage.statusVariant === "ready"
                  ? "border-status-success/40 bg-status-success/5 hover:border-status-success"
                  : stage.statusVariant === "warn"
                  ? "border-status-warning/40 bg-status-warning/5 hover:border-status-warning"
                  : "border-border bg-surface-raised/40 hover:bg-surface-raised hover:border-foreground"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stage.count > 0 ? "bg-status-success" : "bg-muted"
                  }`}
                />
                {stage.badge ? (
                  <span className="bg-status-success text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                    {stage.badge}
                  </span>
                ) : stage.icon ? (
                  <Icon name={stage.icon} size={14} className="text-muted" />
                ) : null}
              </div>

              <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
                {stage.count}
              </div>
              <div className="text-xs font-semibold mt-0.5 text-foreground">
                {stage.label}
              </div>
              <div className="text-[11px] font-mono mt-1 text-muted">
                {stage.sub}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Two Columns: Scheduled Queue & System Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-base font-bold font-display text-foreground">
                  Up Next on Your Channels
                </h2>
                <p className="text-xs text-muted">
                  {hasPage ? `Channel: ${defaultPage?.page_name}` : "No channel connected"}
                </p>
              </div>
              <Link
                href="/dashboard/schedule"
                className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 transition-colors"
              >
                <span>View calendar</span>
                <Icon name="chevron_right" size={14} />
              </Link>
            </div>

            {/* Empty State for Scheduled Posts */}
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-surface-raised border border-border flex items-center justify-center text-muted">
                <Icon name="calendar_month" size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">No posts scheduled yet</p>
                <p className="text-xs text-muted max-w-sm mx-auto mt-0.5">
                  Import prompt rows in the Prompt Library or generate graphics to populate your schedule.
                </p>
              </div>
              <Button href="/dashboard/prompts" variant="outline" size="sm" icon="add">
                Open Prompt Library
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Attention & Active Batch */}
        <div className="lg:col-span-5 space-y-4">
          {/* Attention / System Status Panel */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasKey && hasPage ? "bg-status-success" : "bg-status-warning"
                  }`}
                />
                <h2 className="text-base font-bold font-display text-foreground">
                  System Status
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  hasKey && hasPage
                    ? "bg-status-success/15 text-status-success"
                    : "bg-status-warning/15 text-status-warning"
                }`}
              >
                {hasKey && hasPage ? "Online" : "Pending Action"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Google Key Status */}
              <div className="p-3 bg-surface-raised border border-border rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name={hasKey ? "check_circle" : "error"}
                    size={16}
                    className={hasKey ? "text-status-success" : "text-status-warning"}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      Google AI Studio Key
                    </span>
                    <span className="text-[11px] font-mono text-muted block">
                      {hasKey ? `Valid (••••${data?.providerKey?.key_last4})` : "Not configured"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings?tab=credentials"
                  className="text-xs font-mono text-muted hover:text-foreground underline"
                >
                  {hasKey ? "Manage" : "Add"}
                </Link>
              </div>

              {/* Facebook Page Status */}
              <div className="p-3 bg-surface-raised border border-border rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center flex-shrink-0">
                    <FacebookIcon size={12} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      {hasPage ? defaultPage?.page_name : "Facebook Page"}
                    </span>
                    <span className="text-[11px] font-mono text-muted block">
                      {hasPage
                        ? `${defaultPage?.followers_count} followers • Token valid`
                        : "Not connected"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings?tab=channels"
                  className="text-xs font-mono text-muted hover:text-foreground underline"
                >
                  {hasPage ? "Manage" : "Connect"}
                </Link>
              </div>
            </div>
          </div>

          {/* Active Generation Batch Stats */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                Generation Pipeline
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-raised text-muted border border-border">
                {counts.generating > 0 ? "Rendering" : "Idle"}
              </span>
            </div>
            <div className="text-sm font-bold font-display text-foreground">
              {counts.generating > 0 ? `${counts.generating} Prompts Generating` : "No Active Renders"}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {counts.generating > 0
                ? "Autonomous runner is currently rendering graphics via Google Imagen 3."
                : "Prompts queued in the library will automatically generate when triggered."}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border">
              <div>
                <span className="text-[11px] font-mono text-muted block">Awaiting Approval</span>
                <span className="text-xl font-bold font-display text-foreground">
                  {counts.ready}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-mono text-muted block">Published Total</span>
                <span className="text-xl font-bold font-display text-foreground">
                  {counts.published}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publishing Velocity Panel */}
      <section className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <h2 className="text-base font-bold font-display text-foreground">
              Posts Published Velocity
            </h2>
            <p className="text-xs text-muted">
              Live publication ledger and broadcast analytics
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-foreground bg-surface-raised px-3.5 py-1.5 rounded-lg border border-border">
            <span>
              Total: <strong>{counts.published} posts</strong>
            </span>
            <span className="text-border">|</span>
            <span>
              Channel: <strong>{hasPage ? defaultPage?.page_name : "None"}</strong>
            </span>
          </div>
        </div>

        <div className="py-12 text-center text-muted space-y-1">
          <p className="text-xs font-semibold text-foreground">
            {counts.published === 0 ? "No published posts yet" : `${counts.published} published posts`}
          </p>
          <p className="text-[11px] font-mono text-muted">
            {counts.published === 0
              ? "Publishing analytics and engagement graph will activate after your first post goes live."
              : "Live metrics tracked via Meta Graph API."}
          </p>
        </div>
      </section>
    </div>
  );
}
