"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Stepper } from "@/_components/stepper";
import { PlatformCard } from "@/_components/platform-card";
import { OnboardingFooter } from "@/_components/onboarding-footer";
import { FacebookIcon, TikTokIcon } from "@/_components/ui/icons";
import { ONBOARDING_STEPS } from "@/_lib/steps";
import { useToast } from "@/_components/ui/toast";

export default function ChoosePlatformPage() {
  const [notifyTikTok, setNotifyTikTok] = useState(false);
  const { toast } = useToast();

  const handleToggleNotify = () => {
    const nextState = !notifyTikTok;
    setNotifyTikTok(nextState);
    if (nextState) {
      toast({
        title: "Added to TikTok waitlist",
        description: "We'll notify your account email when video carousel support goes live.",
        variant: "info",
      });
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col justify-center items-center py-10 sm:py-16 px-4 md:px-6">
        <div className="w-full max-w-3xl space-y-10">
          {/* Animated Progress Stepper */}
          <div>
            <Stepper
              steps={ONBOARDING_STEPS}
              currentStep={1}
              variant="horizontal"
            />
          </div>

          {/* Headline */}
          <div className="text-center space-y-2">
            <span className="font-mono text-xs text-muted uppercase tracking-widest font-semibold">
              STEP 01 // PLATFORM SELECTION
            </span>
            <h1 className="text-display-lg font-bold text-foreground tracking-tight">
              Where do you want to publish?
            </h1>
            <p className="text-body-md text-muted max-w-md mx-auto">
              Select your primary distribution channel. You can link additional accounts and platforms later.
            </p>
          </div>

          {/* Platform Selection Grid */}
          <div
            role="radiogroup"
            aria-label="Choose social media platform"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
          >
            {/* Facebook (Selected) */}
            <PlatformCard
              name="Facebook Pages"
              description="Automate image posts, carousels, and captions directly to Pages you administer via official Graph API."
              selected
              icon={
                <div className="w-10 h-10 rounded-xs bg-[#1877F2] text-white flex items-center justify-center shadow-xs">
                  <FacebookIcon size={22} />
                </div>
              }
            />

            {/* TikTok (Coming Soon) */}
            <PlatformCard
              name="TikTok"
              description="Photo carousel publishing and audio rendering currently in developer preview."
              disabled
              notifyActive={notifyTikTok}
              onNotify={handleToggleNotify}
              icon={
                <div className="w-10 h-10 rounded-xs bg-foreground text-background flex items-center justify-center shadow-xs">
                  <TikTokIcon size={20} />
                </div>
              }
            />
          </div>

          {/* Trust Security Callout */}
          <div className="pt-4 text-center">
            <p className="text-body-sm text-muted font-mono text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-xs bg-surface border border-border">
              <ShieldCheck size={16} className="text-accent-ready" />
              <span>
                Permissions requested are strictly limited to scheduled Page publishing.
              </span>
            </p>
          </div>
        </div>
      </div>

      <OnboardingFooter
        nextLabel="Continue with Facebook"
        nextHref="/get-started/connect"
      />
    </>
  );
}
