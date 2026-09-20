import React from "react";
import { Icon } from "@/_design-system/icons";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center bg-surface/60 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-raised border border-border text-foreground flex items-center justify-center mb-4 shadow-xs">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="text-base font-bold font-display text-foreground mb-1">
        {title}
      </h3>
      <p className="text-xs text-muted max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
