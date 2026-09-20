"use client";

import React, { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  modalOverlayVariants,
  drawerRightVariants,
  drawerBottomVariants,
} from "@/_design-system/motion";

export interface DrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
}

export function Drawer({
  isOpen,
  onClose,
  open,
  onOpenChange,
  title,
  description,
  children,
  width = "md",
}: DrawerProps) {
  const visible = open !== undefined ? open : (isOpen ?? false);
  const handleDismiss = useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  }, [onOpenChange, onClose]);

  // Handle Esc key and body scroll lock
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [visible, handleDismiss]);

  const widthClasses = {
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleDismiss}
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex">
            {/* Desktop right drawer & Mobile bottom sheet */}
            <motion.div
              variants={
                typeof window !== "undefined" && window.innerWidth < 640
                  ? drawerBottomVariants
                  : drawerRightVariants
              }
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              className={`w-screen ${widthClasses[width]} bg-surface border-l border-border shadow-2xl flex flex-col`}
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>

              {/* Drawer Header */}
              <div className="p-6 border-b border-border flex items-start justify-between gap-4">
                <div>
                  {title && (
                    <h3 className="text-headline-sm font-bold text-foreground">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-body-sm text-muted mt-1">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1.5 text-muted hover:text-foreground rounded-xs hover:bg-surface-strong transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
