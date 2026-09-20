"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/_components/ui/button";

export function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("autopost_cookies_accepted");
    if (!accepted) {
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("autopost_cookies_accepted", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border py-3.5 px-4 sm:px-6 shadow-xl"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-body-sm text-muted text-center sm:text-left">
              We use essential cookies to maintain your workspace session and preferences. By continuing, you agree to our{" "}
              <Link href="/legal/privacy" className="text-foreground underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <Button size="sm" variant="secondary" onClick={handleAccept}>
                Decline optional
              </Button>
              <Button size="sm" variant="primary" onClick={handleAccept}>
                Accept all
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
