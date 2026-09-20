"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Icon } from "@/_design-system/icons";
import { FacebookIcon } from "@/_components/ui/icons";
import { Button } from "@/_components/ui/button";
import { ThemeToggle } from "@/_components/ui/theme-toggle";
import { useMe } from "@/_lib/hooks/use-me";

interface DashboardHeaderProps {
  onOpenMobileNav?: () => void;
  onOpenCommand?: () => void;
  pageName?: string;
  followerCount?: string;
}

export function DashboardHeader({
  onOpenMobileNav,
  onOpenCommand,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { data: meData } = useMe();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
      router.refresh();
    }
  };

  const defaultPage = meData?.pages?.find((p) => p.is_default) || meData?.pages?.[0];
  const userInitial = meData?.user?.email?.charAt(0).toUpperCase() || "U";
  const userEmail = meData?.user?.email || "Account";

  return (
    <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile menu toggle + Connected Page Switcher + Status */}
      <div className="flex items-center gap-3">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 text-muted hover:text-foreground hover:bg-surface-raised rounded-lg"
            aria-label="Open navigation menu"
          >
            <Icon name="menu" size={20} />
          </button>
        )}

        {/* Channel Indicator / Switcher */}
        {defaultPage ? (
          <Link
            href="/dashboard/settings?tab=channels"
            className="flex items-center gap-2 bg-surface-raised hover:bg-surface-raised/80 transition-colors px-3 py-1.5 rounded-lg border border-border cursor-pointer max-w-[220px] sm:max-w-none shadow-xs"
          >
            <div className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center flex-shrink-0">
              <FacebookIcon size={12} />
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-semibold text-foreground truncate">
                {defaultPage.page_name}
              </span>
              <Icon name="verified" size={14} fill className="text-foreground flex-shrink-0" />
            </div>
            <span className="hidden sm:inline-block text-[11px] font-mono text-muted pl-2 border-l border-border">
              {defaultPage.followers_count} followers
            </span>
            <Icon name="expand_more" size={14} className="text-muted flex-shrink-0" />
          </Link>
        ) : (
          <Link
            href="/dashboard/settings?tab=channels"
            className="flex items-center gap-2 bg-surface-raised hover:bg-surface-raised/80 transition-colors px-3 py-1.5 rounded-lg border border-dashed border-border cursor-pointer shadow-xs"
          >
            <div className="w-5 h-5 rounded bg-muted/20 text-muted flex items-center justify-center flex-shrink-0">
              <FacebookIcon size={12} />
            </div>
            <span className="text-xs font-medium text-muted truncate">
              No Facebook Page connected
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foreground text-background font-semibold">
              Connect
            </span>
          </Link>
        )}

        {/* AI Status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted bg-surface-raised/60 px-2.5 py-1 rounded-md border border-border">
          <span className="relative flex h-2 w-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-status-success" />
          </span>
          <span>Cloudflare Workers AI</span>
        </div>
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Command Palette Trigger */}
        {onOpenCommand && (
          <button
            type="button"
            onClick={onOpenCommand}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface-raised/60 hover:bg-surface-raised text-muted hover:text-foreground text-xs transition-colors cursor-pointer"
          >
            <Icon name="search" size={14} />
            <span className="text-xs">Quick search</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 bg-surface border border-border rounded text-muted">
              ⌘K
            </kbd>
          </button>
        )}

        <Button
          href="/dashboard/prompts"
          variant="outline"
          size="sm"
          className="hidden md:inline-flex items-center gap-1.5"
        >
          <Sparkles size={14} className="text-foreground" />
          <span>AI Assistant</span>
        </Button>

        <Button
          href="/dashboard/prompts"
          size="sm"
          icon="add_circle"
          className="hidden sm:inline-flex"
        >
          <span>New Prompt Batch</span>
        </Button>

        {/* Mobile icon-only add button */}
        <Link
          href="/dashboard/prompts"
          className="sm:hidden p-2 bg-foreground text-background rounded-lg flex items-center justify-center shadow-xs"
          aria-label="Add prompt batch"
        >
          <Icon name="add" size={18} />
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User profile avatar dropdown */}
        <div className="relative flex items-center pl-1 sm:pl-2 border-l border-border" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-lg bg-surface-raised border border-border text-foreground flex items-center justify-center font-mono font-bold text-xs hover:border-foreground transition-colors cursor-pointer"
            aria-label="User account menu"
            aria-expanded={userMenuOpen}
          >
            {userInitial}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-56 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2 border-b border-border">
                <span className="text-[10px] font-mono uppercase text-muted tracking-wider block">
                  Signed in as
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {userEmail}
                </span>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                <SettingsIcon size={14} />
                <span>Workspace Settings</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-status-error hover:bg-status-error/10 transition-colors text-left cursor-pointer"
              >
                <LogOut size={14} />
                <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
