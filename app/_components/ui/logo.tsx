import Link from "next/link";
import React from "react";

interface LogoProps {
  href?: string;
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({
  href = "/",
  className = "",
  showText = true,
  size = "md",
}: LogoProps) {
  const sizeMap = {
    sm: { box: "w-6 h-6", text: "text-sm", mark: 14 },
    md: { box: "w-8 h-8", text: "text-base", mark: 18 },
    lg: { box: "w-10 h-10", text: "text-lg", mark: 22 },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Engineered Aperture/Pipeline Symbol */}
      <div
        className={`${currentSize.box} bg-foreground text-background flex items-center justify-center rounded-xs shadow-xs transition-transform hover:scale-105`}
        aria-hidden="true"
      >
        <svg
          width={currentSize.mark}
          height={currentSize.mark}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Automated Pipeline Aperture Graphic */}
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 8h10" />
          <path d="M7 12h6" />
          <circle cx="16" cy="14" r="2" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-display font-bold text-foreground tracking-tight ${currentSize.text}`}
        >
          AutoPost<span className="text-muted font-normal ml-1">Studio</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex rounded-xs focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
        aria-label="AutoPost Studio Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
