import type { Metadata } from "next";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { HeroSection } from "@/_sections/01-hero";
import { PlatformRowSection } from "@/_sections/02-platform-row";
import { HowItWorksSection } from "@/_sections/03-how-it-works";
import { FeaturesSection } from "@/_sections/04-features";
import { InteractiveDemoSection } from "@/_sections/05-interactive-demo";
import { PricingSection } from "@/_sections/06-pricing";
import { FAQSection } from "@/_sections/07-faq";
import { FinalCTASection } from "@/_sections/08-final-cta";
import { FooterSection } from "@/_sections/09-footer";
import { AnnouncementBanner } from "@/_components/ui/announcement-banner";
import { CookieNotice } from "@/_components/ui/cookie-notice";
import { CommandPalette } from "@/_components/ui/command-palette";
import { ToastProvider } from "@/_components/ui/toast";

export const metadata: Metadata = {
  title: "AutoPost Studio — The Content Pipeline That Runs Itself",
  description:
    "Import your prompt sheets, generate high-fidelity visuals and captions with AI, review and approve every draft, and auto-publish to Facebook and connected channels on schedule.",
};

export default function LandingPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background flex flex-col">
        {/* Top Announcement Bar */}
        <AnnouncementBanner />

        {/* Global Floating Command Palette (⌘K) */}
        <CommandPalette />

        {/* Sticky Header Nav with Scroll Progress */}
        <StickyNav />

        {/* Main Landing Sections */}
        <main id="main-content" className="flex-1">
          {/* 01: Hero with Code-built Animated Mockup */}
          <HeroSection />

          {/* 02: Platform Row with Infinite Marquee */}
          <PlatformRowSection />

          {/* 03: 4-Stage Content Pipeline */}
          <HowItWorksSection />

          {/* 04: Features with Live Micro-UIs */}
          <FeaturesSection />

          {/* 05: Interactive Prompt Simulation Widget */}
          <InteractiveDemoSection />

          {/* 06: Transparent Pricing & Full Comparison */}
          <PricingSection />

          {/* 07: FAQ Accordion */}
          <FAQSection />

          {/* 08: Final Lead Capture CTA */}
          <FinalCTASection />
        </main>

        {/* 09: Comprehensive Footer */}
        <FooterSection />

        {/* Bottom Cookie Preferences Bar */}
        <CookieNotice />
      </div>
    </ToastProvider>
  );
}
