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
} from "lucide-react";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { EmptyState } from "@/_components/ui/empty-state";
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
  const [currentIndex, setCurrentIndex] = useState(0);

  // Poll ready prompts
  const { data: prompts = [], isLoading, mutate } = useSWR<ReadyPrompt[]>(
    "/api/prompts?status=ready",
    fetcher
  );

  const currentPrompt = prompts[currentIndex] || null;

  // Editable fields for active prompt
  const [prevPromptId, setPrevPromptId] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editedHashtags, setEditedHashtags] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  // Sync edits when active card changes without cascading effect renders
  if (currentPrompt && currentPrompt.id !== prevPromptId) {
    setPrevPromptId(currentPrompt.id);
    setEditedCaption(currentPrompt.caption || "");
    setEditedHashtags((currentPrompt.hashtags || []).join(" "));
  }

  // Handler: Save edits before approval
  const saveCurrentEdits = async () => {
    if (!currentPrompt) return;
    try {
      await fetch(`/api/prompts/${currentPrompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editedCaption,
          hashtags: editedHashtags,
        }),
      });
    } catch {}
  };

  // Handler: Approve
  const handleApprove = async () => {
    if (!currentPrompt) return;
    setIsApproving(true);

    try {
      await saveCurrentEdits();
      const res = await fetch(`/api/review/${currentPrompt.id}/approve`, {
        method: "POST",
      });

      const json: ApiResponse<{ approved: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      addToast({
        title: "Post Approved & Queued for Board",
        description: json.data.message,
        variant: "success",
      });

      await mutate();
      if (currentIndex >= prompts.length - 1) {
        setCurrentIndex(Math.max(0, prompts.length - 2));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      addToast({ title: "Approval Failed", description: msg, variant: "error" });
    } finally {
      setIsApproving(false);
    }
  };

  // Handler: Reject
  const handleConfirmReject = async (requeue: boolean) => {
    if (!currentPrompt) return;
    setIsRejecting(true);

    try {
      const res = await fetch(`/api/review/${currentPrompt.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requeue }),
      });

      const json: ApiResponse<{ rejected: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setRejectModalOpen(false);
      addToast({
        title: requeue ? "Returned to Queue" : "Post Discarded",
        description: json.data.message,
        variant: "neutral",
      });

      await mutate();
      if (currentIndex >= prompts.length - 1) {
        setCurrentIndex(Math.max(0, prompts.length - 2));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed";
      addToast({ title: "Reject Failed", description: msg, variant: "error" });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent-ready" />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              HUMAN-IN-THE-LOOP • APPROVAL GATE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Review Deck
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Audit generated images and captions before scheduling. Approved cards land in your Posting Board Backlog.
          </p>
        </div>

        {/* Counter & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-surface-strong border border-border rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                previewMode === "mobile"
                  ? "bg-foreground text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Feed View
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                previewMode === "desktop"
                  ? "bg-foreground text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Side-by-Side
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
          description="There are currently no generated posts awaiting human approval. Enqueue prompts from your library to generate more images."
          action={
            <Button
              variant="primary"
              size="sm"
              href="/dashboard/prompts"
            >
              <Layers size={14} />
              <span>Go to Prompt Library</span>
            </Button>
          }
        />
      ) : currentPrompt ? (
        <div className="space-y-6">
          {/* Deck Stepper / Navigation */}
          <div className="flex items-center justify-between font-mono text-xs text-muted pb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">
                Card {currentIndex + 1} of {prompts.length}
              </span>
              <span>•</span>
              <span>Style: {currentPrompt.style || "Standard"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex >= prompts.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(prompts.length - 1, prev + 1))}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* Main Card Deck: Image & Copy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Preview Canvas */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 bg-surface-strong border border-border rounded-xl flex items-center justify-center shadow-xs">
                {previewMode === "mobile" ? (
                  <FacebookPostPreview
                    pageName="Facebook Page"
                    caption={editedCaption}
                    hashtags={editedHashtags.split(" ").filter(Boolean)}
                    aspect={currentPrompt.aspect}
                    statusText="Just now"
                  />
                ) : (
                  <div className="w-full max-w-md aspect-[4/5] bg-surface border border-border rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-3 font-mono">
                    <Sparkles size={32} className="text-accent-generate animate-pulse" />
                    <div>
                      <p className="font-bold text-foreground text-sm">Generated Image Asset</p>
                      <p className="text-xs text-muted mt-1">Aspect: {currentPrompt.aspect}</p>
                    </div>
                  </div>
                )}
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
                  {currentPrompt.image_prompt}
                </div>
              </div>

              {/* Editable Facebook Caption */}
              <div className="space-y-1.5">
                <label
                  htmlFor="caption-edit"
                  className="text-[10px] text-muted uppercase font-bold tracking-wider block"
                >
                  Facebook Post Copy &amp; Caption
                </label>
                <textarea
                  id="caption-edit"
                  rows={4}
                  value={editedCaption}
                  onChange={(e) => setEditedCaption(e.target.value)}
                  className="w-full p-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors leading-relaxed"
                  placeholder="Caption that will be published to Facebook..."
                />
              </div>

              {/* Editable Hashtags */}
              <div className="space-y-1.5">
                <label
                  htmlFor="hashtags-edit"
                  className="text-[10px] text-muted uppercase font-bold tracking-wider block"
                >
                  Hashtags
                </label>
                <input
                  id="hashtags-edit"
                  type="text"
                  value={editedHashtags}
                  onChange={(e) => setEditedHashtags(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-foreground transition-colors"
                  placeholder="#Architecture #ModernDesign"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border space-y-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  loading={isApproving}
                  onClick={handleApprove}
                  className="w-full"
                >
                  <CheckCircle2 size={16} />
                  <span>Approve &amp; Move to Board Backlog</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setRejectModalOpen(true)}
                  className="w-full text-status-error hover:bg-status-error/10"
                >
                  <XCircle size={15} />
                  <span>Reject Post</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reject Modal */}
      <Dialog
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Reject Generated Post?"
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
