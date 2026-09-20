import React from "react";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/_components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
      {/* Background Monochrome Grid */}
      <div className="absolute inset-0 bg-grid-monochrome opacity-60 pointer-events-none -z-10" />

      <div className="max-w-md w-full space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-strong border border-border rounded-xs text-[11px] font-mono select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-error" />
          <span>HTTP_STATUS // 404_NOT_FOUND</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-mono text-7xl font-bold tracking-tighter text-foreground">
            404
          </h1>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Endpoint not located
          </h2>
          <p className="text-body-sm text-muted leading-relaxed">
            The route or pipeline resource you requested does not exist or has been relocated to another workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button href="/dashboard" variant="primary" size="md">
            <LayoutDashboard size={16} />
            <span>Open Dashboard</span>
          </Button>
          <Button href="/" variant="outline" size="md">
            <ArrowLeft size={16} />
            <span>Return Home</span>
          </Button>
        </div>

        <div className="pt-8 border-t border-border/80 text-xs font-mono text-muted">
          AutoPost Studio Core Routing · Turbopack App Router
        </div>
      </div>
    </div>
  );
}
