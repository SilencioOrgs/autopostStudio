"use client";

import React from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, Sparkles, CheckSquare, CalendarCheck } from "lucide-react";
import { SectionHeader } from "@/_components/ui/section-header";
import { scrollRevealVariants } from "@/_design-system/motion";

const STEPS = [
  {
    step: "01",
    title: "Import prompt sheet",
    icon: <FileSpreadsheet size={22} className="text-foreground" />,
    description:
      "Upload a CSV or link a Google Sheet. Define image prompts, captions, and hashtags in structured rows for a full month in seconds.",
    meta: "INPUT: CSV / SHEETS",
  },
  {
    step: "02",
    title: "Batch AI generation",
    icon: <Sparkles size={22} className="text-accent-generate" />,
    description:
      "Background worker renders visuals via your own Google AI Studio or OpenAI API key. Zero markup, live progress bars, and cost transparency.",
    meta: "ENGINE: IMAGEN 3 / GEMINI",
  },
  {
    step: "03",
    title: "Human approval gate",
    icon: <CheckSquare size={22} className="text-accent-ready" />,
    description:
      "Nothing publishes uninspected. Review post drafts side-by-side, adjust copy and hashtags, then approve or trigger instant prompt retries.",
    meta: "CONTROL: 100% SIGN-OFF",
  },
  {
    step: "04",
    title: "Scheduled publishing",
    icon: <CalendarCheck size={22} className="text-accent-schedule" />,
    description:
      "Approved posts flow directly into the visual calendar. The system handles automated dispatch to your connected Facebook Pages on time.",
    meta: "DELIVERY: DIRECT GRAPH API",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeader
        counter="03 / 09"
        eyebrow="THE PIPELINE"
        title="From prompt spreadsheet to live feed"
        description="A four-stage deterministic workflow built for operators who value automated consistency without relinquishing editorial quality."
      />

      {/* 4 Steps Grid with connecting hairline */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {/* Desktop connecting hairline */}
        <div className="hidden lg:block absolute top-12 left-10 right-10 h-[1px] bg-border -z-10" />

        {STEPS.map((item, index) => (
          <motion.div
            key={item.step}
            variants={scrollRevealVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: index * 0.1 }}
            className="p-6 border border-border bg-surface rounded-xs space-y-4 hover:border-border-strong transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Step number badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xs border border-border bg-surface-strong flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <span className="font-mono text-xs text-muted font-bold tracking-widest">
                  STEP {item.step}
                </span>
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                {item.title}
              </h3>

              <p className="text-body-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted">
              <span>{item.meta}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-border-strong opacity-40" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
