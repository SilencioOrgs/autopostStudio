import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/_components/ui/button";

interface OnboardingFooterProps {
  backHref?: string;
  nextLabel: string;
  nextHref?: string;
  statusText?: string;
  disabled?: boolean;
  isNextDisabled?: boolean;
  onNextClick?: () => void;
  onNext?: () => void | Promise<void>;
}

export function OnboardingFooter({
  backHref,
  nextLabel,
  nextHref,
  statusText,
  disabled = false,
  isNextDisabled,
  onNextClick,
  onNext,
}: OnboardingFooterProps) {
  const isButtonDisabled = isNextDisabled ?? disabled;
  const handleNext = onNext ?? onNextClick;

  return (
    <footer className="w-full bg-surface/90 backdrop-blur-md border-t border-border sticky bottom-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Back Button */}
        {backHref ? (
          <Link
            href={backHref}
            className="text-body-sm font-medium text-muted hover:text-foreground transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-foreground rounded-xs px-2 py-1"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        ) : (
          <div />
        )}

        {/* Primary CTA */}
        <div className="flex items-center gap-4">
          {statusText && (
            <span className="hidden sm:inline-block text-xs font-mono text-muted">
              {statusText}
            </span>
          )}
          <Button
            href={handleNext ? undefined : nextHref}
            disabled={isButtonDisabled}
            size="md"
            variant="primary"
            onClick={handleNext}
          >
            <span>{nextLabel}</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </footer>
  );
}
