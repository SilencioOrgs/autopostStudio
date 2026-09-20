"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Plus,
  Image as ImageIcon,
  Bot,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  Zap,
} from "lucide-react";
import { Button } from "@/_components/ui/button";
import { useToast } from "@/_components/ui/toast";
import { MODEL_OPTIONS, DEFAULT_IMAGE_MODEL } from "@/app/_lib/mock-config";
import type { ApiResponse } from "@/app/_lib/errors";

export interface GeneratedImagePrompt {
  id: string;
  title: string;
  imagePrompt: string;
  caption: string;
  hashtags: string[];
  aspect: "4:5" | "1:1" | "16:9";
  model: string;
  style: string;
  brand: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  generationLatency?: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  aspect?: "4:5" | "1:1" | "16:9";
  model?: string;
  brand?: string;
  mode?: "ideas" | "image";
  generatedPrompts?: GeneratedImagePrompt[];
}

interface AiPromptAssistantProps {
  onAddPromptToLibrary?: () => void;
  className?: string;
}

const PRESET_IDEAS = [
  {
    label: "Modern Filipino Farmhouse",
    prompt: "Modern architectural Filipino bahay na bato farmhouse with lush tropical courtyard, photorealistic, 8k",
    aspect: "4:5" as const,
  },
  {
    label: "Minimalist Bahay Kubo",
    prompt: "Contemporary elevated minimalist bahay kubo villa with bamboo slats and warm evening illumination",
    aspect: "1:1" as const,
  },
  {
    label: "OFW Dream House",
    prompt: "Two-storey luxury tropical modern Filipino residence with infinity pool and palm landscaping, sunset light",
    aspect: "16:9" as const,
  },
  {
    label: "Commercial Coffee House",
    prompt: "Artisanal specialty cafe interior with terracotta walls, rattan chairs, and natural light, architectural photography",
    aspect: "4:5" as const,
  },
];

export function AiPromptAssistant({
  onAddPromptToLibrary,
  className = "",
}: AiPromptAssistantProps) {
  const { addToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Parameter controls
  const [selectedAspect, setSelectedAspect] = useState<"4:5" | "1:1" | "16:9">("4:5");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_IMAGE_MODEL);
  const [selectedBrand, setSelectedBrand] = useState<string>("Casa Pinoy");
  const [inputQuery, setInputQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeGenerationMessage, setActiveGenerationMessage] = useState("");

  // Trackers
  const [addedPromptIds, setAddedPromptIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingCardIds, setGeneratingCardIds] = useState<Record<string, boolean>>({});

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      timestamp: "Just now",
      text: "Hello! I am your Cloudflare Workers AI Creative Assistant. Enter any architectural concept or topic, and you can either draft structured prompts or generate live images instantly using FLUX.1 Schnell and Stable Diffusion XL.",
      generatedPrompts: [
        {
          id: "gen-init-1",
          title: "Modern Filipino Bahay na Bato",
          imagePrompt:
            "Modern architectural Filipino bahay na bato farmhouse with polished concrete, warm timber accents, lush tropical courtyard garden, dramatic cinematic lighting, photorealistic 8k",
          caption:
            "Rooted in tradition, engineered for the future. Blending heritage stone aesthetics with modern passive cooling and seamless indoor-outdoor living.",
          hashtags: ["#CasaPinoy", "#ModernBahayKubo", "#FilipinoArchitecture", "#TropicalLiving"],
          aspect: "4:5",
          model: DEFAULT_IMAGE_MODEL,
          style: "Photorealistic Architectural",
          brand: "Casa Pinoy",
        },
      ],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Handle Copy prompt text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast({
      title: "Prompt copied",
      description: "Prompt text copied to clipboard.",
      variant: "neutral",
    });
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const idCounterRef = useRef(100);

  // Handle Add to Library (persists directly to database)
  const handleAddToLibrary = async (prompt: GeneratedImagePrompt) => {
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: prompt.imagePrompt,
          caption: prompt.caption,
          hashtags: prompt.hashtags,
          style: prompt.style,
          aspect: prompt.aspect,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Failed to save prompt to database");
      }

      setAddedPromptIds((prev) => ({ ...prev, [prompt.id]: true }));
      addToast({
        title: "Saved to Library",
        description: `"${prompt.title}" was saved to your prompt repository.`,
        variant: "success",
      });

      if (onAddPromptToLibrary) {
        onAddPromptToLibrary();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      addToast({ title: "Could not save prompt", description: msg, variant: "error" });
    }
  };

  // Generate LIVE image via Cloudflare Workers AI for a specific card
  const handleGenerateImageForCard = async (promptCard: GeneratedImagePrompt) => {
    setGeneratingCardIds((prev) => ({ ...prev, [promptCard.id]: true }));
    addToast({
      title: "Invoking Cloudflare Workers AI",
      description: `Generating image using ${MODEL_OPTIONS.find((m) => m.id === promptCard.model)?.name || "Workers AI"}...`,
      variant: "neutral",
    });

    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptCard.imagePrompt,
          model: promptCard.model,
          aspect: promptCard.aspect,
          style: promptCard.style,
          title: promptCard.title,
          caption: promptCard.caption,
          hashtags: promptCard.hashtags,
        }),
      });

      const json: ApiResponse<{
        imageUrl: string;
        model: string;
        latencyMs: number;
        mimeType: string;
      }> = await res.json();

      if (!json.ok) {
        throw new Error(json.error?.message || "Generation failed");
      }

      // Update card with generated image
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.generatedPrompts) return msg;
          return {
            ...msg,
            generatedPrompts: msg.generatedPrompts.map((p) => {
              if (p.id === promptCard.id) {
                return {
                  ...p,
                  imageUrl: json.data.imageUrl,
                  generationLatency: json.data.latencyMs,
                };
              }
              return p;
            }),
          };
        })
      );

      addToast({
        title: "Image Generated",
        description: `Completed in ${(json.data.latencyMs / 1000).toFixed(2)}s via Cloudflare Workers AI!`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      addToast({ title: "Workers AI Error", description: msg, variant: "error" });
    } finally {
      setGeneratingCardIds((prev) => ({ ...prev, [promptCard.id]: false }));
    }
  };

  // Handle Direct Live Image Generation from the input composer
  const handleDirectGenerateImage = async (overridePrompt?: string, overrideAspect?: "4:5" | "1:1" | "16:9") => {
    const textToSend = (overridePrompt || inputQuery).trim();
    if (!textToSend || isGenerating) return;

    const aspectToUse = overrideAspect || selectedAspect;
    const modelToUse = selectedModel;

    const userMessage: ChatMessage = {
      id: `user-${idCounterRef.current++}`,
      sender: "user",
      timestamp: "Just now",
      text: textToSend,
      aspect: aspectToUse,
      model: modelToUse,
      brand: selectedBrand,
      mode: "image",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsGenerating(true);
    setActiveGenerationMessage(`Calling Cloudflare Workers AI (${MODEL_OPTIONS.find((m) => m.id === modelToUse)?.name || "Workers AI"})...`);

    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          model: modelToUse,
          aspect: aspectToUse,
          saveToLibrary: false,
        }),
      });

      const json: ApiResponse<{
        imageUrl: string;
        model: string;
        latencyMs: number;
        mimeType: string;
      }> = await res.json();

      if (!json.ok) {
        throw new Error(json.error?.message || "Image generation failed");
      }

      const cardId = `gen-${idCounterRef.current++}`;
      const assistantMessage: ChatMessage = {
        id: `asst-${idCounterRef.current++}`,
        sender: "assistant",
        timestamp: "Just now",
        text: `Rendered successfully in ${(json.data.latencyMs / 1000).toFixed(2)}s using Cloudflare Workers AI:`,
        generatedPrompts: [
          {
            id: cardId,
            title: textToSend.length > 40 ? `${textToSend.slice(0, 38)}...` : textToSend,
            imagePrompt: textToSend,
            caption: `Modern architectural exploration: ${textToSend}. Generated with Cloudflare Workers AI.`,
            hashtags: [`#${selectedBrand.replace(/\s+/g, "")}`, "#ArchitecturalRender", "#CloudflareAI"],
            aspect: aspectToUse,
            model: modelToUse,
            style: "Photorealistic Architectural",
            brand: selectedBrand,
            imageUrl: json.data.imageUrl,
            generationLatency: json.data.latencyMs,
          },
        ],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      addToast({
        title: "Image Generated",
        description: `Rendered in ${(json.data.latencyMs / 1000).toFixed(2)}s with Cloudflare Workers AI.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cloudflare generation error";
      const assistantMessage: ChatMessage = {
        id: `asst-${idCounterRef.current++}`,
        sender: "assistant",
        timestamp: "Just now",
        text: `Generation failed: ${msg}`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      addToast({ title: "Generation Error", description: msg, variant: "error" });
    } finally {
      setIsGenerating(false);
      setActiveGenerationMessage("");
    }
  };

  // Handle Idea Generation (creates structured prompt drafts)
  const handleDraftPrompts = async (overrideText?: string, overrideAspect?: "4:5" | "1:1" | "16:9") => {
    const textToSend = (overrideText || inputQuery).trim();
    if (!textToSend || isGenerating) return;

    const aspectToUse = overrideAspect || selectedAspect;

    const userMessage: ChatMessage = {
      id: `user-${idCounterRef.current++}`,
      sender: "user",
      timestamp: "Just now",
      text: textToSend,
      aspect: aspectToUse,
      model: selectedModel,
      brand: selectedBrand,
      mode: "ideas",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsGenerating(true);
    setActiveGenerationMessage("Drafting prompt variations tailored for Workers AI...");

    try {
      const res = await fetch("/api/ai/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: textToSend,
          aspect: aspectToUse,
          model: selectedModel,
          brand: selectedBrand,
        }),
      });

      const json: ApiResponse<{ prompts: GeneratedImagePrompt[] }> = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to generate prompt ideas");
      }

      const assistantMessage: ChatMessage = {
        id: `asst-${idCounterRef.current++}`,
        sender: "assistant",
        timestamp: "Just now",
        text: `Synthesized ${json.data.prompts.length} prompt ideas calibrated for ${MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name || "Workers AI"}. You can generate a live image directly or save any prompt to your library:`,
        generatedPrompts: json.data.prompts,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to draft prompts";
      addToast({ title: "Drafting Failed", description: msg, variant: "error" });
    } finally {
      setIsGenerating(false);
      setActiveGenerationMessage("");
    }
  };

  return (
    <div className={`flex flex-col h-[760px] max-h-[85vh] bg-surface border border-border rounded-xl overflow-hidden shadow-xs ${className}`}>
      {/* Assistant Header */}
      <div className="px-5 py-3.5 border-b border-border bg-surface-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-foreground">
                Cloudflare Workers AI Studio
              </h3>
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-status-success/15 text-status-success font-semibold">
                Live Edge AI
              </span>
            </div>
            <p className="text-xs text-muted">
              Direct REST API generation with FLUX.1 Schnell &amp; Stable Diffusion XL
            </p>
          </div>
        </div>

        {/* Quick parameters selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand */}
          <input
            type="text"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            placeholder="Brand name"
            className="h-7 px-2.5 w-28 bg-surface border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none"
          />

          {/* Aspect Ratio */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 text-xs font-mono">
            {(["4:5", "1:1", "16:9"] as const).map((asp) => (
              <button
                key={asp}
                type="button"
                onClick={() => setSelectedAspect(asp)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  selectedAspect === asp
                    ? "bg-foreground text-background font-bold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {asp}
              </button>
            ))}
          </div>

          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="h-7 px-2 bg-surface border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-background/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
            }`}
          >
            {/* Assistant Avatar */}
            {msg.sender === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border text-foreground flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Bot size={16} />
              </div>
            )}

            {/* Message Body */}
            <div className={`space-y-3 ${msg.sender === "user" ? "max-w-xl" : "flex-1"}`}>
              {msg.text && (
                <div
                  className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-foreground text-background font-medium rounded-tr-none shadow-xs"
                      : "bg-surface border border-border text-foreground rounded-tl-none shadow-xs"
                  }`}
                >
                  <p>{msg.text}</p>

                  {msg.sender === "user" && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-background/20 font-mono text-[10px] text-background/80">
                      <span>Aspect: {msg.aspect}</span>
                      <span>•</span>
                      <span>Model: {MODEL_OPTIONS.find((m) => m.id === msg.model)?.name || msg.model}</span>
                      <span>•</span>
                      <span>Brand: {msg.brand}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Prompts and Live Images */}
              {msg.generatedPrompts && msg.generatedPrompts.length > 0 && (
                <div className="space-y-4 pt-1">
                  {msg.generatedPrompts.map((prompt) => {
                    const isAdded = !!addedPromptIds[prompt.id];
                    const isCopied = copiedId === prompt.id;
                    const isCardGenerating = !!generatingCardIds[prompt.id];

                    return (
                      <div
                        key={prompt.id}
                        className="bg-surface border border-border rounded-xl p-4 sm:p-5 space-y-4 shadow-xs transition-all hover:border-foreground/30"
                      >
                        {/* Prompt Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                          <div>
                            <h4 className="font-display font-bold text-sm text-foreground">
                              {prompt.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                                {prompt.style}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                                {prompt.aspect}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-status-info/10 text-status-info border border-status-info/20">
                                {MODEL_OPTIONS.find((m) => m.id === prompt.model)?.name || "Workers AI"}
                              </span>
                              {prompt.generationLatency && (
                                <span className="font-mono text-[10px] text-status-success font-semibold">
                                  ⚡ {(prompt.generationLatency / 1000).toFixed(2)}s
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                            {/* Live Generation Button */}
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isCardGenerating}
                              onClick={() => handleGenerateImageForCard(prompt)}
                              className="bg-foreground text-background hover:bg-foreground/90"
                            >
                              {isCardGenerating ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Zap size={12} />
                              )}
                              <span>
                                {isCardGenerating
                                  ? "Generating..."
                                  : prompt.imageUrl
                                  ? "Regenerate"
                                  : "Generate Image"}
                              </span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(prompt.imagePrompt, prompt.id)}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              <span>{isCopied ? "Copied" : "Copy"}</span>
                            </Button>

                            <Button
                              variant={isAdded ? "outline" : "secondary"}
                              size="sm"
                              disabled={isAdded}
                              onClick={() => handleAddToLibrary(prompt)}
                            >
                              {isAdded ? <Check size={12} /> : <Plus size={12} />}
                              <span>{isAdded ? "Saved" : "Save to Library"}</span>
                            </Button>
                          </div>
                        </div>

                        {/* LIVE IMAGE PREVIEW (Rendered if generated) */}
                        {prompt.imageUrl && (
                          <div className="space-y-2 p-3 bg-surface-raised rounded-xl border border-border">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles size={12} className="text-status-success" />
                                <span>Live Cloudflare Workers AI Render</span>
                              </span>
                              <a
                                href={prompt.imageUrl}
                                download={`${prompt.title.replace(/\s+/g, "_")}.png`}
                                className="flex items-center gap-1 text-[11px] font-mono text-muted hover:text-foreground transition-colors"
                              >
                                <Download size={12} />
                                <span>Download PNG</span>
                              </a>
                            </div>
                            <div className="relative rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center max-h-[420px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={prompt.imageUrl}
                                alt={prompt.title}
                                className="w-full h-auto object-contain max-h-[420px]"
                              />
                            </div>
                          </div>
                        )}

                        {/* Image Generation Prompt Box */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1.5">
                            <ImageIcon size={12} />
                            <span>IMAGE GENERATION PROMPT</span>
                          </span>
                          <div className="p-3 bg-surface-raised border border-border rounded-lg font-mono text-xs text-foreground leading-relaxed selection:bg-foreground selection:text-background">
                            {prompt.imagePrompt}
                          </div>
                        </div>

                        {/* Social Caption */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-semibold">
                            FACEBOOK CAPTION &amp; HASHTAGS
                          </span>
                          <div className="p-3 bg-surface-raised border border-border rounded-lg text-xs text-foreground space-y-1.5">
                            <p>{prompt.caption}</p>
                            <div className="flex flex-wrap gap-1 font-mono text-[10px] text-muted">
                              {prompt.hashtags.map((h) => (
                                <span key={h}>{h}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Avatar */}
            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0 mt-1 shadow-xs font-mono text-xs font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {/* Active Generating Indicator */}
        {isGenerating && (
          <div className="flex gap-3 max-w-md mr-auto">
            <div className="w-8 h-8 rounded-lg bg-surface-raised border border-border text-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Bot size={16} />
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl rounded-tl-none shadow-xs space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs font-mono text-foreground font-semibold">
                <Loader2 size={14} className="animate-spin text-foreground" />
                <span>{activeGenerationMessage || "Running Cloudflare Workers AI..."}</span>
              </div>
              <p className="text-[11px] font-mono text-muted">
                Invoking REST API on edge GPU inference clusters.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inspiration Chips */}
      <div className="px-4 py-2 border-t border-border bg-surface-raised/50 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase text-muted whitespace-nowrap">
          Inspiration:
        </span>
        {PRESET_IDEAS.map((idea) => (
          <button
            key={idea.label}
            type="button"
            onClick={() => handleDirectGenerateImage(idea.prompt, idea.aspect)}
            className="px-2.5 py-1 rounded-full bg-surface border border-border hover:border-foreground text-[11px] text-foreground font-mono transition-colors whitespace-nowrap cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Zap size={10} className="text-amber-500" />
            <span>{idea.label}</span>
          </button>
        ))}
      </div>

      {/* Input Composer Bar */}
      <div className="p-3 sm:p-4 border-t border-border bg-surface">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDirectGenerateImage();
          }}
          className="space-y-2"
        >
          <div className="relative flex items-end bg-surface-raised border border-border rounded-xl overflow-hidden focus-within:border-foreground transition-colors">
            <textarea
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleDirectGenerateImage();
                }
              }}
              placeholder="Describe what you want to generate (e.g., 'Modern tropical Filipino villa with bamboo ceiling and warm lights')..."
              className="w-full p-3 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none resize-none font-mono leading-relaxed"
            />

            <div className="p-2 flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!inputQuery.trim() || isGenerating}
                onClick={() => handleDraftPrompts()}
                className="h-8 px-2.5 text-xs font-mono"
              >
                <span>Draft Prompts</span>
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputQuery.trim() || isGenerating}
                className="h-8 px-3.5 bg-foreground text-background hover:bg-foreground/90"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Generate Image</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted px-1">
            <span>Press Enter to Generate Image immediately via Workers AI</span>
            <span>Edge Inference: {MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name || "Workers AI"}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
