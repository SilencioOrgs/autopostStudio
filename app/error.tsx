"use client";

import React, { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/_components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception for debugging
    console.error("AutoPost Studio Unhandled Exception:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
      <div className="absolute inset-0 bg-grid-monochrome opacity-60 pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-strong border border-border rounded-xs text-[11px] font-mono select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-error" />
          <span>HTTP_STATUS // 500_SERVER_ERROR</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-mono text-7xl font-bold tracking-tighter text-foreground">
            500
          </h1>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Pipeline runtime error
          </h2>
          <p className="text-body-sm text-muted leading-relaxed">
            An unexpected error interrupted the execution graph. You can retry the current operation or return to the workspace root.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-surface-strong border border-border rounded-xs text-xs font-mono text-muted text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="primary" size="md">
            <RotateCcw size={16} />
            <span>Try operation again</span>
          </Button>
          <Button href="/" variant="outline" size="md">
            <Home size={16} />
            <span>Return Home</span>
          </Button>
        </div>

        <div className="pt-8 border-t border-border/80 text-xs font-mono text-muted">
          AutoPost Studio Error Boundary · Client Session Intact
        </div>
      </div>
    </div>
  );
}
