"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/_design-system/icons";
import { navItems } from "@/_design-system/tokens";
import { Tooltip } from "@/_components/ui/tooltip";

interface SidebarProps {
  onClose?: () => void;
  className?: string;
  onOpenCommand?: () => void;
}

export function Sidebar({ onClose, className = "", onOpenCommand }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed preference from localStorage if available
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("sidebar_collapsed");
        if (saved !== null) {
          setCollapsed(saved === "true");
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  };

  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
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

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } bg-surface text-foreground flex-shrink-0 flex flex-col justify-between z-40 border-r border-border sticky top-0 h-dvh transition-[width] duration-200 ease-out ${className}`}
      aria-label="Dashboard Sidebar Navigation"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden group"
          >
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 group-hover:scale-105 transition-transform">
              AS
            </div>
            {!collapsed && (
              <div className="min-w-0 transition-opacity duration-150">
                <span className="text-sm font-bold text-foreground tracking-tight block font-display truncate">
                  AutoPost Studio
                </span>
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider block -mt-0.5 truncate">
                  Engine
                </span>
              </div>
            )}
          </Link>

          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex p-1.5 rounded text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon
                name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
                size={16}
              />
            </button>

            {/* Mobile close */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 text-muted hover:text-foreground rounded"
                aria-label="Close navigation"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Command Trigger */}
        {!collapsed && onOpenCommand && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={onOpenCommand}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border bg-surface-raised/60 hover:bg-surface-raised text-muted hover:text-foreground text-xs transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon name="search" size={14} />
                <span>Command Menu</span>
              </span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 bg-surface border border-border rounded text-muted">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-2 space-y-1 overflow-y-auto flex-1" aria-label="Dashboard Navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                  isActive
                    ? "bg-surface-raised text-foreground font-semibold border border-border shadow-xs"
                    : "text-muted hover:bg-surface-raised/60 hover:text-foreground border border-transparent"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className={`flex-shrink-0 ${isActive ? "text-foreground" : "text-muted"}`}
                />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-medium ${
                          item.badgeVariant === "warn"
                            ? "bg-status-warning/15 text-status-warning"
                            : item.badgeVariant === "ready"
                            ? "bg-status-success/15 text-status-success"
                            : item.badgeVariant === "schedule"
                            ? "bg-status-info/15 text-status-info"
                            : "bg-surface-raised text-muted border border-border"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} content={`${item.label}${item.badge ? ` (${item.badge})` : ""}`} side="right">
                  {linkContent}
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-border flex-shrink-0 space-y-2">
        {!collapsed ? (
          <div className="bg-surface-raised p-3 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">
                Monthly Quota
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-foreground text-background font-bold">
                STARTER
              </span>
            </div>
            <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border">
              <div className="bg-foreground h-full w-[0%] rounded-full" />
            </div>
            <div className="flex justify-between mt-2 text-[11px] font-mono text-muted">
              <span>0 / 150 posts</span>
              <span>0%</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Tooltip content="Monthly Quota: 0 / 150 posts used" side="right">
              <div className="h-8 w-8 rounded-lg bg-surface-raised border border-border flex items-center justify-center font-mono text-[10px] font-bold text-foreground">
                0%
              </div>
            </Tooltip>
          </div>
        )}

        {/* Settings shortcut */}
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={`flex items-center gap-2 p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised text-xs transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Icon name="settings" size={16} />
          {!collapsed && <span>Workspace Settings</span>}
        </Link>

        {/* Sign out button */}
        {collapsed ? (
          <Tooltip content="Sign Out" side="right">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center p-2 rounded-lg text-muted hover:text-status-error hover:bg-status-error/10 text-xs transition-colors"
              aria-label="Sign out"
            >
              <Icon name="logout" size={16} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2 p-2 rounded-lg text-muted hover:text-status-error hover:bg-status-error/10 text-xs transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <Icon name="logout" size={16} />
            <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
