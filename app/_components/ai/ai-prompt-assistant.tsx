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
  Layers,
} from "lucide-react";
import { Button } from "@/_components/ui/button";
import { PostGraphic } from "@/_components/ui/post-graphic";
import { useToast } from "@/_components/ui/toast";
import { PromptItem } from "@/_data/prompts";

export interface GeneratedImagePrompt {
  id: string;
  title: string;
  imagePrompt: string;
  caption: string;
  hashtags: string[];
  aspect: "4:5" | "1:1" | "16:9";
  model: "imagen-3" | "gemini-2.5-flash" | "dall-e-3";
  style: string;
  brand: "Studio Nine" | "Northline Coffee";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  aspect?: "4:5" | "1:1" | "16:9";
  model?: string;
  brand?: string;
  generatedPrompts?: GeneratedImagePrompt[];
}

interface AiPromptAssistantProps {
  onAddPromptToLibrary?: (prompt: PromptItem) => void;
  className?: string;
}

const PRESET_IDEAS = [
  {
    label: "SaaS Analytics Dashboard",
    prompt: "Generate an editorial visual prompt showcasing real-time data throughput and clean graphs on a borderless display.",
    aspect: "4:5" as const,
  },
  {
    label: "Titanium Mechanical Hardware",
    prompt: "Generate a macro industrial design prompt for a CNC-milled titanium developer peripheral with high-contrast shadows.",
    aspect: "1:1" as const,
  },
  {
    label: "Distributed Cloud Schematic",
    prompt: "Generate an isometric monochrome system diagram with luminous vector nodes against dark slate.",
    aspect: "16:9" as const,
  },
  {
    label: "Dev Team Velocity Story",
    prompt: "Generate an editorial social post prompt illustrating zero-friction developer workflows and terminal pipelines.",
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
  const [selectedModel, setSelectedModel] = useState<"imagen-3" | "gemini-2.5-flash" | "dall-e-3">("imagen-3");
  const [selectedBrand, setSelectedBrand] = useState<"Studio Nine" | "Northline Coffee">("Studio Nine");
  const [inputQuery, setInputQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Expanded visual preview state per prompt card id
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<Record<string, boolean>>({});
  // Added to library tracker
  const [addedPromptIds, setAddedPromptIds] = useState<Record<string, boolean>>({});
  // Copied feedback tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initial welcome message with sample generation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      timestamp: "Just now",
      text: "Hello! I am your AI Prompt Engineer. Give me a concept or target topic, and I will generate optimized image generation prompts tailored for Imagen 3 and DALL·E 3, complete with engagement-focused Facebook captions and hashtags.",
      generatedPrompts: [
        {
          id: "gen-init-1",
          title: "Distributed Edge Infrastructure Diagram",
          imagePrompt:
            "Isometric monochrome diagram of distributed serverless edge nodes, fine vector connection lines, high contrast directional lighting on dark slate surface, 8k resolution, octane render, 4:5 aspect ratio.",
          caption:
            "Designing for high throughput requires decoupled pipelines and predictable latency. Here is how our engineering team structures edge micro-clusters.",
          hashtags: ["#SystemEngineering", "#CloudInfrastructure", "#DevOps", "#AutoPost"],
          aspect: "4:5",
          model: "imagen-3",
          style: "Technical Isometric Monochrome",
          brand: "Studio Nine",
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
      title: "Prompt copied to clipboard",
      description: "Ready to paste into external image engines or docs.",
      variant: "neutral",
    });
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const idCounterRef = useRef(100);

  // Handle Add to Library
  const handleAddToLibrary = (prompt: GeneratedImagePrompt) => {
    if (onAddPromptToLibrary) {
      const item: PromptItem = {
        id: `ai-${idCounterRef.current++}`,
        brand: prompt.brand,
        title: prompt.title,
        imagePrompt: prompt.imagePrompt,
        caption: prompt.caption,
        hashtags: prompt.hashtags,
        aspect: prompt.aspect,
        model: prompt.model,
        status: "queued",
        estimatedCost: "$0.03",
      };
      onAddPromptToLibrary(item);
    }
    setAddedPromptIds((prev) => ({ ...prev, [prompt.id]: true }));
    addToast({
      title: "Prompt Saved to Library",
      description: `Added "${prompt.title}" to your publishing pipeline.`,
      variant: "success",
    });
  };

  // Toggle visual preview
  const togglePreview = (id: string) => {
    setExpandedPreviewIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Submit query to AI
  const handleSubmit = (overrideText?: string, overrideAspect?: "4:5" | "1:1" | "16:9") => {
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
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setIsGenerating(true);

    // TODO(backend): Integrate real POST /api/ai/generate-prompts endpoint
    setTimeout(() => {
      const generatedBatch: GeneratedImagePrompt[] = [
        {
          id: `gen-${idCounterRef.current++}`,
          title: textToSend.length > 40 ? `${textToSend.slice(0, 38)}...` : textToSend,
          imagePrompt: `${textToSend}. Precision engineered framing, studio key light, crisp shadows, ultra-high dynamic range, 8k resolution, photorealistic detailing, optimized for ${selectedModel}.`,
          caption: `Unlocking higher execution standards: ${textToSend.toLowerCase()}. Engineered for durability and focus.`,
          hashtags: [`#${selectedBrand.replace(/\s+/g, "")}`, "#EngineeringFlow", "#VisualPipeline"],
          aspect: aspectToUse,
          model: selectedModel,
          style: "Editorial Studio Photography",
          brand: selectedBrand,
        },
        {
          id: `gen-${idCounterRef.current++}`,
          title: `Alternate Composition — ${selectedBrand}`,
          imagePrompt: `Minimalist overhead flat lay concept illustrating: ${textToSend}. Clean geometric surfaces, subtle rim light, volumetric texture, editorial publication quality, ${aspectToUse} framing.`,
          caption: `Precision in every iteration. Exploring alternative aesthetic directions for our upcoming release.`,
          hashtags: [`#${selectedBrand.replace(/\s+/g, "")}`, "#DesignSystems", "#ContentEngine"],
          aspect: aspectToUse,
          model: selectedModel,
          style: "Minimalist Geometry",
          brand: selectedBrand,
        },
      ];

      const assistantMessage: ChatMessage = {
        id: `asst-${idCounterRef.current++}`,
        sender: "assistant",
        timestamp: "Just now",
        text: `I synthesized 2 image generation prompts optimized for ${selectedModel} in ${aspectToUse} ratio. Each includes a calibrated visual prompt, social caption, and relevant tags:`,
        generatedPrompts: generatedBatch,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 1400);
  };

  return (
    <div className={`flex flex-col h-[740px] max-h-[85vh] bg-surface border border-border rounded-xl overflow-hidden shadow-xs ${className}`}>
      {/* Assistant Header */}
      <div className="px-5 py-3.5 border-b border-border bg-surface-strong/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-foreground">
                AI Prompt Engineering Copilot
              </h3>
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-foreground text-background font-semibold">
                v2.4
              </span>
            </div>
            <p className="text-xs text-muted">
              Generates image prompts calibrated for Imagen 3, DALL·E 3, and Meta Graph publishing.
            </p>
          </div>
        </div>

        {/* Quick parameters selector */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Brand */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value as "Studio Nine" | "Northline Coffee")}
            className="h-7 px-2 bg-surface border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none cursor-pointer"
          >
            <option value="Studio Nine">Studio Nine</option>
            <option value="Northline Coffee">Northline Coffee</option>
          </select>

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
            onChange={(e) => setSelectedModel(e.target.value as "imagen-3" | "gemini-2.5-flash" | "dall-e-3")}
            className="h-7 px-2 bg-surface border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none cursor-pointer"
          >
            <option value="imagen-3">Imagen 3</option>
            <option value="gemini-2.5-flash">Gemini 2.5</option>
            <option value="dall-e-3">DALL·E 3</option>
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
              <div className="w-8 h-8 rounded-lg bg-surface-strong border border-border text-foreground flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Bot size={16} />
              </div>
            )}

            {/* Message Body */}
            <div className={`space-y-3 ${msg.sender === "user" ? "max-w-xl" : "flex-1"}`}>
              {/* Text bubble */}
              {msg.text && (
                <div
                  className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-foreground text-background font-medium rounded-tr-none shadow-xs"
                      : "bg-surface border border-border text-foreground rounded-tl-none shadow-xs"
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* User message metadata tags */}
                  {msg.sender === "user" && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-background/20 font-mono text-[10px] text-background/80">
                      <span>Aspect: {msg.aspect}</span>
                      <span>•</span>
                      <span>Model: {msg.model}</span>
                      <span>•</span>
                      <span>Brand: {msg.brand}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Assistant Generated Prompts List */}
              {msg.generatedPrompts && msg.generatedPrompts.length > 0 && (
                <div className="space-y-4 pt-1">
                  {msg.generatedPrompts.map((prompt) => {
                    const isPreviewOpen = !!expandedPreviewIds[prompt.id];
                    const isAdded = !!addedPromptIds[prompt.id];
                    const isCopied = copiedId === prompt.id;

                    return (
                      <div
                        key={prompt.id}
                        className="bg-surface border border-border rounded-xl p-4 sm:p-5 space-y-4 shadow-xs transition-all hover:border-border-strong"
                      >
                        {/* Prompt Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                          <div>
                            <h4 className="font-display font-bold text-sm text-foreground">
                              {prompt.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-strong border border-border text-muted">
                                {prompt.style}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-strong border border-border text-muted">
                                {prompt.aspect}
                              </span>
                              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-status-info/10 text-status-info border border-status-info/20">
                                {prompt.model}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(prompt.imagePrompt, prompt.id)}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              <span>{isCopied ? "Copied" : "Copy Prompt"}</span>
                            </Button>

                            <Button
                              variant={isAdded ? "outline" : "primary"}
                              size="sm"
                              disabled={isAdded}
                              onClick={() => handleAddToLibrary(prompt)}
                            >
                              {isAdded ? <Check size={12} /> : <Plus size={12} />}
                              <span>{isAdded ? "Added to Library" : "Add to Library"}</span>
                            </Button>
                          </div>
                        </div>

                        {/* Image Generation Prompt Box */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1.5">
                            <ImageIcon size={12} />
                            <span>IMAGE GENERATION PROMPT</span>
                          </span>
                          <div className="p-3 bg-surface-strong border border-border rounded-lg font-mono text-xs text-foreground leading-relaxed selection:bg-foreground selection:text-background">
                            {prompt.imagePrompt}
                          </div>
                        </div>

                        {/* Accompanying Social Caption */}
                        <div className="space-y-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-semibold">
                            FACEBOOK CAPTION &amp; HASHTAGS
                          </span>
                          <div className="p-3 bg-surface-strong border border-border rounded-lg text-xs text-foreground space-y-1.5">
                            <p>{prompt.caption}</p>
                            <div className="flex flex-wrap gap-1 font-mono text-[10px] text-muted">
                              {prompt.hashtags.map((h) => (
                                <span key={h}>{h}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Live Visual Graphic Preview Toggle */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => togglePreview(prompt.id)}
                            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Layers size={13} />
                            <span>
                              {isPreviewOpen ? "Hide Visual Draft Preview" : "Preview Visual Draft Framing"}
                            </span>
                            {isPreviewOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {isPreviewOpen && (
                            <div className="mt-3 max-w-sm mx-auto p-2 bg-surface-strong border border-border rounded-lg animate-fade-in">
                              <PostGraphic
                                title={prompt.title}
                                aspect={prompt.aspect}
                                category="AI SYNTHESIS // IMAGEN 3"
                                variant={1}
                              />
                            </div>
                          )}
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

        {/* Loading Indicator */}
        {isGenerating && (
          <div className="flex gap-3 max-w-md mr-auto">
            <div className="w-8 h-8 rounded-lg bg-surface-strong border border-border text-foreground flex items-center justify-center shrink-0 shadow-xs">
              <Bot size={16} />
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl rounded-tl-none shadow-xs space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs font-mono text-foreground font-semibold">
                <Loader2 size={14} className="animate-spin text-foreground" />
                <span>Synthesizing Image Generation Prompts...</span>
              </div>
              <p className="text-[11px] font-mono text-muted">
                Calibrating lighting, aspect ratios, and social captions for {selectedModel}.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inspiration Chips */}
      <div className="px-4 py-2 border-t border-border bg-surface-strong/40 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase text-muted whitespace-nowrap">
          Quick ideas:
        </span>
        {PRESET_IDEAS.map((idea) => (
          <button
            key={idea.label}
            type="button"
            onClick={() => handleSubmit(idea.prompt, idea.aspect)}
            className="px-2.5 py-1 rounded-full bg-surface border border-border hover:border-foreground text-[11px] text-foreground font-mono transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            ✦ {idea.label} ({idea.aspect})
          </button>
        ))}
      </div>

      {/* Input Composer Bar */}
      <div className="p-3 sm:p-4 border-t border-border bg-surface">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-2"
        >
          <div className="relative flex items-end bg-surface-strong border border-border rounded-xl overflow-hidden focus-within:border-foreground transition-colors">
            <textarea
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe your visual concept (e.g., '3 carousel slides announcing our edge database release')..."
              className="w-full p-3 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none resize-none font-mono leading-relaxed"
            />

            <div className="p-2 flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputQuery.trim() || isGenerating}
                className="h-8 px-3"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <span>Generate</span>
                    <Send size={13} />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted px-1">
            <span>Press Enter to generate, Shift+Enter for new line</span>
            <span className="hidden sm:inline">Calibrated for Imagen 3 &amp; DALL·E 3</span>
          </div>
        </form>
      </div>
    </div>
  );
}
