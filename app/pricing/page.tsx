import type { Metadata } from "next";
import { StickyNav } from "@/_sections/00-sticky-nav";
import { PricingSection } from "@/_sections/06-pricing";
import { FAQSection } from "@/_sections/07-faq";
import { FooterSection } from "@/_sections/09-footer";
import { ToastProvider } from "@/_components/ui/toast";
import { CommandPalette } from "@/_components/ui/command-palette";

export const metadata: Metadata = {
  title: "Pricing & Plans",
  description: "Simple, transparent software pricing with zero markup on AI image generation. Bring your own Google AI Studio or OpenAI key.",
};

export default function PricingPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        <CommandPalette />
        <StickyNav />
        <main className="flex-1">
          <PricingSection showComparison />
          <FAQSection />
        </main>
        <FooterSection />
      </div>
    </ToastProvider>
  );
}
