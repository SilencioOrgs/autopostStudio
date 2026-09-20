"use client";

import React from "react";
import { Check, Bell, Lock } from "lucide-react";

interface PlatformCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onNotify?: () => void;
  notifyActive?: boolean;
}

export function PlatformCard({
  name,
  description,
  icon,
  selected = false,
  disabled = false,
  onSelect,
  onNotify,
  notifyActive = false,
}: PlatformCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={`relative rounded-xs p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 select-none ${
        disabled
          ? "bg-surface-strong/60 border border-border opacity-70 cursor-not-allowed"
          : selected
          ? "bg-surface-strong border-2 border-foreground shadow-lg cursor-pointer"
          : "bg-surface border border-border cursor-pointer hover:border-border-strong shadow-xs"
      }`}
    >
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>{icon}</div>
          <div>
            {selected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-foreground text-background">
                <Check size={12} />
                ACTIVE
              </span>
            ) : disabled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-muted bg-surface border border-border">
                <Lock size={11} />
                COMING SOON
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="font-display font-semibold text-lg text-foreground mb-2">
          {name}
        </h3>
        <p className="text-body-sm text-muted leading-relaxed">
          {description}
        </p>
      </div>

      {disabled && (
        <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
          <span className="text-xs font-mono text-muted">Join waitlist:</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNotify?.();
            }}
            className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              notifyActive
                ? "bg-foreground text-background font-semibold"
                : "bg-surface text-muted hover:text-foreground border border-border"
            }`}
          >
            <Bell size={12} />
            <span>{notifyActive ? "Notified" : "Notify me"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
