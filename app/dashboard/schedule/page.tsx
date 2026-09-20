"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Clock,
  Layers,
  AlertTriangle,
  Loader2,
  Trash2,
  GripVertical,
  Plus,
  ExternalLink,
  Check,
  ArrowRight,
  Send,
} from "lucide-react";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { EmptyState } from "@/_components/ui/empty-state";
import { useToast } from "@/_components/ui/toast";
import { FacebookIcon } from "@/_components/ui/icons";
import { calculateMidpointPosition } from "@/app/_lib/board-utils";
import type { ApiResponse } from "@/app/_lib/errors";

interface BoardColumn {
  id: string;
  board_date: string | null;
  title: string;
  position: number;
}

interface BoardCard {
  id: string;
  column_id: string;
  prompt_id: string;
  position: number;
  scheduled_at: string | null;
  status: "planned" | "scheduled" | "publishing" | "published" | "failed";
  imageUrl?: string | null;
  prompts?: {
    image_prompt: string;
    caption: string | null;
    hashtags: string[];
    style: string | null;
    aspect: string;
  };
  facebook_pages?: {
    id: string;
    page_name: string;
    token_last4: string;
    token_status: string;
  } | null;
}

interface BoardApiResponse {
  columns: BoardColumn[];
  cards: BoardCard[];
}

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<BoardApiResponse> = await res.json();
    if (!json.ok) throw new Error(json.error.message);
    return json.data;
  });

/* Sortable Board Card Item */
function SortableCard({
  card,
  isBacklog,
  isSelected,
  isPublishing,
  onToggleSelect,
  onRemove,
  onScheduleTime,
  onTransferOne,
  onPublishNow,
}: {
  card: BoardCard;
  isBacklog?: boolean;
  isSelected?: boolean;
  isPublishing?: boolean;
  onToggleSelect?: (id: string) => void;
  onRemove: (id: string) => void;
  onScheduleTime: (card: BoardCard) => void;
  onTransferOne?: (card: BoardCard) => void;
  onPublishNow?: (card: BoardCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-surface border rounded-lg shadow-xs transition-all font-mono text-xs space-y-2.5 group ${
        isSelected
          ? "border-foreground ring-1 ring-foreground/40 bg-surface-strong/40"
          : "border-border hover:border-foreground/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted min-w-0">
          {/* Backlog Selection Checkbox */}
          {isBacklog && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(card.id);
              }}
              className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                isSelected
                  ? "bg-foreground border-foreground text-background"
                  : "border-border hover:border-foreground/60 bg-surface"
              }`}
              aria-label={isSelected ? "Deselect card" : "Select card"}
            >
              {isSelected && <Check size={11} strokeWidth={3} />}
            </button>
          )}

          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground p-0.5 shrink-0"
            aria-label="Drag card"
          >
            <GripVertical size={14} />
          </button>
          <span className="font-bold text-foreground text-[11px] truncate max-w-[120px]">
            {card.prompts?.style || "Post"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(card.id)}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-status-error transition-opacity cursor-pointer p-0.5 shrink-0"
          title="Remove from board"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Image Thumbnail Preview */}
      {card.imageUrl && (
        <div className="rounded-md overflow-hidden border border-border bg-black/30 aspect-[16/9] max-h-28 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt={card.prompts?.caption || "Post asset"}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Caption Snippet */}
      <p className="text-muted text-[11px] line-clamp-2 leading-relaxed">
        {card.prompts?.caption || card.prompts?.image_prompt || "Post card"}
      </p>

      {/* Meta Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px] text-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          {isBacklog ? (
            <button
              type="button"
              onClick={() => onTransferOne?.(card)}
              className="flex items-center gap-1 text-muted hover:text-foreground hover:bg-surface-strong px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              title="Schedule and transfer this post onto a calendar date"
            >
              <Calendar size={11} className="text-accent-ready" />
              <span className="font-semibold text-foreground">+ Schedule</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onScheduleTime(card)}
              className="flex items-center gap-1 text-muted hover:text-foreground hover:bg-surface-strong px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              title="Adjust scheduled publishing time"
            >
              <Calendar size={11} className={card.scheduled_at ? "text-accent-ready" : "text-muted"} />
              <span className="font-medium">
                {card.scheduled_at
                  ? new Date(card.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "+ Time"}
              </span>
            </button>
          )}

          {/* Quick Direct Post Now Action */}
          <button
            type="button"
            disabled={isPublishing}
            onClick={() => onPublishNow?.(card)}
            className="flex items-center gap-1 text-[#1877F2] hover:text-white hover:bg-[#1877F2] px-1.5 py-0.5 rounded transition-colors cursor-pointer font-bold shrink-0 border border-[#1877F2]/30"
            title="Auto-post immediately to your Facebook Page feed"
          >
            {isPublishing ? (
              <Loader2 size={10} className="animate-spin text-[#1877F2]" />
            ) : (
              <Send size={10} />
            )}
            <span>Post Now</span>
          </button>
        </div>

        {card.facebook_pages && (
          <div className="flex items-center gap-1 text-[#1877F2] shrink-0">
            <FacebookIcon size={11} />
            <span className="truncate max-w-[65px]">{card.facebook_pages.page_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Droppable Column Component */
function DroppableColumn({
  column,
  cards,
  onRemoveCard,
  onScheduleTime,
  onDeleteColumn,
  onAddDate,
  selectedCardIds,
  publishingCardId,
  isBatchPublishing,
  onToggleSelectCard,
  onSelectAllBacklog,
  onDeselectAllBacklog,
  onOpenBatchTransfer,
  onOpenBatchPostNow,
  onTransferSingleCard,
  onPublishNow,
}: {
  column: BoardColumn;
  cards: BoardCard[];
  onRemoveCard: (id: string) => void;
  onScheduleTime: (card: BoardCard) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddDate?: () => void;
  selectedCardIds?: Set<string>;
  publishingCardId?: string | null;
  isBatchPublishing?: boolean;
  onToggleSelectCard?: (id: string) => void;
  onSelectAllBacklog?: (allIds: string[]) => void;
  onDeselectAllBacklog?: () => void;
  onOpenBatchTransfer?: () => void;
  onOpenBatchPostNow?: () => void;
  onTransferSingleCard?: (card: BoardCard) => void;
  onPublishNow?: (card: BoardCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  });

  const isBacklog = !column.board_date;
  const backlogCardIds = useMemo(() => cards.map((c) => c.id), [cards]);
  const selectedBacklogCount = useMemo(() => {
    if (!isBacklog || !selectedCardIds) return 0;
    return cards.filter((c) => selectedCardIds.has(c.id)).length;
  }, [isBacklog, selectedCardIds, cards]);
  const allBacklogSelected = cards.length > 0 && selectedBacklogCount === cards.length;

  const displayTitle = useMemo(() => {
    if (!column.board_date) return column.title || "Backlog";
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
    if (column.board_date === todayStr) return `Today (${column.title})`;
    if (column.board_date === tomorrowStr) return `Tomorrow (${column.title})`;
    return column.title;
  }, [column.board_date, column.title]);

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 flex flex-col max-h-[75vh] rounded-xl border transition-colors ${
        isOver ? "border-foreground bg-surface-strong/70" : "border-border bg-surface-strong/30"
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          {isBacklog ? (
            <Layers size={14} className="text-accent-ready" />
          ) : (
            <Calendar size={14} className="text-muted" />
          )}
          <span className="font-bold text-foreground truncate max-w-[150px]">{displayTitle}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] px-1.5 py-0.5 rounded-xs bg-surface border border-border text-muted font-bold">
            {cards.length}
          </span>
          {isBacklog && onAddDate && (
            <button
              type="button"
              onClick={onAddDate}
              className="text-muted hover:text-foreground hover:bg-surface p-1 rounded-xs transition-colors cursor-pointer"
              title="Add a scheduled date column"
            >
              <Plus size={13} />
            </button>
          )}
          {!isBacklog && onDeleteColumn && (
            <button
              type="button"
              onClick={() => onDeleteColumn(column.id)}
              className="text-muted hover:text-status-error p-1 rounded transition-colors cursor-pointer"
              title="Delete this date column"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Backlog Quick Selection & Actions Sub-Bar */}
      {isBacklog && cards.length > 0 && (
        <div className="px-3 py-2 bg-surface border-b border-border/80 flex items-center justify-between gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              if (allBacklogSelected) {
                onDeselectAllBacklog?.();
              } else {
                onSelectAllBacklog?.(backlogCardIds);
              }
            }}
            className="flex items-center gap-1.5 text-muted hover:text-foreground cursor-pointer select-none text-[11px] font-medium transition-colors"
          >
            <div
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                allBacklogSelected
                  ? "bg-foreground border-foreground text-background"
                  : selectedBacklogCount > 0
                  ? "border-foreground/80 bg-foreground/10 text-foreground"
                  : "border-border hover:border-foreground/60 bg-surface"
              }`}
            >
              {allBacklogSelected && <Check size={10} strokeWidth={3} />}
              {!allBacklogSelected && selectedBacklogCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-[1px] bg-foreground" />
              )}
            </div>
            <span>
              {allBacklogSelected
                ? `Deselect (${cards.length})`
                : `Select All (${cards.length})`}
            </span>
          </button>

          {selectedBacklogCount > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenBatchPostNow}
                disabled={isBatchPublishing}
                className="h-6 text-[10px] px-1.5 py-0.5 gap-1 font-bold border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/10"
                title="Post selected cards immediately to Facebook Page feed"
              >
                {isBatchPublishing ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Send size={10} />
                )}
                <span>Post Now ({selectedBacklogCount})</span>
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={onOpenBatchTransfer}
                className="h-6 text-[10px] px-2 py-0.5 gap-1 font-semibold shadow-xs"
                title="Schedule selected posts across dates"
              >
                <Calendar size={10} />
                <span>Transfer</span>
              </Button>
            </div>
          ) : (
            <span className="text-[10px] text-muted/70">1 post / day</span>
          )}
        </div>
      )}

      {/* Card Items Container */}
      <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1 min-h-[140px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isBacklog={isBacklog}
              isSelected={isBacklog && selectedCardIds ? selectedCardIds.has(card.id) : false}
              isPublishing={publishingCardId === card.id}
              onToggleSelect={onToggleSelectCard}
              onRemove={onRemoveCard}
              onScheduleTime={onScheduleTime}
              onTransferOne={onTransferSingleCard}
              onPublishNow={onPublishNow}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="h-24 border border-dashed border-border rounded-lg flex items-center justify-center text-muted font-mono text-[11px] text-center p-2">
            {isBacklog
              ? "Approved posts land here"
              : "Drop post here to schedule"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { addToast } = useToast();
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [capErrorModal, setCapErrorModal] = useState<string | null>(null);

  // Dynamic Date Column Dialog state
  const [addDateModalOpen, setAddDateModalOpen] = useState(false);
  const [newColumnDate, setNewColumnDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Scheduling Modal state
  const [schedulingCard, setSchedulingCard] = useState<BoardCard | null>(null);
  const [scheduledDateInput, setScheduledDateInput] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [scheduledTimeInput, setScheduledTimeInput] = useState("19:00");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Backlog Card Selection state
  const [selectedBacklogIds, setSelectedBacklogIds] = useState<Set<string>>(new Set());

  // Transfer Dialog state (Batch or One-on-One)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferCardIds, setTransferCardIds] = useState<string[]>([]);
  const [transferStartDate, setTransferStartDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [transferTime, setTransferTime] = useState("19:00");
  const [transferMode, setTransferMode] = useState<"sequential" | "same_day">("sequential");
  const [isTransferring, setIsTransferring] = useState(false);

  // Immediate Facebook Post Now states
  const [publishingCardId, setPublishingCardId] = useState<string | null>(null);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);

  const { data, isLoading, mutate } = useSWR<BoardApiResponse>("/api/board", fetcher);

  const columns = data?.columns || [];
  const cards = data?.cards || [];

  // Sensors with 5px drag distance tolerance to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = String(active.id);
    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

    // Determine target column
    let targetColumnId = "";
    const overColumn = columns.find((col) => col.id === over.id);
    if (overColumn) {
      targetColumnId = overColumn.id;
    } else {
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) targetColumnId = overCard.column_id;
    }

    if (!targetColumnId) return;

    const targetColumn = columns.find((c) => c.id === targetColumnId);
    const isTargetBacklog = !targetColumn?.board_date;

    // Determine position among neighbors
    const targetCards = cards.filter((c) => c.column_id === targetColumnId && c.id !== cardId);
    const overIndex = targetCards.findIndex((c) => c.id === over.id);

    let prevPos: number | null = null;
    let nextPos: number | null = null;

    if (overIndex >= 0) {
      prevPos = overIndex > 0 ? targetCards[overIndex - 1].position : null;
      nextPos = targetCards[overIndex].position;
    } else if (targetCards.length > 0) {
      prevPos = targetCards[targetCards.length - 1].position;
    }

    const newPos = calculateMidpointPosition(prevPos, nextPos);

    // Optimistic UI update
    const previousCards = [...cards];
    const updatedCards = cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            column_id: targetColumnId,
            position: newPos,
            scheduled_at: isTargetBacklog ? null : c.scheduled_at,
            status: isTargetBacklog ? ("planned" as const) : c.scheduled_at ? ("scheduled" as const) : ("planned" as const),
          }
        : c
    );

    mutate({ columns, cards: updatedCards }, false);

    try {
      const res = await fetch(`/api/board/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: targetColumnId,
          position: newPos,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        if (json.error?.code === "DAILY_CAP_REACHED") {
          setCapErrorModal(json.error.message);
        }
        throw new Error(json.error?.message || "Failed to move card");
      }

      await mutate();
      addToast({
        title: isTargetBacklog ? "Moved to Backlog" : "Post Placed in Column",
        description: isTargetBacklog
          ? "Post placed in Backlog."
          : `Moved to ${targetColumn?.title}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      mutate({ columns, cards: previousCards }, false);
      const msg = err instanceof Error ? err.message : "Failed to move card";
      addToast({ title: "Move Failed", description: msg, variant: "error" });
    }
  };

  // Handler: Add new date column dynamically
  const handleAddDateColumn = async (dateStr: string, title?: string) => {
    setIsAddingColumn(true);
    try {
      const res = await fetch("/api/board/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, title: title || undefined }),
      });
      const json: ApiResponse<BoardColumn> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setAddDateModalOpen(false);
      setNewColumnTitle("");
      await mutate();
      addToast({
        title: "Date Column Added",
        description: `Added column for ${json.data.title}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add date column";
      addToast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setIsAddingColumn(false);
    }
  };

  // Handler: Delete date column
  const handleDeleteColumn = async (columnId: string) => {
    try {
      const res = await fetch(`/api/board/columns/${columnId}`, {
        method: "DELETE",
      });
      const json: ApiResponse<{ deleted: boolean }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      await mutate();
      addToast({
        title: "Date Column Removed",
        description: "Any posts in that column have been returned to Backlog.",
        variant: "neutral",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove column";
      addToast({ title: "Error", description: msg, variant: "error" });
    }
  };

  // Handler: Remove card from board
  const handleRemoveCard = async (cardId: string) => {
    try {
      const res = await fetch(`/api/board/cards/${cardId}`, { method: "DELETE" });
      const json: ApiResponse<{ deleted: boolean }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      await mutate();
      addToast({ title: "Card Removed", description: "Post removed from board.", variant: "neutral" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove card";
      addToast({ title: "Error", description: msg, variant: "error" });
    }
  };

  // Open scheduling modal for a card
  const handleOpenScheduleModal = (card: BoardCard) => {
    setSchedulingCard(card);
    const currentColumn = columns.find((c) => c.id === card.column_id);
    if (currentColumn?.board_date) {
      setScheduledDateInput(currentColumn.board_date);
    } else {
      setScheduledDateInput(new Date().toLocaleDateString("en-CA"));
    }

    if (card.scheduled_at) {
      const timePart = new Date(card.scheduled_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      setScheduledTimeInput(timePart);
    } else {
      setScheduledTimeInput("19:00");
    }
  };

  // Handler: Save Date & Time on a card (auto-creates column if needed)
  const handleSaveScheduledDateTime = async () => {
    if (!schedulingCard) return;
    setIsSavingSchedule(true);

    try {
      // 1. Ensure target date column exists
      let targetColumn = columns.find((c) => c.board_date === scheduledDateInput);
      if (!targetColumn) {
        const colRes = await fetch("/api/board/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: scheduledDateInput }),
        });
        const colJson = await colRes.json();
        if (!colJson.ok) throw new Error(colJson.error.message);
        targetColumn = colJson.data;
      }

      const scheduledAt = new Date(`${scheduledDateInput}T${scheduledTimeInput}:00+08:00`).toISOString();

      // 2. Update card column & scheduled time
      const patchRes = await fetch(`/api/board/cards/${schedulingCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: targetColumn?.id,
          scheduledAt,
        }),
      });

      const patchJson: ApiResponse<BoardCard> = await patchRes.json();
      if (!patchJson.ok) throw new Error(patchJson.error.message);

      setSchedulingCard(null);
      await mutate();
      addToast({
        title: "Post Scheduled",
        description: `Scheduled for ${targetColumn?.title || scheduledDateInput} at ${scheduledTimeInput}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Schedule update failed";
      addToast({ title: "Schedule Failed", description: msg, variant: "error" });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Backlog selection handlers
  const handleToggleCardSelect = (cardId: string) => {
    setSelectedBacklogIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleSelectAllBacklog = (allIds: string[]) => {
    setSelectedBacklogIds(new Set(allIds));
  };

  const handleDeselectAllBacklog = () => {
    setSelectedBacklogIds(new Set());
  };

  // Open batch or single transfer dialog
  const handleOpenBatchTransfer = () => {
    if (selectedBacklogIds.size === 0) return;
    setTransferCardIds(Array.from(selectedBacklogIds));
    setTransferStartDate(new Date().toLocaleDateString("en-CA"));
    setTransferTime("19:00");
    setTransferMode("sequential");
    setTransferModalOpen(true);
  };

  const handleOpenSingleCardTransfer = (card: BoardCard) => {
    setTransferCardIds([card.id]);
    setTransferStartDate(new Date().toLocaleDateString("en-CA"));
    setTransferTime(
      card.scheduled_at
        ? new Date(card.scheduled_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "19:00"
    );
    setTransferMode("same_day");
    setTransferModalOpen(true);
  };

  // Execute transfer via POST /api/board/cards/transfer
  const handleExecuteTransfer = async () => {
    if (transferCardIds.length === 0) return;
    setIsTransferring(true);
    try {
      const res = await fetch("/api/board/cards/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardIds: transferCardIds,
          startDate: transferStartDate,
          mode: transferCardIds.length > 1 ? transferMode : "same_day",
          time: transferTime,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to transfer posts");
      }

      // Deselect transferred cards
      setSelectedBacklogIds((prev) => {
        const next = new Set(prev);
        for (const id of transferCardIds) {
          next.delete(id);
        }
        return next;
      });

      setTransferModalOpen(false);
      await mutate();
      addToast({
        title: "Posts Scheduled",
        description: `Successfully scheduled ${transferCardIds.length} post${
          transferCardIds.length > 1 ? "s" : ""
        } to your posting calendar.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to transfer posts";
      addToast({ title: "Transfer Failed", description: msg, variant: "error" });
    } finally {
      setIsTransferring(false);
    }
  };

  // Compute live preview of scheduled dates
  const previewScheduleDays = useMemo(() => {
    if (transferCardIds.length === 0 || !transferStartDate) return [];
    const [year, month, day] = transferStartDate.split("-").map(Number);
    if (!year || !month || !day) return [];

    const base = new Date(year, month - 1, day);
    const results: { cardIndex: number; formatted: string }[] = [];

    for (let i = 0; i < transferCardIds.length; i++) {
      const d = new Date(base);
      if (transferMode === "sequential") {
        d.setDate(d.getDate() + i);
      }
      const formatted = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      results.push({ cardIndex: i + 1, formatted });
    }
    return results;
  }, [transferCardIds, transferStartDate, transferMode]);

  // Handler: Immediate single card Facebook publish
  const handlePublishNow = async (card: BoardCard) => {
    setPublishingCardId(card.id);
    try {
      const res = await fetch(`/api/board/cards/${card.id}/publish-now`, {
        method: "POST",
      });
      const json: ApiResponse<{ message: string; postUrl: string; pageName: string }> =
        await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to publish post to Facebook");
      }

      await mutate();
      addToast({
        title: "Published to Facebook!",
        description: json.data?.message || `Post published live to your Facebook Page feed.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing to Facebook failed";
      addToast({ title: "Publish Failed", description: msg, variant: "error" });
    } finally {
      setPublishingCardId(null);
    }
  };

  // Handler: Immediate batch Facebook publish for selected cards
  const handleBatchPublishNow = async () => {
    if (selectedBacklogIds.size === 0) return;
    const cardIds = Array.from(selectedBacklogIds);
    setIsBatchPublishing(true);
    try {
      const res = await fetch("/api/board/cards/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds }),
      });
      const json: ApiResponse<{ publishedCount: number; failedCount: number; pageName: string }> =
        await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Batch publish failed");
      }

      setSelectedBacklogIds(new Set());
      await mutate();
      addToast({
        title: "Published to Facebook!",
        description: `Successfully published ${json.data.publishedCount} post(s) to ${json.data.pageName} feed.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish posts";
      addToast({ title: "Publish Failed", description: msg, variant: "error" });
    } finally {
      setIsBatchPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Posting Board
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Manage your publishing pipeline. Approved posts wait in your Backlog until scheduled onto calendar dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button href="/dashboard/review" size="sm" variant="outline">
            <Layers size={14} />
            <span>Review Deck</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 border border-border rounded-xl bg-surface text-center space-y-3 font-mono">
          <Loader2 size={24} className="animate-spin text-muted mx-auto" />
          <p className="text-xs text-muted">Loading posting board...</p>
        </div>
      ) : columns.length === 0 ? (
        <EmptyState
          icon="calendar_month"
          title="Posting Board Not Initialized"
          description="Initialize your posting board by reviewing and approving generated posts."
          action={
            <Button variant="primary" size="sm" href="/dashboard/review">
              <span>Go to Review Deck</span>
            </Button>
          }
        />
      ) : (
        /* Horizontal Board Scroll View */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
            {columns.map((column) => {
              const columnCards = cards
                .filter((c) => c.column_id === column.id)
                .sort((a, b) => a.position - b.position);

              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  onRemoveCard={handleRemoveCard}
                  onScheduleTime={handleOpenScheduleModal}
                  onDeleteColumn={!column.board_date ? undefined : handleDeleteColumn}
                  onAddDate={() => {
                    setNewColumnDate(new Date().toLocaleDateString("en-CA"));
                    setAddDateModalOpen(true);
                  }}
                  selectedCardIds={selectedBacklogIds}
                  publishingCardId={publishingCardId}
                  isBatchPublishing={isBatchPublishing}
                  onToggleSelectCard={handleToggleCardSelect}
                  onSelectAllBacklog={handleSelectAllBacklog}
                  onDeselectAllBacklog={handleDeselectAllBacklog}
                  onOpenBatchTransfer={handleOpenBatchTransfer}
                  onOpenBatchPostNow={handleBatchPublishNow}
                  onTransferSingleCard={handleOpenSingleCardTransfer}
                  onPublishNow={handlePublishNow}
                />
              );
            })}

            {/* Quick "+ Add Date" Column Placeholder Card */}
            <div className="w-72 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewColumnDate(new Date().toLocaleDateString("en-CA"));
                  setAddDateModalOpen(true);
                }}
                className="w-full h-44 border-2 border-dashed border-border hover:border-foreground rounded-xl flex flex-col items-center justify-center gap-2.5 text-muted hover:text-foreground transition-all font-mono text-xs cursor-pointer group bg-surface-strong/20 hover:bg-surface-strong/60 shadow-xs"
              >
                <div className="w-10 h-10 rounded-full bg-surface-strong group-hover:bg-foreground group-hover:text-background flex items-center justify-center transition-colors">
                  <Plus size={20} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-sm block text-foreground">+ Add Date Column</span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    Click to pick a day on the calendar
                  </span>
                </div>
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="p-3 bg-surface border-2 border-foreground rounded-lg shadow-xl font-mono text-xs w-64 rotate-2">
                <span className="font-bold text-foreground text-[11px] block">
                  {activeCard.prompts?.style || "Post"}
                </span>
                <p className="text-muted text-[11px] line-clamp-2 mt-1">
                  {activeCard.prompts?.caption || activeCard.prompts?.image_prompt}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ========================================================
          ADD DYNAMIC DATE COLUMN DIALOG
          ======================================================== */}
      <Dialog
        open={addDateModalOpen}
        onOpenChange={setAddDateModalOpen}
        title="Add Date Column"
        description="Add a specific calendar date to your board to schedule and organize posts."
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs">
          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
              Quick Shortcuts
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewColumnDate(new Date().toLocaleDateString("en-CA"))}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 86400000);
                  setNewColumnDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 3 * 86400000);
                  setNewColumnDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                In 3 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 7 * 86400000);
                  setNewColumnDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Next Week
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-column-date"
              className="block text-foreground font-semibold uppercase text-[10px]"
            >
              Select Calendar Date
            </label>
            <input
              id="new-column-date"
              type="date"
              value={newColumnDate}
              onChange={(e) => setNewColumnDate(e.target.value)}
              className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
            />
          </div>

          {/* Optional Custom Column Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="new-column-title"
              className="block text-muted font-semibold uppercase text-[10px]"
            >
              Custom Title (Optional)
            </label>
            <input
              id="new-column-title"
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="e.g. Weekend Feature or Campaign Launch"
              className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setAddDateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isAddingColumn}
              onClick={() => handleAddDateColumn(newColumnDate, newColumnTitle)}
            >
              Add Column
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================
          CARD DATE & TIME SCHEDULING DIALOG
          ======================================================== */}
      <Dialog
        open={Boolean(schedulingCard)}
        onOpenChange={(open) => !open && setSchedulingCard(null)}
        title="Schedule Post"
        description="Pick the publishing date and exact time for this post."
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs">
          {/* Publishing Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="scheduled-date-input"
              className="block text-foreground font-semibold uppercase text-[10px]"
            >
              Publishing Date
            </label>
            <input
              id="scheduled-date-input"
              type="date"
              value={scheduledDateInput}
              onChange={(e) => setScheduledDateInput(e.target.value)}
              className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
            />
          </div>

          {/* Publishing Time */}
          <div className="space-y-1.5">
            <label
              htmlFor="scheduled-time-input"
              className="block text-foreground font-semibold uppercase text-[10px]"
            >
              Publishing Time (Asia/Manila PHT)
            </label>
            <input
              id="scheduled-time-input"
              type="time"
              value={scheduledTimeInput}
              onChange={(e) => setScheduledTimeInput(e.target.value)}
              className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
            />
          </div>

          <div className="p-3 bg-surface-strong border border-border rounded-lg text-muted text-[11px] space-y-1">
            <p>• If the date column does not exist yet, it will be added to your board automatically.</p>
            <p>• Once scheduled, Meta or our background worker publishes it on the minute.</p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setSchedulingCard(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSavingSchedule}
              onClick={handleSaveScheduledDateTime}
            >
              Save Schedule
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Daily Cap Error Modal */}
      <Dialog
        open={Boolean(capErrorModal)}
        onOpenChange={(open) => !open && setCapErrorModal(null)}
        title="Daily Post Limit Reached"
        description="This day column has reached its configured post cap."
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs text-muted">
          <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-lg flex items-center gap-2 text-status-error">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{capErrorModal}</span>
          </div>
          <p>
            To prevent spamming social feeds, AutoPost Studio caps the number of posts scheduled per day.
            You can adjust this cap in your workspace Settings.
          </p>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setCapErrorModal(null)}>
              Close
            </Button>
            <Button variant="primary" size="sm" href="/dashboard/settings">
              Adjust in Settings
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================
          TRANSFER TO SCHEDULE DIALOG (BATCH / ONE-ON-ONE)
          ======================================================== */}
      <Dialog
        open={transferModalOpen}
        onOpenChange={(open) => !open && setTransferModalOpen(false)}
        title={
          transferCardIds.length > 1
            ? `Transfer ${transferCardIds.length} Posts to Schedule`
            : "Schedule Backlog Post"
        }
        description={
          transferCardIds.length > 1
            ? "Choose your scheduling cadence and starting date. Required date columns will be added to your board automatically."
            : "Select the date and time to publish this post. The date column will be added to your board automatically."
        }
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          {/* Scheduling Cadence (When > 1 card selected) */}
          {transferCardIds.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-foreground font-semibold uppercase text-[10px]">
                Scheduling Cadence
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferMode("sequential")}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    transferMode === "sequential"
                      ? "border-foreground bg-surface-strong shadow-xs text-foreground"
                      : "border-border bg-surface text-muted hover:border-foreground/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground text-xs">
                      1 Post Per Day (Sequential)
                    </span>
                    {transferMode === "sequential" && (
                      <span className="w-2 h-2 rounded-full bg-accent-ready" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    One-on-one schedule: spreads {transferCardIds.length} posts across consecutive days.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferMode("same_day")}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    transferMode === "same_day"
                      ? "border-foreground bg-surface-strong shadow-xs text-foreground"
                      : "border-border bg-surface text-muted hover:border-foreground/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground text-xs">
                      All on Same Day
                    </span>
                    {transferMode === "same_day" && (
                      <span className="w-2 h-2 rounded-full bg-accent-ready" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    Places all {transferCardIds.length} posts onto the same single date column.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
              {transferMode === "sequential" && transferCardIds.length > 1
                ? "Start Date Presets"
                : "Date Presets"}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTransferStartDate(new Date().toLocaleDateString("en-CA"))}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 86400000);
                  setTransferStartDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 3 * 86400000);
                  setTransferStartDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                In 3 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 7 * 86400000);
                  setTransferStartDate(d.toLocaleDateString("en-CA"));
                }}
                className="px-2.5 py-1 rounded bg-surface-strong border border-border hover:border-foreground transition-colors cursor-pointer text-xs"
              >
                Next Week
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label
                htmlFor="transfer-start-date"
                className="block text-foreground font-semibold uppercase text-[10px]"
              >
                {transferMode === "sequential" && transferCardIds.length > 1
                  ? "Start Date (First Post)"
                  : "Scheduled Date"}
              </label>
              <input
                id="transfer-start-date"
                type="date"
                value={transferStartDate}
                onChange={(e) => setTransferStartDate(e.target.value)}
                className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
              />
            </div>

            {/* Publishing Time */}
            <div className="space-y-1.5">
              <label
                htmlFor="transfer-time"
                className="block text-foreground font-semibold uppercase text-[10px]"
              >
                Publishing Time (Asia/Manila PHT)
              </label>
              <input
                id="transfer-time"
                type="time"
                value={transferTime}
                onChange={(e) => setTransferTime(e.target.value)}
                className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
          </div>

          {/* Schedule Preview */}
          <div className="p-3 bg-surface-strong/70 border border-border rounded-lg space-y-2">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
              Schedule Preview
            </span>
            <div className="space-y-1 text-[11px] text-foreground">
              {previewScheduleDays.slice(0, 4).map((p) => (
                <div key={p.cardIndex} className="flex items-center justify-between">
                  <span className="text-muted">Post #{p.cardIndex}:</span>
                  <span className="font-semibold">{p.formatted} at {transferTime}</span>
                </div>
              ))}
              {previewScheduleDays.length > 4 && (
                <p className="text-muted text-[10px] pt-1">
                  ... and {previewScheduleDays.length - 4} more consecutive days ending on{" "}
                  <strong className="text-foreground">
                    {previewScheduleDays[previewScheduleDays.length - 1].formatted}
                  </strong>
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isTransferring}
              onClick={() => setTransferModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isTransferring}
              onClick={handleExecuteTransfer}
            >
              <span>
                {transferCardIds.length > 1
                  ? `Transfer ${transferCardIds.length} Posts`
                  : "Schedule Post"}
              </span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Floating Action Bar when Backlog Cards Selected */}
      {selectedBacklogIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur border border-foreground/30 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 font-mono text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent-ready animate-pulse" />
            <span>
              {selectedBacklogIds.size} post{selectedBacklogIds.size > 1 ? "s" : ""} selected in Backlog
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedBacklogIds(new Set())}
              className="rounded-full h-7 px-3 text-[11px]"
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchPublishNow}
              disabled={isBatchPublishing}
              className="rounded-full h-7 px-3.5 text-[11px] gap-1.5 font-bold border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/10"
              title="Post selected cards immediately to Facebook Page feed"
            >
              {isBatchPublishing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              <span>Post Now to FB</span>
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenBatchTransfer}
              className="rounded-full h-7 px-3.5 text-[11px] gap-1.5 shadow-md"
            >
              <Calendar size={12} />
              <span>Transfer to Schedule</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
