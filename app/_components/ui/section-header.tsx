import React from "react";

export interface SectionHeaderProps {
  counter: string; // e.g. "01 / 09"
  eyebrow: string; // e.g. "PLATFORM OVERVIEW"
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  counter,
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={`space-y-4 ${
        isCenter ? "text-center max-w-3xl mx-auto" : "max-w-2xl"
      } ${className}`}
    >
      <div
        className={`inline-flex items-center gap-2 text-muted font-mono text-[11px] uppercase tracking-[0.18em] font-medium select-none ${
          isCenter ? "justify-center" : ""
        }`}
      >
        <span className="text-foreground font-semibold">{counter}</span>
        <span className="text-border-strong opacity-40">/</span>
        <span>{eyebrow}</span>
      </div>

      <h2 className="text-display-lg text-foreground font-bold tracking-tight">
        {title}
      </h2>

      {description && (
        <p className="text-body-lg text-muted leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
