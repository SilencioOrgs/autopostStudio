"use client";

import React, { useState } from "react";
import { Check, ArrowRight, Key } from "lucide-react";
import { SectionHeader } from "@/_components/ui/section-header";
import { Button } from "@/_components/ui/button";
import { PRICING_TIERS, COMPARISON_TABLE } from "@/_data/pricing";

export function PricingSection({ showComparison = true }: { showComparison?: boolean }) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [showFullComparison, setShowFullComparison] = useState(false);

  return (
    <section id="pricing" className="py-24 border-t border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
        <SectionHeader
          counter="06 / 09"
          eyebrow="TRANSPARENT PRICING"
          title="Predictable plans. Zero generation markup."
          description="Straightforward software subscription. Connect your Google AI Studio or OpenAI key to pay actual model compute rates with zero platform margin on visuals."
        />

        {/* Monthly / Annual Billing Toggle */}
        <div className="flex items-center justify-center gap-4 select-none">
          <span
            className={`text-body-sm font-medium transition-colors cursor-pointer ${
              !isAnnual ? "text-foreground font-semibold" : "text-muted"
            }`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly billing
          </span>

          <button
            type="button"
            onClick={() => setIsAnnual((prev) => !prev)}
            aria-label="Toggle annual or monthly billing"
            className="w-12 h-6 rounded-full bg-surface-strong border border-border p-0.5 flex items-center transition-colors cursor-pointer"
          >
            <div
              className={`w-5 h-5 rounded-full bg-foreground transition-transform duration-200 ${
                isAnnual ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>

          <span
            className={`text-body-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              isAnnual ? "text-foreground font-semibold" : "text-muted"
            }`}
            onClick={() => setIsAnnual(true)}
          >
            <span>Annual billing</span>
            <span className="code-pill text-[10px] bg-accent-ready/15 text-accent-ready border-accent-ready/30 py-0.5">
              SAVE 20%
            </span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PRICING_TIERS.map((tier) => {
            const price = isAnnual ? tier.priceAnnual : tier.priceMonthly;

            return (
              <div
                key={tier.id}
                className={`relative p-8 rounded-xs flex flex-col justify-between transition-all ${
                  tier.popular
                    ? "bg-surface-strong border-2 border-foreground shadow-2xl scale-[1.02]"
                    : "bg-surface border border-border hover:border-border-strong shadow-md"
                }`}
              >
                {/* Popular Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-foreground text-background text-[10px] font-mono uppercase tracking-widest font-bold rounded-full">
                    {tier.badge}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {tier.name}
                    </h3>
                    <p className="text-body-sm text-muted mt-1.5 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price Digit Block */}
                  <div className="pb-4 border-b border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-4xl sm:text-5xl font-bold text-foreground">
                        ${price}
                      </span>
                      <span className="text-body-sm text-muted">/ month</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted mt-1 block">
                      {isAnnual ? "Billed annually ($" + price * 12 + "/yr)" : "Billed monthly"}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-body-sm text-foreground">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check size={16} className="text-accent-ready shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div className="pt-8">
                  <Button
                    href={tier.ctaHref}
                    variant={tier.popular ? "primary" : "outline"}
                    className="w-full"
                    size="md"
                  >
                    <span>{tier.ctaLabel}</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bring Your Own Key Notice Callout */}
        <div className="p-6 border border-border bg-surface-strong rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs bg-surface border border-border flex items-center justify-center shrink-0">
              <Key size={18} className="text-foreground" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-sm text-foreground">
                Bring Your Own Key (BYO Model)
              </h4>
              <p className="text-body-sm text-muted">
                You pay Google AI Studio directly ~$0.03 per image. AutoPost Studio adds no token markup.
              </p>
            </div>
          </div>
          <div className="shrink-0 font-mono text-xs text-foreground font-semibold">
            EST. ~ $0.90 / 30 POSTS
          </div>
        </div>

        {/* Feature Comparison Table Toggle */}
        {showComparison && (
          <div className="space-y-8 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Full Feature Matrix
                </h3>
                <p className="text-body-sm text-muted mt-1">
                  Side-by-side technical breakdown across all subscription tiers.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullComparison((prev) => !prev)}
              >
                {showFullComparison ? "Collapse matrix" : "Expand matrix"}
              </Button>
            </div>

            {showFullComparison && (
              <div className="overflow-x-auto border border-border bg-surface rounded-xs">
                <table className="w-full text-left text-body-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-strong text-xs font-mono text-muted uppercase">
                      <th className="p-4 font-semibold">Capability</th>
                      <th className="p-4 font-semibold">Starter</th>
                      <th className="p-4 font-semibold text-foreground">Studio</th>
                      <th className="p-4 font-semibold">Scale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARISON_TABLE.map((category, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr className="bg-surface-strong/60 font-mono text-[11px] font-semibold text-foreground">
                          <td colSpan={4} className="px-4 py-2 uppercase tracking-wider">
                            {category.category}
                          </td>
                        </tr>
                        {category.features.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-surface-strong/30">
                            <td className="p-4 text-foreground font-medium">{row.name}</td>
                            <td className="p-4 text-muted">
                              {typeof row.starter === "boolean" ? (
                                row.starter ? <Check size={16} className="text-accent-ready" /> : "—"
                              ) : (
                                row.starter
                              )}
                            </td>
                            <td className="p-4 text-foreground font-semibold">
                              {typeof row.studio === "boolean" ? (
                                row.studio ? <Check size={16} className="text-accent-ready" /> : "—"
                              ) : (
                                row.studio
                              )}
                            </td>
                            <td className="p-4 text-muted">
                              {typeof row.scale === "boolean" ? (
                                row.scale ? <Check size={16} className="text-accent-ready" /> : "—"
                              ) : (
                                row.scale
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
