import React from "react";
import { ExtendedStatus, STATUS_CONFIG } from "@/_lib/status";

interface StatusBadgeProps {
  status: ExtendedStatus;
  showDot?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({
  status,
  showDot = true,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unused;
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : size === "lg"
      ? "px-3 py-1 text-xs"
      : "px-2.5 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-wider font-semibold select-none ${sizeClasses} ${config.bg} ${config.text} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
