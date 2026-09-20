import React from "react";

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  borderStrong?: boolean;
}

export function Panel({
  children,
  className = "",
  glass = false,
  borderStrong = false,
}: PanelProps) {
  return (
    <div
      className={`relative rounded-xs p-6 transition-all ${
        glass
          ? "glass-panel"
          : "bg-surface border " + (borderStrong ? "border-border-strong" : "border-border")
      } ${className}`}
    >
      {children}
    </div>
  );
}
