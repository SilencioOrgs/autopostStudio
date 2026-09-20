"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, CheckCircle2, Clock, Layers } from "lucide-react";
import { Button } from "@/_components/ui/button";
import { useMotionSafe, scrollRevealVariants } from "@/_design-system/motion";

export function HeroSection() {
  const { shouldReduceMotion } = useMotionSafe();

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Monochrome Faint Grid Background */}
      <div className="absolute inset-0 bg-grid-monochrome opacity-50 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <motion.div
            variants={scrollRevealVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-6 space-y-6"
          >
            {/* Section Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-strong border border-border rounded-full select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0 animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted font-semibold">
                01 / 09  CONTENT PIPELINE ENGINE
              </span>
            </div>

            {/* Display Headline */}
            <h1 className="text-display-xl font-bold tracking-tight text-foreground leading-[1.05]">
              The content pipeline that runs itself.
            </h1>

            {/* Subheading */}
            <p className="text-body-lg text-muted max-w-xl leading-relaxed">
              Bring your prompt sheets. AutoPost Studio renders high-fidelity visuals, formats platform-specific captions, holds every draft for your approval, then publishes on schedule.
            </p>

            {/* Dual CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Button href="/get-started" size="lg" variant="primary">
                <span>Start your pipeline</span>
                <ArrowRight size={16} />
              </Button>
              <Button href="#how-it-works" size="lg" variant="outline">
                <Play size={15} />
                <span>See how it works</span>
              </Button>
            </div>

            {/* Three Honest Behavior Metric Cards */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border">
              <div>
                <MetricCountUp value={30} suffix=" Posts" label="per single sheet import" />
              </div>
              <div>
                <MetricCountUp value={0} suffix=" Surprise Posts" label="nothing goes live without approval" />
              </div>
              <div>
                <MetricCountUp value={100} suffix="% Direct Rates" label="BYO Gemini or OpenAI key" />
              </div>
            </div>
          </motion.div>

          {/* Right Column: Code-built Animated Product Mockup */}
          <motion.div
            variants={scrollRevealVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="lg:col-span-6 relative flex justify-center"
          >
            <ProductDashboardMockup reducedMotion={shouldReduceMotion} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MetricCountUp({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const increment = value / (duration / 25);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
        {displayValue}
        <span className="text-muted font-normal text-lg sm:text-xl">{suffix}</span>
      </div>
      <p className="text-body-sm text-muted leading-tight font-mono text-[11px] uppercase">
        {label}
      </p>
    </div>
  );
}

function ProductDashboardMockup({ reducedMotion }: { reducedMotion: boolean }) {
  const [activeStep, setActiveStep] = useState(1);

  // Continuously advance the mock queue rows unless reduced motion is set
  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % 3) + 1);
    }, 2400);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="relative w-full max-w-lg select-none">
      {/* Ambient background glow behind mockup */}
      <div className="absolute -inset-4 bg-gradient-to-r from-foreground/5 to-transparent rounded-xs blur-2xl pointer-events-none -z-10" />

      {/* Window Frame Chrome */}
      <div className="glass-panel rounded-xs overflow-hidden shadow-2xl border border-border">
        {/* Top Window Bar */}
        <div className="px-4 py-3 bg-surface-strong border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-border-strong opacity-30" />
            <span className="w-2.5 h-2.5 rounded-full bg-border-strong opacity-30" />
            <span className="w-2.5 h-2.5 rounded-full bg-border-strong opacity-30" />
          </div>

          <div className="px-3 py-1 bg-surface border border-border rounded-xs text-[10px] font-mono text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-ready" />
            <span>autopost.studio // pipeline-live</span>
          </div>

          <div className="w-10" />
        </div>

        {/* Dashboard Interior */}
        <div className="p-5 space-y-5 bg-background">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="code-pill text-[10px]">ORGANIZATION</span>
                <span className="text-xs font-mono text-foreground font-semibold">
                  Studio Nine · Main Pipeline
                </span>
              </div>
              <p className="text-body-sm text-muted text-xs">
                Active Schedule: Facebook Page @studionine.official
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full status-dot-ready" />
              <span className="text-[11px] font-mono text-accent-ready font-semibold">
                30 OF 30 READY
              </span>
            </div>
          </div>

          {/* Simulated Active Generation Queue */}
          <div className="space-y-2 border border-border rounded-xs p-3.5 bg-surface">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted pb-2 border-b border-border">
              <span>ACTIVE GENERATION QUEUE</span>
              <span>BATCH #04 // 4:5 FEED</span>
            </div>

            {/* Queue Item 1 */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 text-body-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-xs bg-surface-strong border border-border flex items-center justify-center shrink-0">
                  <Layers size={14} className="text-foreground" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-foreground truncate">
                    Minimalist Desk Setup — Editorial Lighting
                  </p>
                  <p className="text-[10px] font-mono text-muted truncate">
                    Prompt: Matte black ceramics on brushed steel...
                  </p>
                </div>
              </div>
              <span className="code-pill text-[10px] border-accent-ready text-accent-ready shrink-0 ml-2">
                <CheckCircle2 size={10} className="mr-1" /> READY
              </span>
            </div>

            {/* Queue Item 2 (Animated ticking state) */}
            <div className="flex items-center justify-between py-2 border-b border-border/50 text-body-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-xs bg-surface-strong border border-border flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-accent-generate animate-spin" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-foreground truncate">
                    Acoustic Speaker Series Preview
                  </p>
                  <p className="text-[10px] font-mono text-muted truncate">
                    Prompt: Walnut baffle with dual woven drivers...
                  </p>
                </div>
              </div>
              <span
                className={`code-pill text-[10px] shrink-0 ml-2 ${
                  activeStep >= 2
                    ? "border-accent-ready text-accent-ready"
                    : "border-accent-generate text-accent-generate"
                }`}
              >
                {activeStep >= 2 ? (
                  <>
                    <CheckCircle2 size={10} className="mr-1" /> READY
                  </>
                ) : (
                  <>GENERATING...</>
                )}
              </span>
            </div>

            {/* Queue Item 3 */}
            <div className="flex items-center justify-between py-2 text-body-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-xs bg-surface-strong border border-border flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-muted" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-foreground truncate">
                    Typography Specimen Poster
                  </p>
                  <p className="text-[10px] font-mono text-muted truncate">
                    Prompt: Swiss typography layout, macro focus...
                  </p>
                </div>
              </div>
              <span className="code-pill text-[10px] border-accent-schedule text-accent-schedule shrink-0 ml-2">
                QUEUED
              </span>
            </div>
          </div>

          {/* Bottom Live Slot Mini-Calendar Bar */}
          <div className="p-3 border border-border bg-surface-strong rounded-xs flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-schedule" />
              <span className="text-muted">NEXT PUBLISH:</span>
              <span className="text-foreground font-semibold">TODAY AT 7:00 PM</span>
            </div>
            <span className="text-muted">SLOT 01 // 03</span>
          </div>
        </div>
      </div>
    </div>
  );
}
