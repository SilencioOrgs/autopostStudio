"use client";

import React from "react";
import { FacebookIcon, TikTokIcon } from "@/_components/ui/icons";
import { SectionHeader } from "@/_components/ui/section-header";
import { useMotionSafe } from "@/_design-system/motion";

interface PlatformItem {
  name: string;
  badge: "AVAILABLE" | "COMING SOON";
  description: string;
  icon: React.ReactNode;
}

const PLATFORMS: PlatformItem[] = [
  {
    name: "Facebook Pages",
    badge: "AVAILABLE",
    description: "Direct Graph API photo & caption scheduling",
    icon: (
      <div className="w-8 h-8 rounded-xs bg-[#1877F2] text-white flex items-center justify-center shrink-0">
        <FacebookIcon size={18} />
      </div>
    ),
  },
  {
    name: "Instagram",
    badge: "COMING SOON",
    description: "Feed posts, carousels, and visual stories",
    icon: (
      <div className="w-8 h-8 rounded-xs bg-surface-strong border border-border text-foreground flex items-center justify-center shrink-0 font-bold text-xs">
        IG
      </div>
    ),
  },
  {
    name: "TikTok",
    badge: "COMING SOON",
    description: "Multi-photo carousels and slide audio tracks",
    icon: (
      <div className="w-8 h-8 rounded-xs bg-foreground text-background flex items-center justify-center shrink-0">
        <TikTokIcon size={18} />
      </div>
    ),
  },
  {
    name: "X (Twitter)",
    badge: "COMING SOON",
    description: "Image attachments and automated threaded updates",
    icon: (
      <div className="w-8 h-8 rounded-xs bg-surface-strong border border-border text-foreground flex items-center justify-center shrink-0 font-bold text-xs">
        𝕏
      </div>
    ),
  },
  {
    name: "LinkedIn",
    badge: "COMING SOON",
    description: "Company page updates and document carousels",
    icon: (
      <div className="w-8 h-8 rounded-xs bg-[#0A66C2] text-white flex items-center justify-center shrink-0 font-bold text-xs">
        in
      </div>
    ),
  },
];

export function PlatformRowSection() {
  const { shouldReduceMotion } = useMotionSafe();

  return (
    <section className="py-20 border-y border-border bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        <SectionHeader
          counter="02 / 09"
          eyebrow="INTEGRATIONS & CHANNELS"
          title="Engineered for your social surfaces"
          description="Direct Graph API publishing to Facebook Pages is live today. Connect your pages in seconds with zero manual upload steps."
        />
      </div>

      {/* Infinite Marquee Container */}
      <div className="relative w-full overflow-hidden group">
        {/* Left & Right subtle fade gradients */}
        <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div
          className={`flex gap-6 w-max ${
            shouldReduceMotion
              ? "justify-center mx-auto"
              : "animate-marquee group-hover:[animation-play-state:paused]"
          }`}
          style={{
            animationDuration: "35s",
          }}
        >
          {/* Double the list for seamless looping */}
          {[...PLATFORMS, ...PLATFORMS].map((platform, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 px-6 py-4 bg-surface-strong border border-border rounded-xs w-80 shrink-0 hover:border-border-strong transition-colors"
            >
              {platform.icon}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-display font-semibold text-foreground text-sm truncate">
                    {platform.name}
                  </h4>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-xs uppercase tracking-wider ${
                      platform.badge === "AVAILABLE"
                        ? "bg-accent-ready/15 text-accent-ready border border-accent-ready/30"
                        : "bg-surface border border-border text-muted"
                    }`}
                  >
                    {platform.badge}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted truncate">
                  {platform.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
