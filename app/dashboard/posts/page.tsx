"use client";

import { useState } from "react";
import { Icon } from "@/_design-system/icons";
import { StatusBadge } from "@/_components/status-badge";
import { Button } from "@/_components/ui/button";
import { PostGraphic } from "@/_components/ui/post-graphic";
import { useToast } from "@/_components/ui/toast";
import { MOCK_POSTS, PostRecord } from "@/_data/posts";

export default function PostsPage() {
  const { addToast } = useToast();
  const [posts, setPosts] = useState<PostRecord[]>(MOCK_POSTS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = posts.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleRetry = (id: string) => {
    // TODO(backend): re-trigger social publication endpoint
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "scheduled" as const, errorMessage: undefined } : p
      )
    );
    addToast({
      title: "Post Re-Queued",
      description: "Retrying Facebook publishing job in 30 seconds.",
      variant: "success",
    });
  };

  const publishedCount = posts.filter((p) => p.status === "posted").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;
  const totalReachNum = posts.reduce((acc, p) => {
    if (!p.reach) return acc;
    const num = parseFloat(p.reach.replace(/[^0-9.]/g, ""));
    return acc + (p.reach.includes("k") ? num * 1000 : num);
  }, 0);
  const reachFormatted = totalReachNum > 0 ? `${(totalReachNum / 1000).toFixed(1)}k` : "0";

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              Channel History • Facebook Graph API v20.0
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Published Posts
          </h1>
          <p className="text-sm text-muted mt-1">
            Complete historical log of published, scheduled, and active channel publications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button href="/dashboard/prompts" size="sm" icon="add">
            Create Post
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Published", val: String(publishedCount), tag: "Live", color: "text-foreground" },
          { label: "Scheduled Queue", val: String(scheduledCount), tag: "Upcoming", color: "text-foreground" },
          { label: "Total Reach", val: reachFormatted, tag: "Live telemetry", color: "text-status-success" },
          { label: "Failed / Attention", val: String(failedCount), tag: failedCount > 0 ? "Action req" : "Normal", color: failedCount > 0 ? "text-status-error" : "text-muted" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                {stat.label}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                {stat.tag}
              </span>
            </div>
            <div className={`text-2xl font-bold font-display ${stat.color}`}>
              {stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        {/* Filter / Search Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "All Posts", slug: "all" },
              { label: "Published", slug: "posted" },
              { label: "Scheduled", slug: "scheduled" },
              { label: "Failed", slug: "failed" },
            ].map((tab) => (
              <button
                key={tab.slug}
                type="button"
                onClick={() => setFilterStatus(tab.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                  filterStatus === tab.slug
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-surface-raised"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={14}
              className="absolute left-3 top-2.5 text-muted pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter posts..."
              className="w-full h-8 pl-8 pr-3 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted/60 focus:border-foreground focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50 text-[11px] font-mono uppercase text-muted">
                <th className="p-3 pl-4 w-16">Preview</th>
                <th className="p-3 min-w-[260px]">Post Title & Content</th>
                <th className="p-3 w-28">Channel</th>
                <th className="p-3 w-32">Scheduled / Live</th>
                <th className="p-3 w-28">Reach / Likes</th>
                <th className="p-3 w-28">Status</th>
                <th className="p-3 pr-4 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted font-mono">
                    No posts matching the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="w-12 h-14 rounded overflow-hidden border border-border bg-surface-raised flex-shrink-0">
                        <PostGraphic title={post.title} aspect={post.aspect} />
                      </div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <h4 className="font-semibold text-foreground line-clamp-1">
                        {post.title}
                      </h4>
                      <p className="text-muted line-clamp-2 mt-0.5 text-[11px]">
                        {post.caption}
                      </p>
                      {post.errorMessage && (
                        <div className="mt-1 text-[11px] font-mono text-status-error flex items-center gap-1">
                          <Icon name="error" size={12} />
                          <span>{post.errorMessage}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-border text-foreground font-semibold">
                        {post.platform}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted text-[11px]">
                      {post.scheduledTime}
                    </td>
                    <td className="p-3 font-mono text-muted text-[11px]">
                      {post.reach ? (
                        <span>
                          <strong>{post.reach}</strong> reach • {post.likes} likes
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="p-3 pr-4 text-right">
                      {post.status === "failed" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon="refresh"
                          onClick={() => handleRetry(post.id)}
                        >
                          Retry
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 text-muted hover:text-foreground"
                          aria-label="Post details"
                        >
                          <Icon name="more_vert" size={16} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
