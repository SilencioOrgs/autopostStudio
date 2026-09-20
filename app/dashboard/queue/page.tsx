"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Layers,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/_components/status-badge";
import { Button } from "@/_components/ui/button";
import { Drawer } from "@/_components/ui/drawer";
import { EmptyState } from "@/_components/ui/empty-state";
import { useToast } from "@/_components/ui/toast";
import type { ApiResponse } from "@/app/_lib/errors";

interface EnrichedJob {
  id: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  priority: number;
  attempts: number;
  maxAttempts: number;
  runAfter: string;
  lockedAt: string | null;
  lastError: string | null;
  createdAt: string;
  promptId?: string;
  promptSnippet: string;
  style: string;
  aspect: string;
}

interface QueueApiResponse {
  generationPaused: boolean;
  jobs: EnrichedJob[];
  activeCount: number;
  completedCount: number;
  failedCount: number;
}

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<QueueApiResponse> = await res.json();
    if (!json.ok) throw new Error(json.error.message);
    return json.data;
  });

export default function QueuePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  // Poll real job queue every 3.5s
  const { data, isLoading, mutate } = useSWR<QueueApiResponse>("/api/queue", fetcher, {
    refreshInterval: 3500,
  });

  const jobs = data?.jobs || [];
  const isPaused = data?.generationPaused || false;
  const activeCount = data?.activeCount || 0;
  const completedCount = data?.completedCount || 0;
  const failedCount = data?.failedCount || 0;

  // Handler: Pause / Resume runner
  const handleTogglePause = async () => {
    setIsTogglingPause(true);
    const endpoint = isPaused ? "/api/queue/resume" : "/api/queue/pause";

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json: ApiResponse<{ paused: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      await mutate();
      addToast({
        title: json.data.paused ? "Runner Paused" : "Runner Resumed",
        description: json.data.message,
        variant: json.data.paused ? "neutral" : "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      addToast({ title: "Failed to toggle runner", description: msg, variant: "error" });
    } finally {
      setIsTogglingPause(false);
    }
  };

  // Handler: Cancel job
  const handleCancelJob = async (jobId: string) => {
    setCancellingJobId(jobId);

    try {
      const res = await fetch(`/api/queue/${jobId}/cancel`, { method: "POST" });
      const json: ApiResponse<{ cancelled: boolean; message: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }

      await mutate();
      addToast({
        title: "Job Cancelled",
        description: json.data.message,
        variant: "neutral",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancel failed";
      addToast({ title: "Could not cancel job", description: msg, variant: "error" });
    } finally {
      setCancellingJobId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-2 w-2 rounded-full ${
                isPaused
                  ? "bg-accent-warn"
                  : activeCount > 0
                  ? "bg-accent-generate animate-pulse"
                  : "bg-accent-ready"
              }`}
            />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              {isPaused
                ? "RUNNER PAUSED"
                : activeCount > 0
                ? `ACTIVE PIPELINE • ${activeCount} PROCESSING`
                : "PIPELINE IDLE"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Generation Queue
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Background tasks dispatched to your BYO Google AI Studio key. Images are uploaded to private storage upon completion.
          </p>
        </div>

        {/* Runner Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={isPaused ? "primary" : "outline"}
            size="sm"
            loading={isTogglingPause}
            onClick={handleTogglePause}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            <span>{isPaused ? "Resume Runner" : "Pause Runner"}</span>
          </Button>
        </div>
      </div>

      {/* Quota / Paused Notice Banner */}
      {isPaused && (
        <div className="p-4 bg-accent-warn/10 border border-accent-warn/30 rounded-xl flex items-start gap-3 text-xs font-mono text-foreground animate-fade-in">
          <AlertTriangle size={18} className="text-accent-warn shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-accent-warn">
              Generation Runner is Paused
            </p>
            <p className="text-muted leading-relaxed">
              If paused due to a 429 quota exhaustion, generation will automatically resume when your
              Google AI Studio quota window resets. You can also click &ldquo;Resume Runner&rdquo; to restart processing immediately.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs uppercase">
            <span>In Queue / Running</span>
            <Clock size={15} />
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs uppercase">
            <span>Completed (Ready)</span>
            <CheckCircle2 size={15} className="text-accent-ready" />
          </div>
          <p className="text-2xl font-bold text-foreground">{completedCount}</p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs uppercase">
            <span>Failed / Retried</span>
            <XCircle size={15} className="text-accent-error" />
          </div>
          <p className="text-2xl font-bold text-foreground">{failedCount}</p>
        </div>
      </div>

      {/* Jobs List / Table */}
      {isLoading ? (
        <div className="p-16 border border-border rounded-xl bg-surface text-center space-y-3">
          <Loader2 size={24} className="animate-spin text-muted mx-auto" />
          <p className="text-xs font-mono text-muted">Checking worker job state...</p>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="layers"
          title="Generation Queue is Clear"
          description="There are currently no active or pending generation jobs. Select prompt rows in your Prompt Library and click 'Enqueue Generation' to start rendering."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/dashboard/prompts")}
            >
              <Layers size={14} />
              <span>Go to Prompt Library</span>
            </Button>
          }
        />
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex items-center justify-between font-mono text-xs text-muted">
            <span>Live Worker Pipeline</span>
            <span>Refreshes automatically</span>
          </div>

          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="p-4 hover:bg-surface-strong/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-strong border border-border flex items-center justify-center shrink-0">
                    {job.status === "running" ? (
                      <Loader2 size={16} className="animate-spin text-accent-generate" />
                    ) : job.status === "succeeded" ? (
                      <CheckCircle2 size={16} className="text-accent-ready" />
                    ) : job.status === "failed" ? (
                      <XCircle size={16} className="text-accent-error" />
                    ) : (
                      <Clock size={16} className="text-muted" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-xs">
                        {job.style}
                      </span>
                      <span className="text-[10px] text-muted px-1.5 py-0.5 border border-border rounded-xs">
                        {job.aspect}
                      </span>
                      {job.attempts > 0 && (
                        <span className="text-[10px] text-muted">
                          Attempt {job.attempts}/{job.maxAttempts}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate max-w-md sm:max-w-xl">
                      {job.promptSnippet}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <StatusBadge status={job.status} size="sm" />

                  {["queued", "running"].includes(job.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={cancellingJobId === job.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelJob(job.id);
                      }}
                      className="text-status-error hover:bg-status-error/10 text-xs"
                    >
                      Cancel
                    </Button>
                  )}

                  <ChevronRight size={15} className="text-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        open={Boolean(selectedJob)}
        onOpenChange={(open) => !open && setSelectedJob(null)}
        title="Job Inspection"
        description="Worker execution metrics and payload diagnostic details."
        width="md"
      >
        {selectedJob && (
          <div className="space-y-5 font-mono text-xs">
            {/* Status & ID */}
            <div className="p-3 bg-surface-strong border border-border rounded-lg space-y-1">
              <span className="text-muted uppercase text-[10px] block">Job Identifier</span>
              <p className="font-bold text-foreground text-sm select-all">{selectedJob.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-strong border border-border rounded-lg">
                <span className="text-muted uppercase text-[10px] block">Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedJob.status} size="sm" />
                </div>
              </div>
              <div className="p-3 bg-surface-strong border border-border rounded-lg">
                <span className="text-muted uppercase text-[10px] block">Retry Attempts</span>
                <p className="font-bold text-foreground mt-1">
                  {selectedJob.attempts} / {selectedJob.maxAttempts}
                </p>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-1.5">
              <span className="text-muted uppercase text-[10px] block font-bold">Image Prompt</span>
              <div className="p-3 bg-surface-strong border border-border rounded-lg text-foreground text-xs leading-relaxed max-h-40 overflow-y-auto">
                {selectedJob.promptSnippet}
              </div>
            </div>

            {/* Error detail if failed */}
            {selectedJob.lastError && (
              <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle size={13} />
                  <span>Worker Error Log:</span>
                </span>
                <p className="text-[11px] leading-relaxed">{selectedJob.lastError}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="p-3 border border-border rounded-lg space-y-1.5 text-muted text-[11px]">
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="text-foreground font-semibold">
                  {new Date(selectedJob.createdAt).toLocaleString()}
                </span>
              </div>
              {selectedJob.lockedAt && (
                <div className="flex justify-between">
                  <span>Locked At:</span>
                  <span className="text-foreground">
                    {new Date(selectedJob.lockedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              {["queued", "running"].includes(selectedJob.status) ? (
                <Button
                  variant="danger"
                  size="sm"
                  loading={cancellingJobId === selectedJob.id}
                  onClick={() => handleCancelJob(selectedJob.id)}
                >
                  Cancel This Job
                </Button>
              ) : (
                <div />
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
