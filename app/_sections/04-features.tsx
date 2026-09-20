"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  X,
  Clock,
  Cpu,
  CheckSquare,
  Calendar,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "@/_components/ui/section-header";
import { Button } from "@/_components/ui/button";
import { scrollRevealVariants } from "@/_design-system/motion";

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-24">
        <SectionHeader
          counter="04 / 09"
          eyebrow="CORE CAPABILITIES"
          title="Engineered for high-output automation"
          description="Replace manual content preparation with deterministic, automated stages designed to scale your brand presence."
        />

        {/* Feature 1: Background Generation Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            variants={scrollRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="lg:col-span-6 space-y-4"
          >
            <span className="code-pill text-[11px] text-accent-generate border-accent-generate/40">
              FEATURE 01 // BATCH QUEUE
            </span>
            <h3 className="text-headline-xl font-bold text-foreground">
              Background generation queue with live progress
            </h3>
            <p className="text-body-md text-muted leading-relaxed">
              Render entire prompt libraries in parallel without keeping tabs open. Monitor batch progress, view live token cost estimates, and configure automated retry rules for failed network requests.
            </p>
            <ul className="space-y-2.5 pt-2 text-body-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Zero generation markup — connect your direct AI studio key</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Automatic concurrent worker pools with retry backoff</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>High resolution 4:5, 1:1, and 16:9 aspect ratios</span>
              </li>
            </ul>
          </motion.div>

          <div className="lg:col-span-6">
            <MicroQueueUI />
          </div>
        </div>

        {/* Feature 2: Side-by-Side Approval Gate */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 lg:order-2 space-y-4">
            <span className="code-pill text-[11px] text-accent-ready border-accent-ready/40">
              FEATURE 02 // HUMAN GATE
            </span>
            <h3 className="text-headline-xl font-bold text-foreground">
              Human review gate: 100% control over public feed
            </h3>
            <p className="text-body-md text-muted leading-relaxed">
              Every post requires an active sign-off before entering your calendar queue. Review generated graphics alongside suggested captions, edit text in real time, or trigger instant prompt re-rolls.
            </p>
            <ul className="space-y-2.5 pt-2 text-body-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Side-by-side visual and copy editor with markdown support</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Single-click approval or rejection with feedback notes</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Brand voice compliance guardrails</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6 lg:order-1">
            <MicroApprovalUI />
          </div>
        </div>

        {/* Feature 3: Visual Scheduler Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="code-pill text-[11px] text-accent-schedule border-accent-schedule/40">
              FEATURE 03 // SCHEDULER
            </span>
            <h3 className="text-headline-xl font-bold text-foreground">
              Visual scheduler with recurring time slots
            </h3>
            <p className="text-body-md text-muted leading-relaxed">
              Plan out the month in advance on an interactive calendar. Set daily publishing time slots (e.g. 8:00 AM, 7:00 PM), monitor dispatch health, and adapt to audience peak engagement windows automatically.
            </p>
            <ul className="space-y-2.5 pt-2 text-body-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Timezone-aware slot planning and conflict detection</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Drag-free slot assignment matching approved queue drafts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={14} className="text-accent-ready shrink-0" />
                <span>Real-time delivery verification with Facebook Graph API</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-6">
            <MicroSchedulerUI />
          </div>
        </div>
      </div>
    </section>
  );
}

function MicroQueueUI() {
  return (
    <div className="p-6 border border-border bg-surface-strong rounded-xs shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-muted" />
          <span className="font-mono text-xs font-semibold text-foreground">
            BATCH_RENDER_092 // RUNNING
          </span>
        </div>
        <span className="text-[11px] font-mono text-accent-generate font-semibold">
          2/3 ACTIVE WORKERS
        </span>
      </div>

      <div className="space-y-4">
        {/* Item 1 */}
        <div className="p-3.5 border border-border bg-surface rounded-xs space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-foreground">Northline Coffee // Cold Brew Lab</span>
            <span className="text-accent-generate font-mono">75%</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent-generate w-3/4 rounded-full transition-all duration-300" />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted pt-1">
            <span>Model: Imagen 3</span>
            <span>Est. Cost: $0.03</span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="p-3.5 border border-border bg-surface rounded-xs space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-foreground">Studio Nine // Workspace Infrastructure</span>
            <span className="text-accent-ready font-mono">100% (READY)</span>
          </div>
          <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent-ready w-full rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted pt-1">
            <span>Status: Awaiting review</span>
            <span>Est. Cost: $0.03</span>
          </div>
        </div>
      </div>

      <div className="p-3 border border-border/80 bg-surface rounded-xs flex items-center justify-between text-xs font-mono text-muted">
        <span>TOTAL BATCH SPEND: $0.06</span>
        <span className="text-foreground font-semibold">SAVINGS: 90% VS PLATFORM CREDITS</span>
      </div>
    </div>
  );
}

function MicroApprovalUI() {
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);

  return (
    <div className="p-6 border border-border bg-surface-strong rounded-xs shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-muted" />
          <span className="font-mono text-xs font-semibold text-foreground">
            APPROVAL GATE // ITEM 01 OF 08
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted">
          STATUS: {approved ? "APPROVED" : rejected ? "REJECTED" : "AWAITING SIGN-OFF"}
        </span>
      </div>

      {/* Visual Mock & Caption */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div className="aspect-[4/5] bg-surface border border-border rounded-xs p-4 flex flex-col justify-between">
          <div className="flex justify-between text-[10px] font-mono text-muted">
            <span>PREVIEW</span>
            <span>4:5</span>
          </div>
          <div className="my-auto text-center space-y-2">
            <div className="w-10 h-10 rounded-xs bg-surface-strong border border-border mx-auto flex items-center justify-center">
              <Sparkles size={16} className="text-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground">
              Artisanal Pour-Over Ritual
            </p>
          </div>
          <div className="text-[9px] font-mono text-muted text-center">
            NORTHLINE COFFEE
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase">Caption</span>
            <p className="text-xs text-foreground bg-surface p-2.5 border border-border rounded-xs leading-relaxed">
              Slow mornings call for deliberate rituals. Hand-poured single origin notes now brewing.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase">Hashtags</span>
            <p className="text-[11px] font-mono text-muted bg-surface p-2 border border-border rounded-xs">
              #Northline #CoffeeRitual #SpecialtyRoast
            </p>
          </div>

          {/* Interactive Decision Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant={approved ? "primary" : "secondary"}
              className="flex-1"
              onClick={() => {
                setApproved(true);
                setRejected(false);
              }}
            >
              <Check size={14} />
              <span>{approved ? "Approved" : "Approve"}</span>
            </Button>
            <Button
              size="sm"
              variant={rejected ? "danger" : "outline"}
              onClick={() => {
                setRejected(true);
                setApproved(false);
              }}
            >
              <X size={14} />
              <span>Reject</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MicroSchedulerUI() {
  return (
    <div className="p-6 border border-border bg-surface-strong rounded-xs shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-muted" />
          <span className="font-mono text-xs font-semibold text-foreground">
            SCHEDULE // WEEK 38
          </span>
        </div>
        <span className="text-[11px] font-mono text-accent-schedule font-semibold">
          4 SLOTS BOOKED
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
        <div className="p-2 border border-border bg-surface rounded-xs">
          <span className="text-muted block text-[10px]">MON 21</span>
          <span className="text-accent-ready font-semibold block mt-1">7:00 PM</span>
          <span className="text-[9px] text-muted truncate block">POSTED</span>
        </div>
        <div className="p-2 border border-border bg-surface rounded-xs">
          <span className="text-muted block text-[10px]">WED 23</span>
          <span className="text-accent-schedule font-semibold block mt-1">11:30 AM</span>
          <span className="text-[9px] text-muted truncate block">SCHEDULED</span>
        </div>
        <div className="p-2 border border-border bg-surface rounded-xs">
          <span className="text-muted block text-[10px]">FRI 25</span>
          <span className="text-accent-schedule font-semibold block mt-1">7:00 PM</span>
          <span className="text-[9px] text-muted truncate block">SCHEDULED</span>
        </div>
        <div className="p-2 border border-dashed border-border bg-surface/40 rounded-xs">
          <span className="text-muted block text-[10px]">SUN 27</span>
          <span className="text-muted block mt-1">+ Add</span>
          <span className="text-[9px] text-muted truncate block">OPEN</span>
        </div>
      </div>

      <div className="p-3 border border-border bg-surface rounded-xs flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted" />
          <span className="text-muted">Target Timezone:</span>
          <span className="text-foreground font-semibold">UTC+08 (Asia/Manila)</span>
        </div>
        <span className="text-accent-ready">AUTO-OPTIMIZED</span>
      </div>
    </div>
  );
}
