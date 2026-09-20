"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { StepItem } from "@/_lib/steps";

interface StepperProps {
  steps: readonly StepItem[] | StepItem[];
  currentStep: number;
  variant?: "horizontal" | "vertical";
  completedDescriptionOverride?: Record<number, string | undefined>;
}

export function Stepper({
  steps,
  currentStep,
  variant = "horizontal",
  completedDescriptionOverride = {},
}: StepperProps) {
  if (variant === "horizontal") {
    const progressPercent = Math.min(
      100,
      Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)
    );

    return (
      <nav aria-label="Onboarding progress" className="w-full max-w-xl mx-auto">
        {/* Continuous progress track */}
        <div className="relative flex items-center justify-between">
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[2px] bg-border -z-10" />
          <motion.div
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 left-4 -translate-y-1/2 h-[2px] bg-foreground -z-10 max-w-[calc(100%-32px)]"
          />

          {steps.map((step) => {
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div
                key={step.number}
                className="flex flex-col items-center gap-2 bg-background px-2"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono font-semibold transition-all ${
                    isCompleted
                      ? "bg-foreground text-background"
                      : isActive
                      ? "bg-foreground text-background ring-4 ring-foreground/20"
                      : "bg-surface-strong border border-border text-muted"
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : step.number}
                </div>

                <span
                  className={`text-xs font-mono uppercase tracking-wider ${
                    isActive
                      ? "text-foreground font-semibold"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  // Vertical Stepper (for sidebar layout)
  return (
    <nav aria-label="Onboarding vertical progress">
      <ol className="space-y-6">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const description =
            isCompleted && completedDescriptionOverride[step.number]
              ? completedDescriptionOverride[step.number]
              : step.description;

          return (
            <li key={step.number} className="relative flex items-start gap-4">
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-4 top-8 -bottom-6 w-[2px] ${
                    isCompleted ? "bg-foreground" : "bg-border"
                  }`}
                />
              )}

              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono font-semibold shrink-0 transition-all ${
                  isCompleted
                    ? "bg-foreground text-background"
                    : isActive
                    ? "bg-foreground text-background ring-4 ring-foreground/20"
                    : "bg-surface-strong border border-border text-muted"
                }`}
              >
                {isCompleted ? <Check size={14} /> : step.number}
              </div>

              <div className="pt-0.5">
                <p
                  className={`text-body-sm font-semibold tracking-tight ${
                    isActive ? "text-foreground" : "text-muted"
                  }`}
                >
                  {step.label}
                </p>
                {description && (
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
