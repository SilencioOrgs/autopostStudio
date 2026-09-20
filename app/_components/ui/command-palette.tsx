"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Bookmark,
  Hourglass,
  CheckSquare,
  Calendar,
  Send,
  Settings,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { modalOverlayVariants, modalContentVariants } from "@/_design-system/motion";

interface CommandItem {
  id: string;
  label: string;
  category: "Navigation" | "Actions";
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const handleClose = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setInternalOpen(false);
    }
    setQuery("");
    setSelectedIndex(0);
  }, [onOpenChange]);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (onOpenChange) {
          onOpenChange(!isOpen);
        } else {
          setInternalOpen((prev) => !prev);
        }
      }
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange, handleClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: "dash",
      label: "Go to Dashboard",
      category: "Navigation",
      icon: <LayoutDashboard size={16} />,
      shortcut: "G D",
      action: () => {
        router.push("/dashboard");
        handleClose();
      },
    },
    {
      id: "prompts",
      label: "View Prompt Library",
      category: "Navigation",
      icon: <Bookmark size={16} />,
      shortcut: "G P",
      action: () => {
        router.push("/dashboard/prompts");
        handleClose();
      },
    },
    {
      id: "queue",
      label: "Open Generation Queue",
      category: "Navigation",
      icon: <Hourglass size={16} />,
      shortcut: "G Q",
      action: () => {
        router.push("/dashboard/queue");
        handleClose();
      },
    },
    {
      id: "review",
      label: "Review Pending Posts",
      category: "Navigation",
      icon: <CheckSquare size={16} />,
      shortcut: "G R",
      action: () => {
        router.push("/dashboard/review");
        handleClose();
      },
    },
    {
      id: "schedule",
      label: "Open Publishing Schedule",
      category: "Navigation",
      icon: <Calendar size={16} />,
      shortcut: "G S",
      action: () => {
        router.push("/dashboard/schedule");
        handleClose();
      },
    },
    {
      id: "posts",
      label: "View Published Posts",
      category: "Navigation",
      icon: <Send size={16} />,
      action: () => {
        router.push("/dashboard/posts");
        handleClose();
      },
    },
    {
      id: "settings",
      label: "Manage Settings & Keys",
      category: "Navigation",
      icon: <Settings size={16} />,
      action: () => {
        router.push("/dashboard/settings");
        handleClose();
      },
    },
    {
      id: "theme",
      label: `Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`,
      category: "Actions",
      icon: resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />,
      action: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        handleClose();
      },
    },
  ];

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="combobox"
            aria-expanded="true"
            className="relative w-full max-w-xl bg-surface border border-border shadow-2xl rounded-xs overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-border gap-3">
              <Search size={18} className="text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDownNav}
                placeholder="Search routes, prompts, and actions... (Esc to close)"
                className="w-full bg-transparent text-body-md text-foreground placeholder:text-muted focus:outline-none"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 border border-border text-muted rounded-xs uppercase">
                ESC
              </span>
            </div>

            {/* Command Results */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-body-sm text-muted">
                  No matching commands found.
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xs text-body-sm cursor-pointer select-none transition-colors ${
                        isSelected
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-surface-strong"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isSelected ? "text-background" : "text-muted"}>
                          {item.icon}
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.shortcut ? (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-xs uppercase ${
                            isSelected
                              ? "border-background/30 text-background/80"
                              : "border-border text-muted"
                          }`}
                        >
                          {item.shortcut}
                        </span>
                      ) : (
                        <ArrowRight size={14} className="opacity-40" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer status */}
            <div className="px-4 py-2 border-t border-border bg-surface-strong flex items-center justify-between text-[11px] font-mono text-muted">
              <span>AutoPost Studio Command Bar</span>
              <span>↑↓ Navigate · ↵ Select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
