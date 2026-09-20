"use client";

import React, { useState } from "react";
import { Button } from "@/_components/ui/button";
import { SectionHeader } from "@/_components/ui/section-header";
import { Dialog } from "@/_components/ui/dialog";
import { ToastProvider, useToast } from "@/_components/ui/toast";
import { Drawer } from "@/_components/ui/drawer";
import { CommandPalette } from "@/_components/ui/command-palette";
import { Tooltip } from "@/_components/ui/tooltip";
import { DropdownMenu } from "@/_components/ui/dropdown";
import { Accordion } from "@/_components/ui/accordion";
import { DashboardSkeleton } from "@/_components/ui/skeleton";
import { AnnouncementBanner } from "@/_components/ui/announcement-banner";
import { CookieNotice } from "@/_components/ui/cookie-notice";
import { ThemeToggle } from "@/_components/ui/theme-toggle";
import { StatusBadge } from "@/_components/status-badge";
import { PostGraphic } from "@/_components/ui/post-graphic";
import { MoreVertical, Trash2, Edit3, Share2 } from "lucide-react";

export default function KitchenSinkPage() {
  return (
    <ToastProvider>
      <KitchenSinkContent />
    </ToastProvider>
  );
}

function KitchenSinkContent() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase px-2 py-0.5 bg-foreground text-background font-semibold rounded-xs">
            DEV ONLY
          </span>
          <h1 className="font-display font-bold text-lg">
            Primitives Kitchen Sink
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button size="sm" variant="outline" href="/">
            Back to Home
          </Button>
        </div>
      </header>

      <AnnouncementBanner />
      <CommandPalette />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Section 01: Section Headers & Eyebrows */}
        <section className="space-y-6">
          <SectionHeader
            counter="01 / 08"
            eyebrow="DESIGN SYSTEM & PREREQUISITES"
            title="Monochrome Engineering Primitives"
            description="All foundational components engineered for high-contrast, editorial SaaS experiences."
          />
        </section>

        {/* Section 02: Buttons & Actions */}
        <section className="p-8 border border-border bg-surface rounded-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              02 // BUTTON VARIANTS & SIZES
            </h3>
            <span className="text-xs text-muted font-mono">Scale hover + active</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="primary" loading>
              Loading State
            </Button>
            <Button variant="primary" disabled>
              Disabled State
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button size="sm" variant="primary" iconLeading="plus">
              Small Button
            </Button>
            <Button size="md" variant="secondary" iconLeading="settings">
              Medium Button
            </Button>
            <Button size="lg" variant="outline" iconTrailing="arrow_right">
              Large Button
            </Button>
          </div>
        </section>

        {/* Section 03: Status Badges & Glow Dots */}
        <section className="p-8 border border-border bg-surface rounded-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              03 // FUNCTIONAL STATUS BADGES & AURA DOTS
            </h3>
            <span className="text-xs text-muted font-mono">Status indicators only</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status="generating" />
            <StatusBadge status="ready" />
            <StatusBadge status="scheduled" />
            <StatusBadge status="queued" />
            <StatusBadge status="failed" />
            <StatusBadge status="unused" />
            <StatusBadge status="connected" />
          </div>
        </section>

        {/* Section 04: Overlays & Modals */}
        <section className="p-8 border border-border bg-surface rounded-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              04 // OVERLAYS & INTERACTIVE SURFACES
            </h3>
            <span className="text-xs text-muted font-mono">Esc to dismiss · Focus lock</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => setIsDialogOpen(true)} variant="secondary">
              Open Modal Dialog
            </Button>

            <Button onClick={() => setIsDrawerOpen(true)} variant="secondary">
              Open Side Drawer
            </Button>

            <Tooltip content="Quick actions shortcut bar (⌘K)" side="top">
              <span className="code-pill cursor-help">Hover for Tooltip</span>
            </Tooltip>

            <DropdownMenu
              trigger={
                <Button variant="outline" size="sm">
                  <span>Actions Menu</span>
                  <MoreVertical size={14} />
                </Button>
              }
              items={[
                {
                  label: "Edit prompt draft",
                  icon: <Edit3 size={14} />,
                  action: () => toast({ title: "Opening prompt editor", variant: "info" }),
                },
                {
                  label: "Share preview link",
                  icon: <Share2 size={14} />,
                  action: () => toast({ title: "Link copied to clipboard", variant: "success" }),
                },
                {
                  label: "Delete from queue",
                  icon: <Trash2 size={14} />,
                  variant: "danger",
                  action: () => toast({ title: "Item deleted", variant: "error" }),
                },
              ]}
            />
          </div>

          {/* Toast Triggers */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-muted mr-2">Toast Triggers:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast({
                  title: "Post published successfully",
                  description: "Facebook Page feed updated at 7:00 PM.",
                  variant: "success",
                })
              }
            >
              Success Toast
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast({
                  title: "API rate limit encountered",
                  description: "Retrying in 45 seconds.",
                  variant: "error",
                })
              }
            >
              Error Toast
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast({
                  title: "Prompt sheet imported",
                  description: "30 items queued for generation.",
                  variant: "info",
                })
              }
            >
              Info Toast
            </Button>
          </div>
        </section>

        {/* Section 05: Accordion & FAQ */}
        <section className="p-8 border border-border bg-surface rounded-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              05 // ACCORDION DISCLOSURES
            </h3>
            <span className="text-xs text-muted font-mono">Animated height</span>
          </div>

          <Accordion
            items={[
              {
                id: "faq-1",
                question: "How does the BYO AI key model work?",
                answer:
                  "You provide your own Google AI Studio (Gemini / Imagen 3) or OpenAI API key. We connect directly to the model endpoints so you only pay provider rates with zero markup.",
              },
              {
                id: "faq-2",
                question: "Can posts be published without my approval?",
                answer:
                  "Never. AutoPost Studio requires human sign-off for every generated visual and caption before it enters the scheduling pipeline.",
              },
            ]}
          />
        </section>

        {/* Section 06: Post Graphics & Aspect Ratios */}
        <section className="p-8 border border-border bg-surface rounded-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              06 // CODE-BASED POST GRAPHICS (NO REMOTE PHOTOS)
            </h3>
            <span className="text-xs text-muted font-mono">Aspect: 4:5 · 1:1 · 16:9</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-xs font-mono text-muted mb-2 block">4:5 Portrait Feed</span>
              <PostGraphic title="Studio Nine Engineering — Launch Teaser" aspect="4:5" variant={1} />
            </div>
            <div>
              <span className="text-xs font-mono text-muted mb-2 block">1:1 Square Carousel</span>
              <PostGraphic title="Northline Coffee Roasters Weekly Feature" aspect="1:1" variant={2} />
            </div>
            <div>
              <span className="text-xs font-mono text-muted mb-2 block">16:9 Landscape Banner</span>
              <PostGraphic title="Automated Publishing Pipeline Overview" aspect="16:9" variant={3} />
            </div>
          </div>
        </section>

        {/* Section 07: Skeletons & Shimmer Loaders */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
              07 // SKELETON SHIMMER LOADERS
            </h3>
            <span className="text-xs text-muted font-mono">Reduced-motion compliant</span>
          </div>
          <DashboardSkeleton />
        </section>
      </main>

      {/* Demo Modal Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Connect Facebook Page"
        description="Select a Facebook Page that you manage to grant automated scheduling permissions."
      >
        <div className="space-y-4 py-2">
          <div className="p-4 border border-border bg-surface-strong rounded-xs flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Studio Nine Official</p>
              <p className="text-xs text-muted">ID: 94819284192 · 14,200 followers</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => setIsDialogOpen(false)}>
              Connect
            </Button>
          </div>
          <p className="text-xs text-muted">
            Permissions are requested solely to publish approved media. We never access private messages or personal feed data.
          </p>
        </div>
      </Dialog>

      {/* Demo Side Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Queue Item Detail #049"
        description="Generated prompt inspection and parameter configuration."
      >
        <div className="space-y-6">
          <PostGraphic title="Weekly Product Teaser — 4:5" aspect="4:5" />
          <div className="space-y-2">
            <span className="text-xs font-mono text-muted uppercase">Prompt</span>
            <p className="p-3 border border-border bg-surface-strong text-body-sm font-mono text-foreground rounded-xs">
              Minimalist industrial product staging on slate pedestal, soft dramatic directional lighting, 8k resolution.
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" variant="primary" onClick={() => setIsDrawerOpen(false)}>
              Approve Post
            </Button>
            <Button variant="danger" onClick={() => setIsDrawerOpen(false)}>
              Reject
            </Button>
          </div>
        </div>
      </Drawer>

      <CookieNotice />
    </div>
  );
}
