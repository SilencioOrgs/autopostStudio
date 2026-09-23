"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Loader2, Send, ExternalLink } from "lucide-react";
import { Icon } from "@/_design-system/icons";
import { Button } from "@/_components/ui/button";
import { FacebookIcon } from "@/_components/ui/icons";
import { getTimeOfDayGreeting } from "@/_lib/dates";
import { useMe } from "@/_lib/hooks/use-me";
import { useToast } from "@/_components/ui/toast";
import type { ApiResponse } from "@/app/_lib/errors";

interface BoardCard {
  id: string;
  status: string;
  position: number;
  scheduled_at: string | null;
  imageUrl?: string | null;
  prompts?: {
    caption: string | null;
    image_prompt: string;
    style: string | null;
  } | null;
  facebook_pages?: {
    page_name: string;
  } | null;
}

interface BoardData {
  columns: Array<{ id: string; title: string; board_date: string | null }>;
  cards: BoardCard[];
}

interface PostRecord {
  id: string;
  fb_post_id: string | null;
  caption_final: string | null;
  published_at: string | null;
  status: string;
  imageUrl?: string | null;
  facebook_pages?: {
    page_name: string;
  } | null;
}

const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<T> = await res.json();
    if (!json.ok) throw new Error(json.error?.message || "Request failed");
    return json.data;
  });

export default function DashboardPage() {
  const greeting = getTimeOfDayGreeting();
  const { data, isLoading: loading, mutate: mutateMe } = useMe();
  const { addToast } = useToast();

  const { data: boardData, mutate: mutateBoard } = useSWR<BoardData>("/api/board", fetcher);
  const { data: postsData, mutate: mutatePosts } = useSWR<PostRecord[]>("/api/posts", fetcher);

  const [publishingId, setPublishingId] = useState<string | null>(null);

  const counts = data?.counts || {
    prompts: 0,
    generating: 0,
    ready: 0,
    backlog: 0,
    scheduled: 0,
    boardTotal: 0,
    published: 0,
  };

  const hasPage = Boolean(data?.pages && data.pages.length > 0);
  const defaultPage = data?.pages?.find((p) => p.is_default) || data?.pages?.[0];
  const userName = data?.profile?.username || data?.user?.email?.split("@")[0] || "Operator";

  const totalBoardPosts =
    counts.boardTotal !== undefined
      ? counts.boardTotal
      : counts.scheduled + (counts.backlog || 0);

  const pipelineStages = [
    {
      label: "Prompt Library",
      count: counts.prompts,
      href: "/dashboard/prompts",
      sub: counts.prompts === 0 ? "No prompts saved" : `${counts.prompts} saved ideas`,
      icon: "collections_bookmark",
      statusVariant: "neutral",
    },
    {
      label: "Generating",
      count: counts.generating,
      href: "/dashboard/queue",
      sub: counts.generating === 0 ? "Queue idle" : `${counts.generating} rendering`,
      icon: "progress_activity",
      pulse: counts.generating > 0,
      statusVariant: counts.generating > 0 ? "warn" : "neutral",
    },
    {
      label: "Ready to Review",
      count: counts.ready,
      href: "/dashboard/review",
      sub: counts.ready === 0 ? "None pending" : `${counts.ready} awaiting approval`,
      badge: counts.ready > 0 ? "Action" : undefined,
      statusVariant: counts.ready > 0 ? "ready" : "neutral",
    },
    {
      label: "Posting Board",
      count: totalBoardPosts,
      href: "/dashboard/schedule",
      sub: `${counts.scheduled} scheduled • ${counts.backlog || 0} backlog`,
      icon: "calendar_month",
      statusVariant: totalBoardPosts > 0 ? "ready" : "neutral",
    },
    {
      label: "Published",
      count: counts.published,
      href: "/dashboard/posts",
      sub: counts.published === 0 ? "None live yet" : `${counts.published} live on FB`,
      icon: "check_circle",
      statusVariant: "neutral",
    },
  ];

  // Up next active cards (sorted: scheduled first, then backlog)
  const activeCards = (boardData?.cards || [])
    .filter((c) => c.status !== "published")
    .sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at) {
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }
      if (a.scheduled_at) return -1;
      if (b.scheduled_at) return 1;
      return a.position - b.position;
    });

  const upNextCards = activeCards.slice(0, 4);

  // Immediate Publish from Dashboard
  const handleDashboardPublishNow = async (cardId: string) => {
    setPublishingId(cardId);
    try {
      const res = await fetch(`/api/board/cards/${cardId}/publish-now`, {
        method: "POST",
      });
      const json: ApiResponse<{ message: string; postUrl: string; pageName: string }> =
        await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to publish post to Facebook");
      }

      await Promise.all([mutateBoard(), mutateMe(), mutatePosts()]);
      addToast({
        title: "Published to Facebook!",
        description: json.data?.message || "Post published live to your Facebook Page feed.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing to Facebook failed";
      addToast({ title: "Publish Failed", description: msg, variant: "error" });
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-2 w-2 rounded-full ${
                hasPage ? "bg-status-success" : "bg-status-warning animate-pulse"
              }`}
            />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              {hasPage ? "Automation Engine Active" : "Configuration Needed"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            {hasPage
              ? `Connected to ${defaultPage?.page_name} • Cloudflare Workers AI active.`
              : "Connect a Facebook Page below to start automated rendering and publishing."}
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

      {/* Setup Alert Banner (if Facebook Page not connected) */}
      {!hasPage && !loading && (
        <section className="bg-surface border border-status-warning/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="warning" size={18} className="text-status-warning" />
            <h2 className="text-sm font-bold font-display text-foreground">
              Required Setup Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground block">
                  Connect Facebook Page
                </span>
                <span className="text-[11px] text-muted block mt-0.5 font-mono">
                  Link your Page ID and Access Token for auto-posting.
                </span>
              </div>
              <Button href="/dashboard/settings?tab=channels" size="sm" variant="primary">
                Connect Page
              </Button>
            </div>
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
              className={hasPage ? "text-status-success" : "text-muted"}
            />
            <span>{hasPage ? "Auto-publishing ready" : "Connect Facebook Page"}</span>
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
        {/* Left Column: Up Next on Your Channels */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-base font-bold font-display text-foreground">
                  Up Next on Your Channels
                </h2>
                <p className="text-xs text-muted font-mono">
                  {hasPage ? `Channel: ${defaultPage?.page_name}` : "No channel connected"}
                </p>
              </div>
              <Link
                href="/dashboard/schedule"
                className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 transition-colors font-mono"
              >
                <span>View Posting Board</span>
                <Icon name="chevron_right" size={14} />
              </Link>
            </div>

            {/* Render Live Pipeline Posts */}
            {upNextCards.length > 0 ? (
              <div className="space-y-3">
                {upNextCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 bg-surface-raised border border-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs hover:border-foreground/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {card.imageUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-border bg-black/30 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.imageUrl}
                            alt="Post draft"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-border bg-surface-raised flex items-center justify-center text-muted shrink-0">
                          <Icon name="image" size={16} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="font-bold text-foreground text-xs block truncate">
                          {card.prompts?.style || "Automated Post"}
                        </span>
                        <p className="text-muted text-[11px] truncate max-w-sm">
                          {card.prompts?.caption || card.prompts?.image_prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {card.scheduled_at ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-ready/10 text-accent-ready font-semibold border border-accent-ready/30">
                              📅{" "}
                              {new Date(card.scheduled_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(card.scheduled_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface border border-border text-muted font-medium">
                              📂 In Backlog
                            </span>
                          )}
                          <span className="text-[10px] text-muted truncate">
                            • {card.facebook_pages?.page_name || defaultPage?.page_name || "Facebook"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={publishingId === card.id}
                        onClick={() => handleDashboardPublishNow(card.id)}
                        className="h-7 text-[11px] gap-1 font-bold border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/10"
                        title="Publish immediately to your Facebook Page feed"
                      >
                        {publishingId === card.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Send size={11} />
                        )}
                        <span>Post Now</span>
                      </Button>
                      <Link
                        href="/dashboard/schedule"
                        className="text-xs text-muted hover:text-foreground font-mono px-2 py-1"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State for Scheduled Posts */
              <div className="py-10 px-4 text-center space-y-3 font-mono">
                <div className="w-10 h-10 mx-auto rounded-full bg-surface-raised border border-border flex items-center justify-center text-muted">
                  <Icon name="calendar_month" size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">No posts scheduled yet</p>
                  <p className="text-xs text-muted max-w-sm mx-auto mt-0.5 font-mono">
                    Import prompt rows in the Prompt Library or approve drafts to populate your schedule.
                  </p>
                </div>
                <Button href="/dashboard/prompts" variant="outline" size="sm" icon="add">
                  Open Prompt Library
                </Button>
              </div>
            )}
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
                    hasPage ? "bg-status-success" : "bg-status-warning"
                  }`}
                />
                <h2 className="text-base font-bold font-display text-foreground">
                  System Status
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  hasPage
                    ? "bg-status-success/15 text-status-success"
                    : "bg-status-warning/15 text-status-warning"
                }`}
              >
                {hasPage ? "Online" : "Pending Action"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Cloudflare Workers AI Status */}
              <div className="p-3 bg-surface-raised border border-border rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name="check_circle"
                    size={16}
                    className="text-status-success"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      Cloudflare Workers AI
                    </span>
                    <span className="text-[11px] font-mono text-muted block">
                      Server-managed • Always active
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings?tab=credentials"
                  className="text-xs font-mono text-muted hover:text-foreground underline"
                >
                  Settings
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
            <p className="text-xs text-muted mt-0.5 font-mono">
              {counts.generating > 0
                ? "Autonomous runner is currently rendering graphics via Cloudflare Workers AI."
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
            <p className="text-xs text-muted font-mono">
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

        {postsData && postsData.length > 0 ? (
          <div className="mt-4 space-y-3">
            {postsData.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="p-3 bg-surface-raised border border-border rounded-lg flex items-center justify-between gap-3 font-mono text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.imageUrl && (
                    <div className="w-10 h-10 rounded-md overflow-hidden border border-border bg-black/30 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imageUrl}
                        alt="Published asset"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-md">
                      {p.caption_final || "Published Post"}
                    </p>
                    <span className="text-[10px] text-muted block">
                      Published on{" "}
                      {p.published_at
                        ? new Date(p.published_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "recently"}{" "}
                      • {p.facebook_pages?.page_name || defaultPage?.page_name || "Facebook"}
                    </span>
                  </div>
                </div>

                {p.fb_post_id && (
                  <a
                    href={`https://facebook.com/${p.fb_post_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#1877F2] hover:underline shrink-0"
                  >
                    <span>View on Facebook</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted space-y-1 font-mono">
            <p className="text-xs font-semibold text-foreground">
              {counts.published === 0 ? "No published posts yet" : `${counts.published} published posts`}
            </p>
            <p className="text-[11px] text-muted">
              {counts.published === 0
                ? "Click 'Post Now' on any card in your Posting Board to publish directly to Facebook."
                : "Live metrics tracked via Meta Graph API."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
