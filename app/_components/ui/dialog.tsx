"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { modalOverlayVariants, modalContentVariants } from "@/_design-system/motion";

export interface DialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  isOpen,
  onClose,
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = "md",
}: DialogProps) {
  const visible = open !== undefined ? open : (isOpen ?? false);
  const handleDismiss = useCallback(() => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  }, [onOpenChange, onClose]);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc key and scroll lock
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [visible, handleDismiss]);

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleDismiss}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            ref={dialogRef}
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "dialog-title" : undefined}
            aria-describedby={description ? "dialog-description" : undefined}
            className={`relative w-full ${maxWidthStyles[maxWidth]} bg-surface border border-border rounded-xs shadow-2xl p-6 sm:p-8 z-10`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-5 right-5 p-1.5 text-muted hover:text-foreground rounded-xs hover:bg-surface-strong transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-foreground"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Header */}
            {(title || description) && (
              <div className="mb-6 pr-8">
                {title && (
                  <h3
                    id="dialog-title"
                    className="text-headline-sm font-bold text-foreground tracking-tight"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p
                    id="dialog-description"
                    className="text-body-sm text-muted mt-1.5 leading-relaxed"
                  >
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-body-md text-foreground">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
