import React from "react";

export interface PostGraphicProps {
  title?: string;
  category?: string;
  aspect?: "4:5" | "1:1" | "16:9";
  className?: string;
  variant?: 1 | 2 | 3 | 4;
}

export function PostGraphic({
  title = "Automated Visual Draft",
  category = "CONTENT PIPELINE",
  aspect = "4:5",
  className = "",
  variant = 1,
}: PostGraphicProps) {
  const aspectClasses = {
    "4:5": "aspect-[4/5]",
    "1:1": "aspect-square",
    "16:9": "aspect-video",
  };

  const gradientStyles = [
    // Variant 1: Dark monochrome engineered grid with soft radial glow
    "from-surface to-background text-foreground",
    // Variant 2: High-contrast dark card
    "from-surface-strong to-surface text-foreground",
    // Variant 3: Deep subtle gradient
    "from-background to-surface-strong text-foreground",
    // Variant 4: Editorial ivory tone
    "from-surface to-surface-strong text-foreground",
  ];

  const currentGradient = gradientStyles[(variant - 1) % gradientStyles.length];

  return (
    <div
      className={`relative w-full ${aspectClasses[aspect]} bg-gradient-to-br ${currentGradient} border border-border rounded-xs overflow-hidden flex flex-col justify-between p-6 select-none ${className}`}
    >
      {/* Background Subtle Geometric Pattern */}
      <div className="absolute inset-0 bg-grid-monochrome opacity-40 pointer-events-none" />

      {/* Top Meta */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-muted">
        <span className="code-pill text-[10px]">{category}</span>
        <span>{aspect}</span>
      </div>

      {/* Center Visual Element */}
      <div className="relative z-10 my-auto flex flex-col items-center text-center px-4">
        <div className="w-12 h-12 rounded-xs border border-border bg-surface-strong flex items-center justify-center mb-3 shadow-xs">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-foreground"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <h4 className="font-display font-semibold text-foreground text-sm sm:text-base line-clamp-2 max-w-[240px]">
          {title}
        </h4>
      </div>

      {/* Bottom Footer Bar */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-muted border-t border-border/60 pt-3">
        <span>AUTOPOST // SYNTH</span>
        <span>RENDER_OK</span>
      </div>
    </div>
  );
}
