"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { Icon } from "@/_design-system/icons";
import { StatusBadge } from "@/_components/status-badge";
import { Button } from "@/_components/ui/button";
import { PostGraphic } from "@/_components/ui/post-graphic";
import { useToast } from "@/_components/ui/toast";
import { formatDateTime } from "@/_lib/dates";
import type { ApiResponse } from "@/app/_lib/errors";
import type { ExtendedStatus } from "@/_lib/status";

interface PostApiRecord {
  id: string;
  status: "scheduled" | "publishing" | "published" | "failed" | "cancelled" | "cancel_pending";
  caption_final: string | null;
  error_message: string | null;
  published_at: string | null;
  scheduled_publish_time: string | null;
  created_at: string;
  imageUrl: string | null;
  facebook_pages: {
    id: string;
    page_id: string;
    page_name: string;
    category: string | null;
  } | null;
  prompts: {
    id: string;
    image_prompt: string;
    caption: string | null;
    hashtags: string[] | null;
    style: string | null;
  } | null;
}

const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then(async (response) => {
    const json: ApiResponse<T> = await response.json();
    if (!response.ok || !json.ok) {
      throw new Error(json.ok ? "Failed to load posts." : json.error.message);
    }
    return json.data;
  });

function getDisplayStatus(status: PostApiRecord["status"]): ExtendedStatus {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "published":
      return "posted";
    case "failed":
      return "failed";
    case "cancelled":
    case "cancel_pending":
      return "cancelled";
    case "publishing":
      return "running";
  }
}

export default function PostsPage() {
  const { addToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const { data: posts = [], isLoading, mutate } = useSWR<PostApiRecord[]>("/api/posts", fetcher);

  const filtered = posts.filter((post) => {
    if (filterStatus !== "all" && post.status !== filterStatus) return false;
    if (search.trim()) {
      const query = search.toLowerCase();
      const matches =
        post.caption_final?.toLowerCase().includes(query) ||
        post.prompts?.image_prompt.toLowerCase().includes(query) ||
        post.facebook_pages?.page_name.toLowerCase().includes(query);
      if (!matches) return false;
    }
    return true;
  });

  const handleRetry = async (id: string) => {
    setRetryingIds((current) => [...current, id]);

    try {
      const response = await fetch(`/api/posts/${id}/retry`, { method: "POST" });
      const json: ApiResponse<{ message: string }> = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "Failed to retry post publication." : json.error.message);
      }

      await mutate();
      addToast({ title: "Post Published", description: json.data.message, variant: "success" });
    } catch (error) {
      addToast({
        title: "Retry Failed",
        description: error instanceof Error ? error.message : "Failed to retry post publication.",
        variant: "error",
      });
    } finally {
      setRetryingIds((current) => current.filter((retryingId) => retryingId !== id));
    }
  };

  const publishedCount = posts.filter((post) => post.status === "published").length;
  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const failedCount = posts.filter((post) => post.status === "failed").length;

  if (isLoading) {
    return (
      <div className="p-16 border border-border rounded-xl bg-surface text-center space-y-3">
        <Loader2 size={24} className="animate-spin text-muted mx-auto" />
        <p className="text-xs font-mono text-muted">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
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
        <Button href="/dashboard/prompts" size="sm" icon="add">
          Create Post
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Published", val: String(publishedCount), tag: "Live", color: "text-foreground" },
          { label: "Scheduled Queue", val: String(scheduledCount), tag: "Upcoming", color: "text-foreground" },
          { label: "Total Reach", val: "—", tag: "Not tracked yet", color: "text-muted" },
          { label: "Failed / Attention", val: String(failedCount), tag: failedCount > 0 ? "Action req" : "Normal", color: failedCount > 0 ? "text-status-error" : "text-muted" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">{stat.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">{stat.tag}</span>
            </div>
            <div className={`text-2xl font-bold font-display ${stat.color}`}>{stat.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "All Posts", slug: "all" },
              { label: "Published", slug: "published" },
              { label: "Scheduled", slug: "scheduled" },
              { label: "Failed", slug: "failed" },
              { label: "Cancelled", slug: "cancelled" },
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
            <Icon name="search" size={14} className="absolute left-3 top-2.5 text-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter posts..."
              className="w-full h-8 pl-8 pr-3 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted/60 focus:border-foreground focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50 text-[11px] font-mono uppercase text-muted">
                <th className="p-3 pl-4 w-16">Preview</th>
                <th className="p-3 min-w-[260px]">Post Title &amp; Content</th>
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
                filtered.map((post) => {
                  const caption = post.caption_final ?? post.prompts?.caption ?? "No caption";
                  const scheduledOrPublishedAt = post.status === "published" ? post.published_at : post.scheduled_publish_time;
                  const isRetrying = retryingIds.includes(post.id);

                  return (
                    <tr key={post.id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="w-12 h-14 rounded overflow-hidden border border-border bg-surface-raised flex-shrink-0">
                          {post.imageUrl ? (
                            <img src={post.imageUrl} alt={caption} className="h-full w-full object-cover" />
                          ) : (
                            <PostGraphic title={caption} />
                          )}
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <span className="font-mono text-[10px] uppercase text-muted">{post.prompts?.style ?? "General"}</span>
                        <h4 className="font-semibold text-foreground line-clamp-1">{caption}</h4>
                        {post.prompts?.hashtags && post.prompts.hashtags.length > 0 && (
                          <p className="text-muted line-clamp-1 mt-0.5 text-[11px]">{post.prompts.hashtags.join(" ")}</p>
                        )}
                        {post.error_message && (
                          <div className="mt-1 text-[11px] font-mono text-status-error flex items-center gap-1">
                            <Icon name="error" size={12} />
                            <span>{post.error_message}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-border text-foreground font-semibold">Facebook</span>
                        {post.facebook_pages?.page_name && (
                          <span className="block mt-1 text-[10px] text-muted line-clamp-1">{post.facebook_pages.page_name}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-muted text-[11px]">
                        {scheduledOrPublishedAt ? formatDateTime(scheduledOrPublishedAt) : "—"}
                      </td>
                      <td className="p-3 font-mono text-muted text-[11px]">
                        <span>—</span>
                        <span className="block text-[10px]">Not tracked yet</span>
                      </td>
                      <td className="p-3"><StatusBadge status={getDisplayStatus(post.status)} /></td>
                      <td className="p-3 pr-4 text-right">
                        {post.status === "failed" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon="refresh"
                            loading={isRetrying}
                            disabled={isRetrying}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
