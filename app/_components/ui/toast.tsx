"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { toastVariants } from "@/_design-system/motion";

export type ToastVariant = "success" | "error" | "info" | "neutral" | "warn";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  addToast: (options: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, variant, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast, addToast: toast, dismiss }}>
      {children}

      {/* Stacked Toast Container Bottom-Right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence mode="sync">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isPaused, setIsPaused] = useState(false);

  React.useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss, isPaused]);

  const iconMap = {
    success: <CheckCircle2 size={18} className="text-status-success shrink-0" />,
    error: <AlertCircle size={18} className="text-status-error shrink-0" />,
    info: <Info size={18} className="text-status-info shrink-0" />,
    neutral: <Info size={18} className="text-foreground shrink-0" />,
    warn: <AlertCircle size={18} className="text-status-warning shrink-0" />,
  };

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="pointer-events-auto flex items-start gap-3 p-4 bg-surface border border-border shadow-xl rounded-xs text-foreground select-none"
    >
      {iconMap[toast.variant || "info"]}
      <div className="flex-1 min-w-0">
        <h4 className="text-label-md font-semibold text-foreground leading-tight">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-body-sm text-muted mt-1 leading-snug">
            {toast.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 text-muted hover:text-foreground rounded-xs cursor-pointer focus-visible:ring-1 focus-visible:ring-foreground"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
