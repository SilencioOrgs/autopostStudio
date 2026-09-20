"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Stepper } from "@/_components/stepper";
import { OnboardingFooter } from "@/_components/onboarding-footer";
import { SETUP_STEPS } from "@/_lib/steps";
import { Button } from "@/_components/ui/button";
import { useToast } from "@/_components/ui/toast";
import type { ApiResponse } from "@/app/_lib/errors";

const STYLE_PRESETS = [
  {
    id: "Modern Minimalist",
    name: "Modern Minimalist",
    description: "High contrast, sharp architectural lines, photorealistic 8k daylight",
    instruction: "Modern minimalist architectural photography, clean geometry, natural sunlight, 8k resolution, photorealistic",
    tag: "POPULAR",
  },
  {
    id: "Cinematic Warm",
    name: "Cinematic Warm",
    description: "Golden hour glow, atmospheric depth, rich tactile textures",
    instruction: "Cinematic architectural photography, golden hour warm lighting, rich textures, authentic environment, high dynamic range",
    tag: "EDITORIAL",
  },
  {
    id: "Tropical Vernacular",
    name: "Tropical Modern",
    description: "Natural timber, lush greenery integration, breathable open layouts",
    instruction: "Contemporary tropical design photography, exposed timber, native landscaping, dramatic shadows, photorealistic",
    tag: "ORGANIC",
  },
  {
    id: "Studio Monochrome",
    name: "Studio Editorial",
    description: "Deep shadows, dramatic directional backlight, luxury composition",
    instruction: "Luxury architectural editorial, dramatic directional lighting, bold monochrome tones, high fidelity",
    tag: "DEFAULT",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].id);

  // Key verification state
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "valid">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Check if user already has a verified key on load
  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((json: ApiResponse<{ providerKey?: { status: string; key_last4: string } | null }>) => {
        if (json.ok && json.data.providerKey?.status === "valid") {
          setTestStatus("valid");
          setApiKey(`AIza••••••${json.data.providerKey.key_last4}`);
        }
      })
      .catch(() => {});
  }, []);

  // Handler: Verify and save key
  const handleVerifyAndSaveKey = async () => {
    const cleanKey = apiKey.trim();
    setErrorMessage(null);

    if (!cleanKey) {
      setErrorMessage("Please enter your Google AI Studio API key.");
      return;
    }

    if (cleanKey.includes("••••")) {
      // Already verified stored key
      setTestStatus("valid");
      return;
    }

    setTestStatus("testing");
    try {
      const res = await fetch("/api/keys/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google_ai_studio", apiKey: cleanKey }),
      });

      const json: ApiResponse<{ keyLast4: string; maskedKey: string }> = await res.json();
      if (!json.ok) {
        throw new Error(json.error.message);
      }

      setTestStatus("valid");
      setApiKey(json.data.maskedKey);
      addToast({
        title: "Google AI Key Verified",
        description: `Successfully authenticated key (••••••${json.data.keyLast4}) and saved encrypted.`,
        variant: "success",
      });
    } catch (err: unknown) {
      setTestStatus("idle");
      const msg = err instanceof Error ? err.message : "Verification failed";
      setErrorMessage(msg);
      addToast({
        title: "Key Verification Failed",
        description: msg,
        variant: "error",
      });
    }
  };

  // Handler: Finish onboarding
  const handleFinish = async () => {
    if (testStatus !== "valid") {
      setErrorMessage("A verified Google AI Studio key is required to complete setup.");
      return;
    }

    setIsFinishing(true);
    try {
      const chosenPreset = STYLE_PRESETS.find((s) => s.id === selectedStyle);
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultStylePreset: chosenPreset?.instruction,
        }),
      });

      addToast({
        title: "Setup Completed",
        description: "Welcome to AutoPost Studio. Redirecting to your dashboard...",
        variant: "success",
      });

      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <>
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Stepper Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="p-6 border border-border bg-surface rounded-xs shadow-xs space-y-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted font-semibold">
                  ONBOARDING // STAGE 02
                </span>
                <h2 className="text-headline-sm font-bold text-foreground mt-1">
                  AI Generation Engine
                </h2>
                <p className="text-body-sm text-muted mt-1 leading-relaxed">
                  Connect your Google AI Studio key. Inference is billed directly to your own account with
                  zero markup.
                </p>
              </div>

              <Stepper
                steps={SETUP_STEPS}
                currentStep={2}
                variant="vertical"
                completedDescriptionOverride={{
                  2: testStatus === "valid" ? "Google AI Studio Verified" : undefined,
                }}
              />
            </div>

            {/* Pricing & Billing Transparency Box */}
            <div className="p-5 border border-border bg-surface-strong rounded-xs space-y-2.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck size={16} className="text-accent-ready shrink-0" />
                <span>BRING-YOUR-OWN KEY (BYO)</span>
              </div>
              <p className="text-muted leading-relaxed">
                AutoPost Studio charges no markup on image or text inference. You pay Google directly at
                standard API rates. Your key is stored encrypted with AES-256-GCM.
              </p>
            </div>
          </aside>

          {/* RIGHT: Setup Configuration */}
          <section className="lg:col-span-8 p-6 sm:p-10 border border-border bg-surface rounded-xs shadow-xs space-y-8 font-mono">
            <div className="space-y-2">
              <span className="text-xs text-muted uppercase tracking-widest font-semibold">
                STEP 02 // AI CREDENTIALS &amp; STYLE
              </span>
              <h1 className="text-headline-xl font-bold text-foreground tracking-tight">
                Configure Google AI Studio
              </h1>
              <p className="text-body-md text-muted leading-relaxed">
                Enter your Google AI Studio API key. We will run a lightweight, non-image verification call
                to ensure your project permissions are active before proceeding.
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 border border-status-error/30 bg-status-error/10 rounded-xs flex items-center gap-2.5 text-xs text-status-error animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Google AI Studio Key Input */}
            <div className="p-6 border border-border bg-surface-strong rounded-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-generate" />
                  <h3 className="text-xs uppercase font-bold tracking-wider text-foreground">
                    Google AI Studio API Key
                  </h3>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-foreground underline underline-offset-2 flex items-center gap-1 transition-colors"
                >
                  <span>Get a Key in Google AI Studio</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (testStatus === "valid") setTestStatus("idle");
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="AIzaSy..."
                    disabled={testStatus === "valid" && apiKey.includes("••••")}
                    className="w-full h-11 pl-3.5 pr-24 bg-surface border border-border rounded-xs text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors font-mono"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {testStatus === "valid" && apiKey.includes("••••") ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setApiKey("");
                          setTestStatus("idle");
                        }}
                      >
                        Change
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="px-2.5 py-1 text-xs text-muted hover:text-foreground flex items-center gap-1 bg-surface-strong border border-border rounded-xs transition-colors cursor-pointer"
                      >
                        {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showKey ? "Hide" : "Show"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted">
                  <span>How to get a key: Visit AI Studio &rarr; Create API Key &rarr; Copy key</span>
                  {testStatus === "valid" && (
                    <span className="text-accent-ready font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Verified &amp; Stored Encrypted
                    </span>
                  )}
                </div>
              </div>

              {testStatus !== "valid" && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    loading={testStatus === "testing"}
                    onClick={handleVerifyAndSaveKey}
                  >
                    <span>Verify &amp; Save Key</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              )}
            </div>

            {/* Default Style Preset Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-foreground" />
                <h3 className="text-xs uppercase font-bold tracking-wider text-foreground">
                  Select Default Style Preset
                </h3>
              </div>
              <p className="text-xs text-muted">
                Applied as a system instruction to guide photorealism and tone across your generated images.
                Can be modified per prompt anytime.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {STYLE_PRESETS.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedStyle(preset.id)}
                      className={`p-4 border rounded-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-foreground bg-surface-strong shadow-xs"
                          : "border-border bg-surface hover:border-foreground/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-foreground">{preset.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 border border-border rounded-xs text-muted font-mono">
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Onboarding Footer with strict verification gate */}
      <OnboardingFooter
        backHref="/get-started/connect"
        onNext={handleFinish}
        isNextDisabled={testStatus !== "valid" || isFinishing}
        nextLabel={isFinishing ? "Configuring..." : "Complete Setup & Launch Dashboard"}
      />
    </>
  );
}
