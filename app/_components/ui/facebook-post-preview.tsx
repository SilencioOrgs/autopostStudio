import React from "react";
import { Icon } from "@/_design-system/icons";
import { FacebookIcon } from "@/_components/ui/icons";
import { PostGraphic } from "@/_components/ui/post-graphic";

export interface FacebookPostPreviewProps {
  pageName?: string;
  statusText?: string;
  caption?: string;
  hashtags?: string[] | string;
  seed?: string | number;
  collection?: string;
  aspect?: "4:5" | "1:1" | "16:9";
  showImage?: boolean;
  imageUrl?: string;
  modelBadge?: string;
  statusBadge?: string;
  className?: string;
}

export function FacebookPostPreview({
  pageName = "Studio Nine",
  statusText = "Scheduled for 7:00 PM",
  caption = "Precision in every detail. Introducing our new automated release schedule — visuals and captions engineered for consistency.",
  hashtags = ["#StudioNine", "#AutomatedDesign", "#Editorial", "#SocialEngine"],
  aspect = "4:5",
  showImage = false,
  imageUrl,
  modelBadge = "Cloudflare Workers AI",
  statusBadge = "Approved",
  className = "",
}: FacebookPostPreviewProps) {
  const hashtagStr = Array.isArray(hashtags)
    ? hashtags.join(" ")
    : hashtags;

  return (
    <div
      className={`glass-panel rounded-xs p-5 shadow-xl w-full select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            <FacebookIcon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-label-md text-foreground font-semibold truncate">
                {pageName}
              </span>
              <Icon
                name="verified"
                size={14}
                fill
                className="text-[#1877F2] shrink-0"
              />
            </div>
            <span className="text-[11px] font-mono text-muted block truncate">
              Facebook Page • {statusText}
            </span>
          </div>
        </div>
        {statusText && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-accent-schedule/10 text-accent-schedule border border-accent-schedule/20 shrink-0 ml-2">
            {statusText}
          </span>
        )}
      </div>

      {/* Embedded Graphic / Real Image */}
      {imageUrl ? (
        <div className="mt-3.5 overflow-hidden rounded-lg border border-border bg-black/40 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || "Generated image"}
            className="w-full h-auto object-cover max-h-[500px]"
          />
        </div>
      ) : showImage ? (
        <div className="mt-3.5 overflow-hidden">
          <PostGraphic title={caption} aspect={aspect} />
        </div>
      ) : null}

      {/* Caption */}
      <p className="pt-3 text-body-sm text-foreground leading-relaxed break-words">
        {caption}
      </p>

      {/* Hashtags */}
      {hashtagStr && (
        <div className="mt-2 text-[12px] font-mono text-muted break-words">
          {hashtagStr}
        </div>
      )}

      {/* Footer / Meta */}
      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-muted pt-3 border-t border-border">
        <span className="flex items-center gap-1.5">
          <Icon name="auto_awesome" size={13} />
          <span>{modelBadge}</span>
        </span>
        {statusBadge && (
          <span className="text-accent-ready font-semibold">
            {statusBadge}
          </span>
        )}
      </div>
    </div>
  );
}
