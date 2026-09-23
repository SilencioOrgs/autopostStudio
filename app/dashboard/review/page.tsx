"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  Loader2,
  Table as TableIcon,
  Maximize2,
  ExternalLink,
  Eye,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { Drawer } from "@/_components/ui/drawer";
import { EmptyState } from "@/_components/ui/empty-state";
import { StatusBadge } from "@/_components/status-badge";
import { useToast } from "@/_components/ui/toast";
import { FacebookPostPreview } from "@/_components/ui/facebook-post-preview";
import type { ApiResponse } from "@/app/_lib/errors";

interface ReadyGeneration {
  id: string;
  storage_path: string | null;
  aspect: string;
  bytes: number | null;
  latency_ms: number | null;
}

interface ReadyPrompt {
  id: string;
  row_index?: number | null;
  set_id?: string | null;
  style: string | null;
  image_prompt: string;
  caption: string | null;
  hashtags: string[];
  aspect: "4:5" | "1:1" | "16:9";
  status: string;
  created_at: string;
  generations?: ReadyGeneration[];
  imageUrl?: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<{ prompts: ReadyPrompt[] }> = await res.json();
    if (!json.ok) throw new Error(json.error.message);
    return json.data.prompts;
  });

export default function ReviewPage() {
  const { addToast } = useToast();

  // Primary view toggle: "table" (default) or "deck"
  const [viewMode, setViewMode] = useState<"table" | "deck">("table");

  // Poll ready prompts
  const { data: prompts = [], isLoading, mutate } = useSWR<ReadyPrompt[]>(
    "/api/prompts?status=ready",
    fetcher
  );

  // Deck mode index
  const [deckIndex, setDeckIndex] = useState(0);
  const currentDeckPrompt = prompts[deckIndex] || null;

  // Selected row IDs for batch actions in Table view
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Loading state per item
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Drawer state for inspecting and editing a prompt
  const [activeDrawerPrompt, setActiveDrawerPrompt] = useState<ReadyPrompt | null>(null);
  const [activeDrawerIndex, setActiveDrawerIndex] = useState<number>(0);
  const [drawerCaption, setDrawerCaption] = useState("");
  const [drawerHashtags, setDrawerHashtags] = useState("");
  const [drawerPreviewMode, setDrawerPreviewMode] = useState<"asset" | "feed">("feed");
  const [isDrawerSaving] = useState(false);

  // Zoom lightbox modal for image thumbnail
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    prompt: string;
    aspect: string;
    index: number;
    style?: string | null;
  } | null>(null);

  // Reject modal state
  const [rejectPromptTarget, setRejectPromptTarget] = useState<ReadyPrompt | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Card deck inline editor state
  const [deckPrevPromptId, setDeckPrevPromptId] = useState<string | null>(null);
  const [deckCaption, setDeckCaption] = useState("");
  const [deckHashtags, setDeckHashtags] = useState("");
  const [deckPreviewMode, setDeckPreviewMode] = useState<"asset" | "feed">("asset");

  if (currentDeckPrompt && currentDeckPrompt.id !== deckPrevPromptId) {
    setDeckPrevPromptId(currentDeckPrompt.id);
    setDeckCaption(currentDeckPrompt.caption || "");
    setDeckHashtags((currentDeckPrompt.hashtags || []).join(" "));
  }

  // Multi-select helpers
  const allSelected = prompts.length > 0 && selectedIds.size === prompts.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prompts.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open inspection drawer
  const openDrawerForPrompt = (prompt: ReadyPrompt, index: number) => {
    setActiveDrawerPrompt(prompt);
    setActiveDrawerIndex(index);
    setDrawerCaption(prompt.caption || "");
    setDrawerHashtags((prompt.hashtags || []).join(" "));
  };

  // Approve a single prompt (from table, drawer, or deck)
  const handleApprovePrompt = async (
    promptToApprove: ReadyPrompt,
    customCaption?: string,
    customHashtags?: string
  ) => {
    setApprovingId(promptToApprove.id);

    try {
      if (customCaption !== undefined || customHashtags !== undefined) {
        await fetch(`/api/prompts/${promptToApprove.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: customCaption,
            hashtags: customHashtags,
          }),
        });
      }

      const res = await fetch(`/api/review/${promptToApprove.id}/approve`, {
        method: "POST",
      });

      const json: ApiResponse<{ approved: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      addToast({
        title: `Post #${(prompts.findIndex((p) => p.id === promptToApprove.id) + 1)} Approved`,
        description: json.data.message,
        variant: "success",
      });

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(promptToApprove.id);
        return next;
      });

      if (activeDrawerPrompt?.id === promptToApprove.id) {
        setActiveDrawerPrompt(null);
      }

      await mutate();

      if (deckIndex >= prompts.length - 1) {
        setDeckIndex(Math.max(0, prompts.length - 2));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      addToast({ title: "Approval Failed", description: msg, variant: "error" });
    } finally {
      setApprovingId(null);
    }
  };

  // Batch approve selected prompts
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchApproving(true);
    const idsToApprove = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToApprove) {
      try {
        const res = await fetch(`/api/review/${id}/approve`, { method: "POST" });
        const json = await res.json();
        if (json.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    addToast({
      title: "Batch Approval Complete",
      description: `Successfully approved ${successCount} post${successCount === 1 ? "" : "s"}${
        failCount > 0 ? ` (${failCount} failed)` : ""
      } to posting backlog.`,
      variant: successCount > 0 ? "success" : "error",
    });

    setSelectedIds(new Set());
    setIsBatchApproving(false);
    await mutate();
  };

  // Confirm Reject handler
  const handleConfirmReject = async (requeue: boolean) => {
    if (!rejectPromptTarget) return;
    setIsRejecting(true);

    try {
      const res = await fetch(`/api/review/${rejectPromptTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requeue }),
      });

      const json: ApiResponse<{ rejected: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setRejectModalOpen(false);

      if (activeDrawerPrompt?.id === rejectPromptTarget.id) {
        setActiveDrawerPrompt(null);
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(rejectPromptTarget.id);
        return next;
      });

      addToast({
        title: requeue ? "Returned to Queue" : "Post Discarded",
        description: json.data.message,
        variant: "neutral",
      });

      await mutate();

      if (deckIndex >= prompts.length - 1) {
        setDeckIndex(Math.max(0, prompts.length - 2));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed";
      addToast({ title: "Reject Failed", description: msg, variant: "error" });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-ready" />
            <span className="font-mono text-xs text-muted uppercase tracking-wider font-semibold">
              HUMAN-IN-THE-LOOP • APPROVAL GATE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Review Posts
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Audit generated images and copy by number. Approved items move immediately to your Board Backlog.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-surface-strong border border-border rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <TableIcon size={14} />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("deck")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "deck"
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Layers size={14} />
              <span>Card Deck</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 border border-border rounded-xl bg-surface text-center space-y-3 font-mono">
          <Loader2 size={24} className="animate-spin text-muted mx-auto" />
          <p className="text-xs text-muted">Loading generated posts for review...</p>
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Review Deck is Clear"
          description="There are currently no generated posts awaiting human approval. Enqueue prompts from your library to generate new images."
          action={
            <Button variant="primary" size="sm" href="/dashboard/prompts">
              <Layers size={14} />
              <span>Go to Prompt Library</span>
            </Button>
          }
        />
      ) : viewMode === "table" ? (
        /* ========================================================
           TABLE VIEW
           ======================================================== */
        <div className="space-y-4">
          {/* Action / Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-strong border border-border rounded-xl text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="font-bold text-foreground">
                {prompts.length} {prompts.length === 1 ? "post" : "posts"} awaiting review
              </span>
              {selectedIds.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-foreground text-background font-semibold text-[11px]">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isBatchApproving}
                    onClick={handleBatchApprove}
                    className="font-mono text-xs"
                  >
                    <CheckCheck size={14} />
                    <span>Approve Selected ({selectedIds.size})</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    className="font-mono text-xs"
                  >
                    Clear Selection
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="font-mono text-xs"
                >
                  <span>Select All ({prompts.length})</span>
                </Button>
              )}
            </div>
          </div>

          {/* Review Table */}
          <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-strong border-b border-border font-mono text-[11px] text-muted uppercase tracking-wider select-none">
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all ready posts"
                        className="rounded border-border accent-foreground cursor-pointer h-4 w-4"
                      />
                    </th>
                    <th className="w-20 px-3 py-3 text-center">No.</th>
                    <th className="w-24 px-3 py-3 text-center">Image</th>
                    <th className="px-4 py-3">Style &amp; Prompt</th>
                    <th className="px-4 py-3 hidden md:table-cell">Facebook Copy</th>
                    <th className="w-20 px-3 py-3 text-center hidden sm:table-cell">Aspect</th>
                    <th className="w-28 px-3 py-3 text-center">Status</th>
                    <th className="w-48 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {prompts.map((row, index) => {
                    const rowNumber = index + 1;
                    const isSelected = selectedIds.has(row.id);
                    const isApprovingThis = approvingId === row.id;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-surface-strong/60 ${
                          isSelected ? "bg-surface-strong/80" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(row.id)}
                            aria-label={`Select prompt #${rowNumber}`}
                            className="rounded border-border accent-foreground cursor-pointer h-4 w-4"
                          />
                        </td>

                        {/* Number Column */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center justify-center font-mono">
                            <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md bg-surface-strong border border-border font-bold text-foreground text-xs shadow-2xs">
                              #{rowNumber}
                            </span>
                            {row.row_index && (
                              <span
                                className="text-[10px] text-muted mt-0.5"
                                title={`Original batch row index: ${row.row_index}`}
                              >
                                row {row.row_index}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Image Thumbnail */}
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center">
                            {row.imageUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setZoomedImage({
                                    url: row.imageUrl!,
                                    prompt: row.image_prompt,
                                    aspect: row.aspect,
                                    index: rowNumber,
                                    style: row.style,
                                  })
                                }
                                className="group relative block w-14 h-16 rounded-lg overflow-hidden border border-border bg-black/20 hover:border-foreground transition-all cursor-pointer shrink-0 shadow-xs"
                                title={`Click to zoom post #${rowNumber} image`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={row.imageUrl}
                                  alt={row.caption || "Generated asset"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 size={13} />
                                </div>
                              </button>
                            ) : (
                              <div className="w-14 h-16 rounded-lg border border-dashed border-border bg-surface-strong flex flex-col items-center justify-center text-muted">
                                <Sparkles size={14} className="text-accent-generate animate-pulse" />
                                <span className="text-[9px] font-mono mt-1">{row.aspect}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Style & Prompt */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5 max-w-xs sm:max-w-md">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-xs bg-surface-strong border border-border text-foreground font-semibold inline-block">
                              {row.style || "Standard"}
                            </span>
                            <p className="font-mono text-[11px] text-foreground line-clamp-2 leading-relaxed">
                              {row.image_prompt}
                            </p>
                          </div>
                        </td>

                        {/* Facebook Copy & Hashtags */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="space-y-1 max-w-xs">
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                              {row.caption || (
                                <span className="text-muted/40 italic font-mono text-[11px]">
                                  No caption set
                                </span>
                              )}
                            </p>
                            {row.hashtags && row.hashtags.length > 0 && (
                              <p className="font-mono text-[10px] text-muted line-clamp-1">
                                {row.hashtags.join(" ")}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Aspect Ratio */}
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          <span className="font-mono text-[10px] font-semibold text-muted uppercase px-2 py-0.5 bg-surface-strong rounded border border-border">
                            {row.aspect}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex justify-center">
                            <StatusBadge status={row.status as "ready"} size="sm" />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-mono">
                            <Button
                              variant="primary"
                              size="sm"
                              loading={isApprovingThis}
                              onClick={() => handleApprovePrompt(row)}
                              title="Approve & Move to Board Backlog"
                              className="px-2.5 py-1 text-xs"
                            >
                              <CheckCircle2 size={13} />
                              <span className="hidden lg:inline">Approve</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDrawerForPrompt(row, index)}
                              title="Inspect & Edit Copy"
                              className="px-2.5 py-1 text-xs"
                            >
                              <Eye size={13} />
                              <span className="hidden lg:inline">Inspect</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRejectPromptTarget(row);
                                setRejectModalOpen(true);
                              }}
                              title="Reject or Requeue"
                              className="px-2 py-1 text-xs text-status-error hover:bg-status-error/10 hover:border-status-error/30"
                            >
                              <XCircle size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
           CARD DECK VIEW
           ======================================================== */
        currentDeckPrompt && (
          <div className="space-y-6">
            {/* Deck Stepper / Navigation */}
            <div className="flex items-center justify-between font-mono text-xs text-muted pb-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground px-2 py-0.5 rounded bg-surface-strong border border-border">
                  Card #{deckIndex + 1} of {prompts.length}
                </span>
                <span>•</span>
                <span>Style: {currentDeckPrompt.style || "Standard"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deckIndex === 0}
                  onClick={() => setDeckIndex((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deckIndex >= prompts.length - 1}
                  onClick={() => setDeckIndex((prev) => Math.min(prompts.length - 1, prev + 1))}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>

            {/* Main Card Deck: Image & Copy */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Canvas */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-6 bg-surface-strong border border-border rounded-xl flex items-center justify-center shadow-xs">
                  {deckPreviewMode === "feed" ? (
                    <FacebookPostPreview
                      pageName="Facebook Page"
                      caption={deckCaption}
                      hashtags={deckHashtags.split(" ").filter(Boolean)}
                      aspect={currentDeckPrompt.aspect}
                      imageUrl={currentDeckPrompt.imageUrl || undefined}
                      showImage={true}
                      statusText="Just now"
                    />
                  ) : currentDeckPrompt.imageUrl ? (
                    <div className="relative w-full max-w-md rounded-xl overflow-hidden border border-border bg-black/40 shadow-md group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentDeckPrompt.imageUrl}
                        alt={currentDeckPrompt.caption || "Generated image"}
                        className="w-full h-auto object-cover max-h-[580px]"
                      />
                      <a
                        href={currentDeckPrompt.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/75 hover:bg-black text-white text-[11px] font-mono rounded-md backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
                      >
                        <ExternalLink size={12} />
                        <span>Full Resolution</span>
                      </a>
                    </div>
                  ) : (
                    <div className="w-full max-w-md aspect-[4/5] bg-surface border border-border rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-3 font-mono">
                      <Sparkles size={32} className="text-accent-generate animate-pulse" />
                      <div>
                        <p className="font-bold text-foreground text-sm">Generated Image Asset</p>
                        <p className="text-xs text-muted mt-1">Aspect: {currentDeckPrompt.aspect}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-toggle: Full Image vs Feed View */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center p-1 bg-surface border border-border rounded-lg text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setDeckPreviewMode("asset")}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        deckPreviewMode === "asset"
                          ? "bg-foreground text-background font-bold"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Image Asset Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeckPreviewMode("feed")}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        deckPreviewMode === "feed"
                          ? "bg-foreground text-background font-bold"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Facebook Post Mockup
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Inspection & Caption Editor */}
              <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 space-y-5 shadow-xs font-mono text-xs">
                {/* Generation Prompt Info */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                    Original Image Prompt
                  </span>
                  <div className="p-3 bg-surface-strong border border-border rounded-lg text-foreground text-xs leading-relaxed max-h-32 overflow-y-auto">
                    {currentDeckPrompt.image_prompt}
                  </div>
                </div>

                {/* Editable Facebook Caption */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="deck-caption-edit"
                    className="text-[10px] text-muted uppercase font-bold tracking-wider block"
                  >
                    Facebook Post Copy &amp; Caption
                  </label>
                  <textarea
                    id="deck-caption-edit"
                    rows={4}
                    value={deckCaption}
                    onChange={(e) => setDeckCaption(e.target.value)}
                    className="w-full p-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors leading-relaxed"
                    placeholder="Caption that will be published to Facebook..."
                  />
                </div>

                {/* Editable Hashtags */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="deck-hashtags-edit"
                    className="text-[10px] text-muted uppercase font-bold tracking-wider block"
                  >
                    Hashtags
                  </label>
                  <input
                    id="deck-hashtags-edit"
                    type="text"
                    value={deckHashtags}
                    onChange={(e) => setDeckHashtags(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                    placeholder="#Architecture #ModernDesign"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-border space-y-2.5">
                  <Button
                    variant="primary"
                    size="lg"
                    loading={approvingId === currentDeckPrompt.id}
                    onClick={() =>
                      handleApprovePrompt(currentDeckPrompt, deckCaption, deckHashtags)
                    }
                    className="w-full"
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve #{deckIndex + 1} &amp; Move to Backlog</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setRejectPromptTarget(currentDeckPrompt);
                      setRejectModalOpen(true);
                    }}
                    className="w-full text-status-error hover:bg-status-error/10"
                  >
                    <XCircle size={15} />
                    <span>Reject Post #{deckIndex + 1}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ========================================================
          INSPECTION & EDIT DRAWER (FROM TABLE VIEW)
          ======================================================== */}
      <Drawer
        open={Boolean(activeDrawerPrompt)}
        onOpenChange={(open) => !open && setActiveDrawerPrompt(null)}
        title={activeDrawerPrompt ? `Inspect Post #${activeDrawerIndex + 1}` : undefined}
        description={
          activeDrawerPrompt
            ? `Style: ${activeDrawerPrompt.style || "Standard"} • Aspect: ${activeDrawerPrompt.aspect}`
            : undefined
        }
        width="xl"
      >
        {activeDrawerPrompt && (
          <div className="space-y-6 font-mono text-xs">
            {/* View Mode in Drawer */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] text-muted uppercase font-semibold">Preview Format</span>
              <div className="flex p-0.5 bg-surface-strong border border-border rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setDrawerPreviewMode("feed")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    drawerPreviewMode === "feed"
                      ? "bg-foreground text-background font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Facebook Post
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerPreviewMode("asset")}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    drawerPreviewMode === "asset"
                      ? "bg-foreground text-background font-bold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Image Asset
                </button>
              </div>
            </div>

            {/* Visual Canvas */}
            <div className="p-4 bg-surface-strong border border-border rounded-xl flex items-center justify-center">
              {drawerPreviewMode === "feed" ? (
                <FacebookPostPreview
                  pageName="Facebook Page"
                  caption={drawerCaption}
                  hashtags={drawerHashtags.split(" ").filter(Boolean)}
                  aspect={activeDrawerPrompt.aspect}
                  imageUrl={activeDrawerPrompt.imageUrl || undefined}
                  showImage={true}
                  statusText="Just now"
                />
              ) : activeDrawerPrompt.imageUrl ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-border bg-black/40 shadow-sm group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeDrawerPrompt.imageUrl}
                    alt={activeDrawerPrompt.caption || "Generated image"}
                    className="w-full h-auto object-contain max-h-[460px]"
                  />
                  <a
                    href={activeDrawerPrompt.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 hover:bg-black text-white text-[10px] font-mono rounded backdrop-blur-sm border border-white/10 flex items-center gap-1.5"
                  >
                    <ExternalLink size={12} />
                    <span>Open Full Res</span>
                  </a>
                </div>
              ) : (
                <div className="w-full aspect-[4/5] bg-surface border border-border rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <Sparkles size={24} className="text-accent-generate animate-pulse" />
                  <p className="font-bold text-foreground text-xs">Image Rendering</p>
                </div>
              )}
            </div>

            {/* Original Prompt */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                Original Image Prompt
              </span>
              <div className="p-3 bg-surface-strong border border-border rounded-lg text-foreground text-xs leading-relaxed max-h-28 overflow-y-auto">
                {activeDrawerPrompt.image_prompt}
              </div>
            </div>

            {/* Editable Caption */}
            <div className="space-y-1.5">
              <label
                htmlFor="drawer-caption-edit"
                className="text-[10px] text-muted uppercase font-bold tracking-wider block"
              >
                Facebook Caption &amp; Copy
              </label>
              <textarea
                id="drawer-caption-edit"
                rows={4}
                value={drawerCaption}
                onChange={(e) => setDrawerCaption(e.target.value)}
                className="w-full p-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors leading-relaxed"
                placeholder="Caption that will be published to Facebook..."
              />
            </div>

            {/* Editable Hashtags */}
            <div className="space-y-1.5">
              <label
                htmlFor="drawer-hashtags-edit"
                className="text-[10px] text-muted uppercase font-bold tracking-wider block"
              >
                Hashtags
              </label>
              <input
                id="drawer-hashtags-edit"
                type="text"
                value={drawerHashtags}
                onChange={(e) => setDrawerHashtags(e.target.value)}
                className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                placeholder="#Design #Architecture"
              />
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-border space-y-2.5">
              <Button
                variant="primary"
                size="lg"
                loading={approvingId === activeDrawerPrompt.id || isDrawerSaving}
                onClick={() =>
                  handleApprovePrompt(activeDrawerPrompt, drawerCaption, drawerHashtags)
                }
                className="w-full"
              >
                <CheckCircle2 size={16} />
                <span>Approve Post #{activeDrawerIndex + 1} &amp; Move to Backlog</span>
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setRejectPromptTarget(activeDrawerPrompt);
                  setRejectModalOpen(true);
                }}
                className="w-full text-status-error hover:bg-status-error/10"
              >
                <XCircle size={15} />
                <span>Reject Post #{activeDrawerIndex + 1}</span>
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ========================================================
          IMAGE LIGHTBOX / ZOOM DIALOG
          ======================================================== */}
      <Dialog
        open={Boolean(zoomedImage)}
        onOpenChange={(open) => !open && setZoomedImage(null)}
        title={zoomedImage ? `Post #${zoomedImage.index} — Image Asset` : undefined}
        description={
          zoomedImage
            ? `Style: ${zoomedImage.style || "Standard"} • Aspect Ratio: ${zoomedImage.aspect}`
            : undefined
        }
        maxWidth="lg"
      >
        {zoomedImage && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-center bg-black/70 rounded-xl overflow-hidden border border-border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedImage.url}
                alt={zoomedImage.prompt}
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />
            </div>

            <div className="p-3 bg-surface-strong border border-border rounded-lg text-muted text-xs leading-relaxed max-h-24 overflow-y-auto">
              <span className="font-bold text-foreground block mb-0.5 text-[10px] uppercase">
                Image Prompt
              </span>
              {zoomedImage.prompt}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <a
                href={zoomedImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-border hover:border-foreground bg-transparent text-foreground text-xs font-mono transition-colors"
              >
                <ExternalLink size={14} />
                <span>Open Full Res</span>
              </a>
              <Button variant="primary" size="sm" onClick={() => setZoomedImage(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ========================================================
          REJECT MODAL
          ======================================================== */}
      <Dialog
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title={
          rejectPromptTarget
            ? `Reject Post #${
                prompts.findIndex((p) => p.id === rejectPromptTarget.id) + 1
              }?`
            : "Reject Post?"
        }
        description="Choose how to handle this rejected prompt."
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs text-muted">
          <p>
            You can either return this prompt to the generation queue with fresh parameters, or discard
            it completely.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              loading={isRejecting}
              onClick={() => handleConfirmReject(true)}
            >
              <RefreshCw size={14} />
              <span>Re-queue for Generation</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isRejecting}
              onClick={() => handleConfirmReject(false)}
            >
              <XCircle size={14} />
              <span>Discard &amp; Mark as Failed</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
