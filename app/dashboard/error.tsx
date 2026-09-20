"use client";

import { useEffect } from "react";
import { Button } from "@/_components/ui/button";
import { Icon } from "@/_design-system/icons";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error internally in mock mode
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-surface border border-border rounded-xl m-6">
      <div className="w-12 h-12 rounded-full bg-status-error/10 text-status-error flex items-center justify-center mb-4">
        <Icon name="error" size={28} />
      </div>
      <h2 className="text-xl font-bold font-display text-foreground mb-2">
        Something interrupted the dashboard
      </h2>
      <p className="text-sm text-muted max-w-md mx-auto mb-6">
        {error.message || "An unexpected error occurred while loading this section."}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => reset()} icon="refresh">
          Try again
        </Button>
        <Button variant="secondary" href="/dashboard">
          Back to overview
        </Button>
      </div>
    </div>
  );
}
