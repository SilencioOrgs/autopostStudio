"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, RotateCw, Layers } from "lucide-react";
import { SectionHeader } from "@/_components/ui/section-header";
import { Button } from "@/_components/ui/button";
import { FacebookPostPreview } from "@/_components/ui/facebook-post-preview";
import { Skeleton } from "@/_components/ui/skeleton";

const DEMO_PRESETS = [
  {
    title: "Minimalist Coffee Packaging",
    prompt: "Matte black foil coffee pouch on raw travertine stone, golden directional spotlight, 4:5 vertical editorial product shot.",
    caption: "Designed for freshness and tactile simplicity. Single-origin Huila beans now roasting.",
    hashtags: ["#NorthlineRoasters", "#CoffeePackaging", "#MinimalistDesign"],
  },
  {
    title: "Industrial Minimalist Lounge",
    brand: "Studio Nine",
    prompt: "Monochrome industrial studio with brushed steel fixtures and raw graphite desk, high contrast directional natural lighting.",
    caption: "Form follows precision. Engineered spaces designed for creative flow and focus.",
    hashtags: ["#StudioNine", "#IndustrialInterior", "#ConcreteLoft"],
  },
  {
    title: "Swiss Typography Specimen",
    prompt: "Grid-aligned typographic poster layout, high contrast stark monochrome typography, matte ink finish, ultra-crisp macro photography.",
    caption: "Clarity above all else. Reviewing test proofs for our upcoming technical release.",
    hashtags: ["#Typography", "#SwissDesign", "#PrintEngineering"],
  },
];

type DemoStage = "idle" | "queued" | "generating" | "ready" | "scheduled";

export function InteractiveDemoSection() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customPrompt, setCustomPrompt] = useState(DEMO_PRESETS[0].prompt);
  const [stage, setStage] = useState<DemoStage>("idle");

  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    setCustomPrompt(DEMO_PRESETS[index].prompt);
    setStage("idle");
  };

  const handleRunSimulation = () => {
    if (stage === "generating" || stage === "queued") return;

    setStage("queued");
    setTimeout(() => {
      setStage("generating");
      setTimeout(() => {
        setStage("ready");
      }, 1800);
    }, 600);
  };

  const activeData = DEMO_PRESETS[selectedPreset];

  return (
    <section id="demo" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeader
        counter="05 / 09"
        eyebrow="LIVE SIMULATION"
        title="Experience the automated pipeline"
        description="Try a simulated run directly in your browser. Watch a prompt transform through generation and approval with zero account required."
      />

      <div className="mt-14 p-6 sm:p-10 border border-border bg-surface rounded-xs shadow-2xl space-y-8">
        {/* Top Preset Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-muted mr-2">Presets:</span>
            {DEMO_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(idx)}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono transition-colors cursor-pointer select-none ${
                  selectedPreset === idx
                    ? "bg-foreground text-background font-semibold"
                    : "bg-surface-strong text-muted hover:text-foreground border border-border"
                }`}
              >
                {preset.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="code-pill text-[10px] bg-accent-ready/15 text-accent-ready border-accent-ready/30">
              DEMO — NO ACCOUNT NEEDED
            </span>
          </div>
        </div>

        {/* Composer & Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Prompt Composer */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label
                htmlFor="demo-prompt-input"
                className="block text-xs font-mono uppercase tracking-wider text-muted font-semibold mb-2"
              >
                Image Prompt Input (Row 01 of Spreadsheet)
              </label>
              <textarea
                id="demo-prompt-input"
                rows={4}
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  setStage("idle");
                }}
                className="w-full p-3.5 bg-surface-strong border border-border rounded-xs text-body-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground font-mono leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 border border-border bg-surface-strong rounded-xs">
                <span className="text-muted block text-[10px]">TARGET RATIO</span>
                <span className="text-foreground font-semibold">4:5 Portrait Feed</span>
              </div>
              <div className="p-3 border border-border bg-surface-strong rounded-xs">
                <span className="text-muted block text-[10px]">AI MODEL</span>
                <span className="text-foreground font-semibold">Imagen 3 Studio API</span>
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-2">
              <Button
                size="md"
                variant="primary"
                className="w-full"
                onClick={handleRunSimulation}
                loading={stage === "queued" || stage === "generating"}
              >
                <Sparkles size={16} />
                <span>
                  {stage === "idle"
                    ? "Trigger Pipeline Simulation"
                    : stage === "queued"
                    ? "Queuing worker pool..."
                    : stage === "generating"
                    ? "Rendering with AI (1.8s)..."
                    : stage === "ready"
                    ? "Regenerate Post Visual"
                    : "Post Scheduled Successfully"}
                </span>
              </Button>
            </div>

            {/* Status Steps Indicator */}
            <div className="p-3.5 border border-border bg-surface-strong rounded-xs space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-muted">PIPELINE EXECUTION STATE:</span>
                <span className="text-foreground font-semibold uppercase">{stage}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div
                  className={`h-1 rounded-full ${
                    stage !== "idle" ? "bg-foreground" : "bg-border"
                  }`}
                />
                <div
                  className={`h-1 rounded-full ${
                    stage === "generating" || stage === "ready" || stage === "scheduled"
                      ? "bg-accent-generate"
                      : "bg-border"
                  }`}
                />
                <div
                  className={`h-1 rounded-full ${
                    stage === "ready" || stage === "scheduled"
                      ? "bg-accent-ready"
                      : "bg-border"
                  }`}
                />
                <div
                  className={`h-1 rounded-full ${
                    stage === "scheduled" ? "bg-accent-schedule" : "bg-border"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Rendered Output */}
          <div className="lg:col-span-6">
            {stage === "idle" && (
              <div className="p-8 border border-dashed border-border rounded-xs text-center space-y-3 bg-surface-strong">
                <Layers size={32} className="text-muted mx-auto" />
                <h4 className="font-display font-semibold text-foreground">
                  Ready to simulate
                </h4>
                <p className="text-body-sm text-muted max-w-sm mx-auto">
                  Click &apos;Trigger Pipeline Simulation&apos; above to watch the post transition from prompt to rendered draft.
                </p>
              </div>
            )}

            {(stage === "queued" || stage === "generating") && (
              <div className="space-y-4 p-6 border border-border bg-surface-strong rounded-xs">
                <div className="flex items-center justify-between text-xs font-mono text-muted">
                  <span>RENDER WORKER ACTIVE</span>
                  <span className="text-accent-generate animate-pulse">GENERATING 4:5</span>
                </div>
                <Skeleton height={260} className="w-full" />
                <Skeleton height={20} className="w-3/4" />
                <Skeleton height={16} className="w-1/2" />
              </div>
            )}

            {(stage === "ready" || stage === "scheduled") && (
              <div className="space-y-4">
                <FacebookPostPreview
                  pageName="Studio Nine Official"
                  statusText={stage === "scheduled" ? "Scheduled for Today 7:00 PM" : "Ready for Approval"}
                  caption={activeData.caption}
                  hashtags={activeData.hashtags}
                  aspect="4:5"
                  showImage
                  statusBadge={stage === "scheduled" ? "SCHEDULED" : "AWAITING APPROVAL"}
                />

                {stage === "ready" && (
                  <div className="flex gap-3">
                    <Button
                      size="md"
                      variant="primary"
                      className="flex-1"
                      onClick={() => setStage("scheduled")}
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve &amp; Schedule for Today</span>
                    </Button>
                    <Button
                      size="md"
                      variant="outline"
                      onClick={() => setStage("idle")}
                    >
                      <RotateCw size={14} />
                      <span>Reset</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
