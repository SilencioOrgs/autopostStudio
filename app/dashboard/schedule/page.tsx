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
  onRemove,
  onScheduleTime,
}: {
  card: BoardCard;
  onRemove: (id: string) => void;
  onScheduleTime: (card: BoardCard) => void;
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
      className="p-3 bg-surface border border-border rounded-lg shadow-xs hover:border-foreground/40 transition-all font-mono text-xs space-y-2.5 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground p-0.5"
            aria-label="Drag card"
          >
            <GripVertical size={14} />
          </button>
          <span className="font-bold text-foreground text-[11px] truncate max-w-[130px]">
            {card.prompts?.style || "Post"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRemove(card.id)}
          className="opacity-0 group-hover:opacity-100 text-muted hover:text-status-error transition-opacity cursor-pointer p-0.5"
          title="Remove from board"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Caption Snippet */}
      <p className="text-muted text-[11px] line-clamp-2 leading-relaxed">
        {card.prompts?.caption || card.prompts?.image_prompt || "Post card"}
      </p>

      {/* Meta Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[10px] text-muted">
        <button
          type="button"
          onClick={() => onScheduleTime(card)}
          className="flex items-center gap-1 hover:text-foreground cursor-pointer"
        >
          <Clock size={11} className={card.scheduled_at ? "text-accent-ready" : "text-muted"} />
          <span>
            {card.scheduled_at
              ? new Date(card.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Set time"}
          </span>
        </button>

        {card.facebook_pages && (
          <div className="flex items-center gap-1 text-[#1877F2]">
            <FacebookIcon size={11} />
            <span className="truncate max-w-[80px]">{card.facebook_pages.page_name}</span>
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
}: {
  column: BoardColumn;
  cards: BoardCard[];
  onRemoveCard: (id: string) => void;
  onScheduleTime: (card: BoardCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { column },
  });

  const isBacklog = !column.board_date;
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
          {isBacklog ? <Layers size={14} className="text-muted" /> : <Calendar size={14} className="text-muted" />}
          <span className="font-bold text-foreground truncate max-w-[170px]">{displayTitle}</span>
        </div>
        <span className="text-[11px] px-1.5 py-0.5 rounded-xs bg-surface border border-border text-muted font-bold">
          {cards.length}
        </span>
      </div>

      {/* Card Items Container */}
      <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1 min-h-[140px]">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onRemove={onRemoveCard}
              onScheduleTime={onScheduleTime}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="h-24 border border-dashed border-border rounded-lg flex items-center justify-center text-muted font-mono text-[11px]">
            Drop post here
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

  // Time Schedule Modal
  const [schedulingCard, setSchedulingCard] = useState<BoardCard | null>(null);
  const [scheduledTimeInput, setScheduledTimeInput] = useState("19:00");

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

    const newPosition = calculateMidpointPosition(prevPos, nextPos);

    // Compute scheduledAt if moving to a calendar day
    let scheduledAt = draggedCard.scheduled_at;
    if (!isTargetBacklog && targetColumn?.board_date) {
      scheduledAt = new Date(`${targetColumn.board_date}T${scheduledTimeInput}:00+08:00`).toISOString();
    } else if (isTargetBacklog) {
      scheduledAt = null;
    }

    // Optimistic UI update
    const previousCards = [...cards];
    const optimisticCards = cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            column_id: targetColumnId,
            position: newPosition,
            scheduled_at: scheduledAt,
            status: isTargetBacklog ? ("planned" as const) : ("scheduled" as const),
          }
        : c
    );

    mutate({ columns, cards: optimisticCards }, false);

    // Server update
    try {
      const res = await fetch(`/api/board/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: targetColumnId,
          position: newPosition,
          scheduledAt,
        }),
      });

      const json: ApiResponse<BoardCard> = await res.json();
      if (!json.ok) {
        if (json.error.code === "DAILY_CAP_REACHED") {
          setCapErrorModal(json.error.message);
        }
        throw new Error(json.error.message);
      }

      await mutate();
      addToast({
        title: isTargetBacklog ? "Moved to Backlog" : "Post Scheduled",
        description: isTargetBacklog
          ? "Unplanned post placed in Backlog column."
          : `Scheduled for ${targetColumn?.title}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      // Revert optimistic update
      mutate({ columns, cards: previousCards }, false);
      const msg = err instanceof Error ? err.message : "Failed to move card";
      addToast({ title: "Move Failed", description: msg, variant: "error" });
    }
  };

  // Handler: Remove card from board
  const handleRemoveCard = async (cardId: string) => {
    try {
      const res = await fetch(`/api/board/cards/${cardId}`, { method: "DELETE" });
      const json: ApiResponse<{ deleted: boolean }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      await mutate();
      addToast({ title: "Card Removed", description: "Post unlinked from board.", variant: "neutral" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove card";
      addToast({ title: "Error", description: msg, variant: "error" });
    }
  };

  // Handler: Set time for card
  const handleSaveScheduledTime = async () => {
    if (!schedulingCard) return;

    const column = columns.find((c) => c.id === schedulingCard.column_id);
    if (!column?.board_date) {
      addToast({
        title: "Cannot set time in Backlog",
        description: "Drag the card onto a calendar day column first.",
        variant: "error",
      });
      return;
    }

    const scheduledAt = new Date(`${column.board_date}T${scheduledTimeInput}:00+08:00`).toISOString();

    try {
      const res = await fetch(`/api/board/cards/${schedulingCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });

      const json: ApiResponse<BoardCard> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      setSchedulingCard(null);
      await mutate();
      addToast({ title: "Time Updated", description: `Scheduled at ${scheduledTimeInput}.`, variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      addToast({ title: "Error", description: msg, variant: "error" });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-accent-ready" />
            <span className="font-mono text-xs text-muted uppercase tracking-wider">
              TRELLO-STYLE POSTING BOARD • 14 DAYS AHEAD
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
            Posting Board
          </h1>
          <p className="text-sm text-muted mt-1 font-mono">
            Plan your Facebook publishing calendar. Drag approved posts from Backlog onto any day column.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button href="/dashboard/review" size="sm" variant="outline">
            <span>Review Approved ({cards.filter((c) => !c.column_id || !c.scheduled_at).length})</span>
          </Button>
          <Button href="/dashboard/prompts" size="sm" variant="primary">
            <span>Queue More Prompts</span>
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
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
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
                  onScheduleTime={(card) => {
                    setSchedulingCard(card);
                    if (card.scheduled_at) {
                      const timePart = new Date(card.scheduled_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });
                      setScheduledTimeInput(timePart);
                    }
                  }}
                />
              );
            })}
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

      {/* Set Scheduled Time Dialog */}
      <Dialog
        open={Boolean(schedulingCard)}
        onOpenChange={(open) => !open && setSchedulingCard(null)}
        title="Set Publishing Time"
        description="Choose the exact time this post will publish to your Facebook Page."
        maxWidth="sm"
      >
        <div className="space-y-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="block text-foreground font-semibold uppercase text-[10px]">
              Publishing Time (Asia/Manila PHT)
            </label>
            <input
              type="time"
              value={scheduledTimeInput}
              onChange={(e) => setScheduledTimeInput(e.target.value)}
              className="w-full h-10 px-3 bg-surface-strong border border-border rounded-lg text-foreground focus:outline-none focus:border-foreground"
            />
          </div>

          <div className="p-3 bg-surface-strong border border-border rounded-lg text-muted text-[11px] space-y-1">
            <p>• If between 10 minutes and 30 days, Meta schedules this natively.</p>
            <p>• If under 10 minutes, our background worker publishes it on the minute.</p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setSchedulingCard(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveScheduledTime}>
              Save Time
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
