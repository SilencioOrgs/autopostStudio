"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("autopost_announcement_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("autopost_announcement_dismissed", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="border-b border-border bg-surface-strong overflow-hidden relative z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-body-sm text-foreground">
            <div className="flex items-center gap-2.5 mx-auto">
              <span className="code-pill text-[10px] py-0.5 px-2 bg-foreground text-background">
                NEW
              </span>
              <span className="text-muted">
                AutoPost Studio v2 is live: BYO AI keys, automated visual scheduling, and Facebook Pages support.
              </span>
              <Link
                href="/changelog"
                className="font-medium text-foreground hover:underline inline-flex items-center gap-1 text-xs"
              >
                Read changelog <ArrowRight size={12} />
              </Link>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-muted hover:text-foreground rounded-xs cursor-pointer ml-4 shrink-0 focus-visible:ring-1 focus-visible:ring-foreground"
              aria-label="Dismiss announcement"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
