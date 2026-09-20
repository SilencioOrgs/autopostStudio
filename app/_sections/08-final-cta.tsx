"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/_components/ui/button";
import { useToast } from "@/_components/ui/toast";

export function FinalCTASection() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side regex format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid work email address.");
      return;
    }

    setError("");
    setIsSubmitted(true);

    // TODO(backend): Submit captured lead email to database / waitlist API
    toast({
      title: "Workspace invite requested",
      description: "We've reserved your early access spot. Check your inbox for setup instructions.",
      variant: "success",
    });
  };

  return (
    <section className="relative py-28 border-t border-border bg-surface-strong overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-grid-monochrome opacity-60 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
        {/* Section Counter Eyebrow */}
        <div className="inline-flex items-center gap-2 text-muted font-mono text-[11px] uppercase tracking-[0.18em] font-medium select-none">
          <span className="text-foreground font-semibold">08 / 09</span>
          <span className="text-border-strong opacity-40">/</span>
          <span>GET STARTED NOW</span>
        </div>

        <h2 className="text-display-xl font-bold tracking-tight text-foreground leading-[1.08] max-w-2xl mx-auto">
          Automate your content pipeline this week.
        </h2>

        <p className="text-body-lg text-muted max-w-xl mx-auto leading-relaxed">
          Import your first prompt sheet, inspect your generated drafts side-by-side, and lock in 30 days of Facebook Page posts with complete creator sign-off.
        </p>

        {/* Email Capture Form */}
        <form
          onSubmit={handleSubmit}
          className="max-w-md mx-auto space-y-3 pt-2"
          noValidate
        >
          {!isSubmitted ? (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="name@company.com"
                    aria-label="Work email address"
                    className="w-full h-11 pl-10 pr-3.5 bg-surface border border-border rounded-xs text-body-sm text-foreground placeholder:text-muted focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                <Button type="submit" variant="primary" size="md">
                  <span>Get started free</span>
                  <ArrowRight size={14} />
                </Button>
              </div>

              {error && (
                <p className="text-xs font-mono text-accent-error text-left pl-1">
                  {error}
                </p>
              )}

              <p className="text-[11px] font-mono text-muted text-left pl-1">
                14-day full access trial · No credit card required · Instant setup
              </p>
            </>
          ) : (
            <div className="p-4 border border-border bg-surface rounded-xs flex items-center justify-center gap-3 text-body-sm text-foreground">
              <CheckCircle2 size={18} className="text-accent-ready shrink-0" />
              <span>Invite reserved for <strong>{email}</strong>. Welcome aboard.</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
