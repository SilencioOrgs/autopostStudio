"use client";

import React, { useRef, useState } from "react";
import useSWR from "swr";
import {
  Sparkles,
  Layers,
  Upload,
  Plus,
  Trash2,
  Play,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FolderOpen,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { StatusBadge } from "@/_components/status-badge";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { EmptyState } from "@/_components/ui/empty-state";
import { Pagination } from "@/_components/ui/pagination";
import { useToast } from "@/_components/ui/toast";
import { AiPromptAssistant } from "@/_components/ai/ai-prompt-assistant";
import type { ApiResponse } from "@/app/_lib/errors";

export interface PromptRecord {
  id: string;
  user_id: string;
  set_id: string | null;
  row_index: number | null;
  style: string | null;
  image_prompt: string;
  caption: string | null;
  hashtags: string[];
  aspect: "4:5" | "1:1" | "16:9";
  status: "draft" | "queued" | "generating" | "ready" | "approved" | "scheduled" | "posted" | "failed";
  content_hash: string;
  created_at: string;
  updated_at: string;
}

interface PromptSetRecord {
  id: string;
  name: string;
  style: string | null;
  total_rows: number;
}

const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<T> = await res.json();
    if (!json.ok) throw new Error(json.error.message);
    return json.data;
  });

const PAGE_SIZE = 25;

export default function PromptLibraryPage() {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active view: Library vs AI Assistant
  const [activeView, setActiveView] = useState<"library" | "assistant">("library");

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSetId, setActiveSetId] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // SWR queries
  const promptsUrl = `/api/prompts?status=${activeStatus}&setId=${
    activeSetId !== "all" ? activeSetId : ""
  }&q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${PAGE_SIZE}`;
  const {
    data: promptsData,
    isLoading: isPromptsLoading,
    mutate: mutatePrompts,
  } = useSWR<{ prompts: PromptRecord[]; total: number }>(promptsUrl, fetcher);

  const { data: promptSets = [], mutate: mutateSets } = useSWR<PromptSetRecord[]>(
    "/api/prompt-sets",
    fetcher
  );

  const prompts = promptsData?.prompts || [];

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    setName: string;
    inserted: number;
    skipped: number;
    errors: Array<{ row: number; reason: string }>;
  } | null>(null);

  const [newPromptOpen, setNewPromptOpen] = useState(false);
  const [newStyle, setNewStyle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newHashtags, setNewHashtags] = useState("");
  const [newAspect, setNewAspect] = useState<"4:5" | "1:1" | "16:9">("4:5");
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === prompts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(prompts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handler: Import File
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if ([".xlsx", ".csv"].includes(ext)) {
        setSelectedFile(file);
      } else {
        addToast({
          title: "Unsupported File",
          description: "Please select a .xlsx or .csv workbook.",
          variant: "error",
        });
      }
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    setIsImporting(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/prompts/import", {
        method: "POST",
        body: formData,
      });

      const json: ApiResponse<{
        setId: string;
        setName: string;
        inserted: number;
        skipped: number;
        errors: Array<{ row: number; reason: string }>;
      }> = await res.json();

      if (!json.ok) {
        throw new Error(json.error.message);
      }

      setImportResult(json.data);
      setSelectedFile(null);
      await Promise.all([mutatePrompts(), mutateSets()]);
      addToast({
        title: "Import Finished",
        description: `Added ${json.data.inserted} prompts from ${json.data.setName}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      addToast({
        title: "Import Error",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handler: Create manual prompt
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    setIsCreatingPrompt(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: newPrompt.trim(),
          caption: newCaption.trim() || undefined,
          hashtags: newHashtags.trim() || undefined,
          style: newStyle.trim() || undefined,
          aspect: newAspect,
        }),
      });

      const json: ApiResponse<PromptRecord> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setNewPromptOpen(false);
      setNewPrompt("");
      setNewCaption("");
      setNewHashtags("");
      setNewStyle("");
      await mutatePrompts();
      addToast({
        title: "Prompt Added",
        description: "New prompt added to workspace library.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create prompt";
      addToast({ title: "Creation Failed", description: msg, variant: "error" });
    } finally {
      setIsCreatingPrompt(false);
    }
  };

  // Handler: Batch Queue Generation
  const handleBulkQueue = async () => {
    if (selectedIds.length === 0) return;
    setIsQueueing(true);

    try {
      const res = await fetch("/api/queue/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptIds: selectedIds }),
      });

      const json: ApiResponse<{ enqueued: number; message?: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setSelectedIds([]);
      await mutatePrompts();
      addToast({
        title: "Batch Enqueued",
        description: `Dispatched ${json.data.enqueued} prompts to the generation worker.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to queue prompts";
      addToast({ title: "Queue Dispatch Failed", description: msg, variant: "error" });
    } finally {
      setIsQueueing(false);
    }
  };

  // Handler: Batch Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/prompts/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const json: ApiResponse<{ deleted: boolean; count: number }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      await Promise.all([mutatePrompts(), mutateSets()]);
      addToast({
        title: "Prompts Deleted",
        description: `Removed ${json.data.count} prompts from your library.`,
        variant: "neutral",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed";
      addToast({ title: "Delete Failed", description: msg, variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent-ready" />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              PROMPT REPOSITORY • {promptsData?.total ?? 0} ITEMS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Prompt Studio &amp; Library
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Import Excel workbooks (.xlsx/.csv), manage prompts, and dispatch batches to the Google AI Studio generation pipeline.
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tabs: Library vs AI Assistant */}
          <div className="flex items-center p-1 bg-surface-strong border border-border rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveView("library")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeView === "library"
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Layers size={13} />
              <span>Library ({promptsData?.total ?? 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("assistant")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeView === "assistant"
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Sparkles size={13} />
              <span>AI Assistant</span>
            </button>
          </div>

          {activeView === "library" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsImportOpen(true)}
              >
                <Upload size={14} />
                <span>Import Sheet</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setNewPromptOpen(true)}
              >
                <Plus size={14} />
                <span>New Prompt</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant Generator View */}
      {activeView === "assistant" && (
        <div className="animate-fade-in">
          <AiPromptAssistant
            onAddPromptToLibrary={() => {
              mutatePrompts();
              setActiveView("library");
            }}
          />
        </div>
      )}

      {/* Library Table View */}
      {activeView === "library" && (
        <div className="animate-fade-in space-y-6">
          {/* Search bar & batch action toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search
                className="absolute left-3 top-2.5 text-muted pointer-events-none"
                size={15}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 pl-9 pr-3 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-foreground transition-colors font-mono"
                placeholder="Search prompts by text, style, or #tag..."
              />
            </div>

            {/* Batch Action Toolbar when items selected */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-surface-strong border border-border px-3 py-1.5 rounded-lg text-xs font-mono animate-fade-in">
                <span className="font-semibold text-foreground">
                  {selectedIds.length} selected
                </span>
                <span className="text-muted">|</span>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isQueueing}
                  onClick={handleBulkQueue}
                >
                  <Play size={12} />
                  <span>Enqueue Generation</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </Button>
              </div>
            )}
          </div>

          {/* Conditional: Empty State vs Data Grid */}
          {isPromptsLoading ? (
            <div className="p-16 border border-border rounded-xl bg-surface text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-muted mx-auto" />
              <p className="text-xs font-mono text-muted">Loading prompt library...</p>
            </div>
          ) : prompts.length === 0 && !searchQuery && activeSetId === "all" && activeStatus === "all" ? (
            <EmptyState
              icon="layers"
              title="No Prompts in Workspace"
              description="Your prompt library is empty. Upload an Excel workbook (.xlsx/.csv), generate prompts using the AI Assistant, or write your own prompts."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsImportOpen(true)}
                  >
                    <Upload size={14} />
                    <span>Upload Prompt Workbook (.xlsx)</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveView("assistant")}
                  >
                    <Sparkles size={14} />
                    <span>Generate Prompts with AI</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewPromptOpen(true)}
                  >
                    <Plus size={14} />
                    <span>New Manual Prompt</span>
                  </Button>
                </div>
              }
            />
          ) : (
            /* Main Grid: Filters & Table */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Filter Sidebar */}
              <aside className="lg:col-span-3 bg-surface rounded-xl border border-border p-4 sm:p-5 space-y-5 shadow-xs">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
                    <span>Prompt Collections</span>
                    <FolderOpen size={14} className="text-muted" />
                  </h2>
                  <div className="space-y-1">
                    <button
                      type="button"
                        onClick={() => {
                          setActiveSetId("all");
                          setPage(1);
                        }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        activeSetId === "all"
                          ? "bg-surface-strong text-foreground font-semibold border border-border"
                          : "text-muted hover:text-foreground hover:bg-surface-strong/50"
                      }`}
                    >
                      <span>All Collections</span>
                      <span className="font-mono text-[11px] text-muted">
                        {promptsData?.total || 0}
                      </span>
                    </button>
                    {promptSets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          setActiveSetId(set.id);
                          setPage(1);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          activeSetId === set.id
                            ? "bg-surface-strong text-foreground font-semibold border border-border"
                            : "text-muted hover:text-foreground hover:bg-surface-strong/50"
                        }`}
                      >
                        <span className="truncate pr-2">{set.name}</span>
                        <span className="font-mono text-[11px] text-muted shrink-0">
                          {set.total_rows}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
                    <span>Pipeline Status</span>
                    <SlidersHorizontal size={14} className="text-muted" />
                  </h2>
                  <div className="space-y-1">
                    {[
                      { label: "All Statuses", slug: "all" },
                      { label: "Draft", slug: "draft" },
                      { label: "Queued", slug: "queued" },
                      { label: "Generating", slug: "generating" },
                      { label: "Ready to Review", slug: "ready" },
                      { label: "Approved", slug: "approved" },
                      { label: "Scheduled", slug: "scheduled" },
                      { label: "Posted", slug: "posted" },
                      { label: "Failed", slug: "failed" },
                    ].map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => {
                          setActiveStatus(s.slug);
                          setPage(1);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          activeStatus === s.slug
                            ? "bg-surface-strong text-foreground font-semibold border border-border"
                            : "text-muted hover:text-foreground hover:bg-surface-strong/50"
                        }`}
                      >
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Right Main Table */}
              <div className="lg:col-span-9 bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-strong text-xs font-mono text-muted uppercase">
                        <th className="p-3 pl-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              prompts.length > 0 && selectedIds.length === prompts.length
                            }
                            onChange={toggleSelectAll}
                            aria-label="Select all rows"
                            className="rounded border-border accent-foreground cursor-pointer h-4 w-4"
                          />
                        </th>
                        <th className="p-3 w-16">#</th>
                        <th className="p-3 w-36">Style / Set</th>
                        <th className="p-3 min-w-[240px]">Image Prompt</th>
                        <th className="p-3 min-w-[200px]">Caption &amp; Hashtags</th>
                        <th className="p-3 w-16">Aspect</th>
                        <th className="p-3 w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {prompts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted font-mono">
                            No prompts found matching current filters.
                          </td>
                        </tr>
                      ) : (
                        prompts.map((row) => {
                          const isSelected = selectedIds.includes(row.id);
                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isSelected
                                  ? "bg-surface-strong"
                                  : "hover:bg-surface-strong/40"
                              }`}
                            >
                              <td className="p-3 pl-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(row.id)}
                                  aria-label={`Select prompt ${row.id}`}
                                  className="rounded border-border accent-foreground cursor-pointer h-4 w-4"
                                />
                              </td>
                              <td className="p-3 font-mono font-semibold text-muted">
                                {row.row_index ? `#${row.row_index}` : "—"}
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-xs bg-surface-strong border border-border text-foreground font-medium">
                                  {row.style || "Standard"}
                                </span>
                              </td>
                              <td className="p-3 max-w-sm">
                                <p className="font-medium text-foreground line-clamp-2 leading-snug font-mono text-[11px]">
                                  {row.image_prompt}
                                </p>
                              </td>
                              <td className="p-3 max-w-xs">
                                {row.caption ? (
                                  <p className="text-muted line-clamp-2 leading-snug text-xs">
                                    {row.caption}
                                  </p>
                                ) : (
                                  <span className="text-muted/40 font-mono text-[11px]">No caption</span>
                                )}
                                {row.hashtags && row.hashtags.length > 0 && (
                                  <p className="text-muted-foreground text-[10px] font-mono mt-1 line-clamp-1">
                                    {row.hashtags.join(" ")}
                                  </p>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-[10px] text-muted uppercase">
                                  {row.aspect}
                                </span>
                              </td>
                              <td className="p-3">
                                <StatusBadge status={row.status} size="sm" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {(promptsData?.total || 0) > PAGE_SIZE && (
                  <div className="border-t border-border">
                    <Pagination
                      page={page}
                      totalItems={promptsData?.total || 0}
                      pageSize={PAGE_SIZE}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Sheet Modal */}
      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);
          if (!open) {
            setSelectedFile(null);
            setImportResult(null);
          }
        }}
        title="Import Prompt Workbook (.xlsx / .csv)"
        description="Upload prompt rows automatically grouped into a named collection."
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          {importResult ? (
            /* Result View */
            <div className="p-4 border border-border bg-surface-strong rounded-xs space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-accent-ready font-bold">
                <CheckCircle2 size={18} />
                <span>Import Completed Successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-muted block">Prompts Added:</span>
                  <span className="text-lg font-bold text-foreground">{importResult.inserted}</span>
                </div>
                <div className="p-3 bg-surface border border-border rounded-xs">
                  <span className="text-muted block">Duplicates Skipped:</span>
                  <span className="text-lg font-bold text-foreground">{importResult.skipped}</span>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-xs text-[11px] text-status-error space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle size={13} />
                    <span>Row Validation Warnings:</span>
                  </div>
                  {importResult.errors.slice(0, 3).map((err, i) => (
                    <p key={i}>
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                  {importResult.errors.length > 3 && (
                    <p>...and {importResult.errors.length - 3} more.</p>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportResult(null);
                  }}
                >
                  Close &amp; View Prompts
                </Button>
              </div>
            </div>
          ) : (
            /* Dropzone / Upload View */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-xs text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? "border-foreground bg-surface-strong"
                    : "border-border hover:border-foreground/50 bg-surface-strong/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <FileSpreadsheet size={32} className="mx-auto text-muted mb-3" />
                {selectedFile ? (
                  <div>
                    <p className="font-bold text-foreground text-sm">{selectedFile.name}</p>
                    <p className="text-muted text-[11px] mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to ingest
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-foreground">
                      Click to choose or drag &amp; drop .xlsx / .csv
                    </p>
                    <p className="text-muted text-[11px] mt-1">
                      Up to 500 rows · Expects &apos;Image Prompt&apos;, &apos;Facebook Caption&apos;, &apos;Hashtags&apos;
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface-strong border border-border rounded-xs text-[11px] text-muted space-y-1">
                <p className="font-bold text-foreground">Supported Column Headers:</p>
                <p>• <strong>Image Prompt:</strong> Generation prompt (required)</p>
                <p>• <strong>Facebook Caption + CTA:</strong> Post copy with emojis &amp; text</p>
                <p>• <strong>Hashtags:</strong> Space or comma-separated tags</p>
                <p>• <strong>Style:</strong> Category or theme tag</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedFile}
                  loading={isImporting}
                  onClick={handleImportSubmit}
                >
                  Ingest Prompts
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* New Prompt Modal */}
      <Dialog
        open={newPromptOpen}
        onOpenChange={setNewPromptOpen}
        title="Add Single Prompt"
        description="Create a manual prompt entry for immediate queueing or editing."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePrompt} className="space-y-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="block text-foreground font-semibold uppercase tracking-wider text-[11px]">
              Image Generation Prompt *
            </label>
            <textarea
              required
              rows={3}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="e.g. A modern architectural bungalow inspired by traditional natural materials, dramatic sunlight, 8k resolution..."
              className="w-full p-2.5 bg-surface-strong border border-border rounded-xs text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-foreground font-semibold uppercase tracking-wider text-[11px]">
              Facebook Caption &amp; Call to Action
            </label>
            <textarea
              rows={2}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Post copy that will appear on Facebook with this image..."
              className="w-full p-2.5 bg-surface-strong border border-border rounded-xs text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-foreground font-semibold uppercase tracking-wider text-[11px]">
                Style / Theme
              </label>
              <input
                type="text"
                value={newStyle}
                onChange={(e) => setNewStyle(e.target.value)}
                placeholder="e.g. Modern Villa"
                className="w-full h-9 px-2.5 bg-surface-strong border border-border rounded-xs text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-foreground font-semibold uppercase tracking-wider text-[11px]">
                Hashtags
              </label>
              <input
                type="text"
                value={newHashtags}
                onChange={(e) => setNewHashtags(e.target.value)}
                placeholder="#Design #Architecture"
                className="w-full h-9 px-2.5 bg-surface-strong border border-border rounded-xs text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-foreground font-semibold uppercase tracking-wider text-[11px]">
                Aspect Ratio
              </label>
              <select
                value={newAspect}
                onChange={(e) => setNewAspect(e.target.value as "4:5" | "1:1" | "16:9")}
                className="w-full h-9 px-2.5 bg-surface-strong border border-border rounded-xs text-xs text-foreground focus:outline-none focus:border-foreground"
              >
                <option value="4:5">4:5 (Portrait FB)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Landscape)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewPromptOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isCreatingPrompt}
            >
              Save Prompt
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Selected Prompts?"
        description="This action will permanently delete these prompts from your library."
        maxWidth="sm"
      >
        <div className="space-y-3 font-mono text-xs text-muted">
          <p>
            You are about to delete <strong>{selectedIds.length}</strong> prompts. This cannot be undone.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={isDeleting}
            onClick={handleBulkDelete}
          >
            Delete {selectedIds.length} Prompts
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
