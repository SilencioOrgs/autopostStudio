"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/_design-system/icons";
import { FacebookIcon } from "@/_components/ui/icons";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { useToast } from "@/_components/ui/toast";
import { MODEL_OPTIONS } from "@/_lib/mock-config";

interface FacebookPageItem {
  id: string;
  page_id: string;
  page_name: string;
  category: string | null;
  followers_count: number;
  token_last4: string;
  token_status: string;
  is_default: boolean;
  last_verified_at: string | null;
}

interface ProviderKeyItem {
  id: string;
  provider: string;
  key_last4: string;
  status: string;
  last_verified_at: string | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"credentials" | "channels" | "rules" | "general">(
    initialTab === "channels" ? "channels" : "credentials"
  );

  // Form states
  const [workspaceName, setWorkspaceName] = useState("AutoPost Studio Master");
  const [timeZone, setTimeZone] = useState("Asia/Manila (PHT, UTC+8)");
  const [runnerActive, setRunnerActive] = useState(true);

  // Live credentials & pages state
  const [providerKey, setProviderKey] = useState<ProviderKeyItem | null>(null);
  const [pages, setPages] = useState<FacebookPageItem[]>([]);

  // Google Key Input states
  const [googleKeyInput, setGoogleKeyInput] = useState("");
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].id);

  // Facebook Modal & Input states
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [pageIdInput, setPageIdInput] = useState("");
  const [pageTokenInput, setPageTokenInput] = useState("");
  const [pageNameInput, setPageNameInput] = useState("");
  const [isConnectingPage, setIsConnectingPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [textPostPage, setTextPostPage] = useState<FacebookPageItem | null>(null);
  const [textPostMessage, setTextPostMessage] = useState("");
  const [isPublishingTextPost, setIsPublishingTextPost] = useState(false);

  // Rules states
  const [draftMode, setDraftMode] = useState(false);
  const [defaultAspect, setDefaultAspect] = useState<"4:5" | "1:1" | "16:9">("4:5");

  // Fetch current user settings & credentials from /api/me
  const refreshUserData = async () => {
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (json.ok && json.data) {
        setProviderKey(json.data.providerKey || null);
        if (Array.isArray(json.data.pages)) {
          setPages(json.data.pages);
        }
      }
    } catch {
      // Error fetching user profile
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setProviderKey(json.data.providerKey || null);
          if (Array.isArray(json.data.pages)) {
            setPages(json.data.pages);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Save Google AI Studio Key
  const handleSaveGoogleKey = async () => {
    const trimmed = googleKeyInput.trim();
    if (!trimmed) {
      addToast({
        title: "Key Required",
        description: "Please enter your Google AI Studio API key.",
        variant: "error",
      });
      return;
    }

    try {
      setIsSavingKey(true);
      const res = await fetch("/api/keys/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google_ai_studio",
          apiKey: trimmed,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Failed to verify key");
      }

      setProviderKey(json.data.providerKey);
      setGoogleKeyInput("");
      addToast({
        title: "API Key Verified & Saved",
        description: "Google AI Studio key securely encrypted and stored.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      addToast({
        title: "Verification Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Delete Google AI Studio Key
  const handleDeleteGoogleKey = async () => {
    try {
      const res = await fetch("/api/keys/provider?provider=google_ai_studio", {
        method: "DELETE",
      });
      if (res.ok) {
        setProviderKey(null);
        addToast({
          title: "API Key Removed",
          description: "Google AI Studio credentials deleted.",
          variant: "neutral",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to remove API key.",
        variant: "error",
      });
    }
  };

  // Connect Facebook Page
  const handleConnectFacebook = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);

    const pageId = pageIdInput.trim();
    const token = pageTokenInput.trim();
    const pageName = pageNameInput.trim();

    if (!pageId || !token) {
      setPageError("Page ID and Page Access Token are both required.");
      return;
    }

    try {
      setIsConnectingPage(true);
      const res = await fetch("/api/facebook/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          token,
          pageName: pageName || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error?.message || "Failed to connect Facebook page");
      }

      setConnectModalOpen(false);
      setPageIdInput("");
      setPageTokenInput("");
      setPageNameInput("");
      refreshUserData();

      addToast({
        title: "Facebook Page Connected",
        description: json.data?.page_name ? `Connected ${json.data.page_name}` : "Page credentials verified and encrypted.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setPageError(msg);
    } finally {
      setIsConnectingPage(false);
    }
  };

  // Disconnect Facebook Page
  const handleDisconnectFacebook = async (pageRowId: string) => {
    try {
      const res = await fetch(`/api/facebook/pages/${encodeURIComponent(pageRowId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== pageRowId));
        addToast({
          title: "Page Disconnected",
          description: "Facebook Page removed from workspace.",
          variant: "neutral",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to disconnect page.",
        variant: "error",
      });
    }
  };

  const handlePublishTextPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPostPage || !textPostMessage.trim()) return;

    try {
      setIsPublishingTextPost(true);
      const res = await fetch(`/api/facebook/pages/${encodeURIComponent(textPostPage.id)}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textPostMessage.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Failed to publish text post");
      }

      setTextPostPage(null);
      setTextPostMessage("");
      addToast({
        title: "Text Post Published",
        description: `${textPostPage.page_name} accepted the post successfully.`,
        variant: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "Text Post Failed",
        description: err instanceof Error ? err.message : "Facebook publishing failed.",
        variant: "error",
      });
    } finally {
      setIsPublishingTextPost(false);
    }
  };

  const handleSave = () => {
    addToast({
      title: "Settings Saved",
      description: "Workspace configuration updated.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-status-success" />
          <span className="font-mono text-xs text-muted uppercase tracking-wider">
            Workspace Configuration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight">
          Settings & Credentials
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage AI inference keys, connected Facebook Page tokens, automation cadence, and preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        {[
          { id: "credentials" as const, label: "AI Credentials (BYO)", icon: "key" },
          { id: "channels" as const, label: "Social Channels", icon: "share" },
          { id: "rules" as const, label: "Publishing Rules", icon: "tune" },
          { id: "general" as const, label: "General", icon: "settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "border-foreground text-foreground font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: AI Credentials */}
      {activeTab === "credentials" && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Key Status Card */}
          {providerKey ? (
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                    Configured Provider
                  </span>
                  <h2 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                    <span>Google AI Studio Key</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-status-success/15 text-status-success font-semibold">
                      Active
                    </span>
                  </h2>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteGoogleKey}
                  className="text-status-error hover:bg-status-error/10 hover:border-status-error"
                >
                  Remove Key
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-surface-raised border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-muted">Key Identifier: </span>
                  <span className="text-foreground font-bold">••••{providerKey.key_last4}</span>
                </div>
                <div className="text-muted">
                  Last verified:{" "}
                  <span className="text-foreground">
                    {providerKey.last_verified_at
                      ? new Date(providerKey.last_verified_at).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border bg-surface-raised/40 text-center space-y-1">
              <p className="text-xs font-semibold text-foreground">No Google AI Studio Key Configured</p>
              <p className="text-xs text-muted">
                Add your Gemini API key below to enable automated image rendering and generation.
              </p>
            </div>
          )}

          {/* Key Input Form */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-sm font-bold font-display text-foreground">
                {providerKey ? "Update Google AI Studio Key" : "Enter Google AI Studio Key"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Used for primary photorealistic and commercial graphic rendering via Imagen 3 & Gemini 2.5.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-grow">
                <input
                  type={showGoogleKey ? "text" : "password"}
                  value={googleKeyInput}
                  onChange={(e) => setGoogleKeyInput(e.target.value)}
                  className="w-full h-10 px-3.5 pr-10 rounded-lg bg-surface border border-border text-xs text-foreground font-mono focus:border-foreground focus:outline-none"
                  placeholder="Paste AIzaSy... key here"
                />
                <button
                  type="button"
                  aria-label="Toggle key visibility"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                >
                  <Icon name={showGoogleKey ? "visibility_off" : "visibility"} size={16} />
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                disabled={isSavingKey || !googleKeyInput.trim()}
                onClick={handleSaveGoogleKey}
              >
                {isSavingKey ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Validating...
                  </span>
                ) : (
                  "Test & Save Key"
                )}
              </Button>
            </div>

            <div>
              <label
                htmlFor="settings-model"
                className="block text-xs font-mono uppercase tracking-wider text-muted mb-1.5"
              >
                Default Image Model
              </label>
              <select
                id="settings-model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full sm:w-80 h-10 px-3 rounded-lg bg-surface border border-border text-xs text-foreground focus:border-foreground focus:outline-none cursor-pointer"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Channels */}
      {activeTab === "channels" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-display text-foreground">
                  Connected Facebook Pages
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Automated publisher posts drafts and scheduled graphics via Graph API.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="add"
                onClick={() => setConnectModalOpen(true)}
              >
                Connect Page
              </Button>
            </div>

            {pages.length > 0 ? (
              <div className="space-y-3">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="p-4 rounded-xl bg-surface-raised border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center flex-shrink-0">
                        <FacebookIcon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-bold text-foreground">
                            {page.page_name}
                          </h3>
                          <Icon name="verified" size={14} fill className="text-foreground" />
                        </div>
                        <span className="text-[11px] font-mono text-muted block">
                          Page ID: {page.page_id} • {page.followers_count} followers • Token: ••••{page.token_last4}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-status-success/15 text-status-success font-semibold">
                        {page.token_status}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTextPostPage(page)}
                      >
                        Post Text
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnectFacebook(page.id)}
                        className="text-muted hover:text-status-error"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-border bg-surface-raised/40 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface border border-border flex items-center justify-center text-muted">
                  <FacebookIcon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No Facebook Page Connected</p>
                  <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                    Connect your Facebook Page using a numeric Page ID and Page Access Token to begin automated posting.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon="add"
                  onClick={() => setConnectModalOpen(true)}
                >
                  Connect Facebook Page
                </Button>
              </div>
            )}
          </div>

          {/* Connect Facebook Dialog */}
          <Dialog
            open={connectModalOpen}
            onOpenChange={setConnectModalOpen}
            title="Connect Facebook Page"
          >
            <form onSubmit={handleConnectFacebook} className="space-y-4 pt-2">
              {pageError && (
                <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs">
                  {pageError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                  Facebook Page ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 104829104812391"
                  value={pageIdInput}
                  onChange={(e) => setPageIdInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-xs text-foreground font-mono focus:border-foreground focus:outline-none"
                />
                <span className="text-[10px] text-muted block mt-1">
                  Found in your Facebook Page &quot;About&quot; section.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                  Page Access Token *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="EAA..."
                  value={pageTokenInput}
                  onChange={(e) => setPageTokenInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-surface border border-border text-xs text-foreground font-mono focus:border-foreground focus:outline-none"
                />
                <span className="text-[10px] text-muted block mt-0.5">
                  Encrypted at rest with AES-256-GCM.
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-muted mb-1">
                  Page Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="My Business Page"
                  value={pageNameInput}
                  onChange={(e) => setPageNameInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-border text-xs text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConnectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isConnectingPage}>
                  {isConnectingPage ? "Connecting..." : "Save & Verify"}
                </Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            open={Boolean(textPostPage)}
            onOpenChange={(open) => {
              if (!open && !isPublishingTextPost) {
                setTextPostPage(null);
                setTextPostMessage("");
              }
            }}
            title={`Post text to ${textPostPage?.page_name || "Facebook Page"}`}
          >
            <form onSubmit={handlePublishTextPost} className="space-y-4 pt-2">
              <p className="text-xs text-muted">
                This publishes immediately to the selected Facebook Page without an image.
              </p>
              <textarea
                required
                autoFocus
                rows={6}
                maxLength={63206}
                value={textPostMessage}
                onChange={(e) => setTextPostMessage(e.target.value)}
                placeholder="Write the text you want to publish..."
                className="w-full p-3 rounded-lg bg-surface border border-border text-sm text-foreground focus:border-foreground focus:outline-none resize-y"
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPublishingTextPost}
                  onClick={() => {
                    setTextPostPage(null);
                    setTextPostMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPublishingTextPost || !textPostMessage.trim()}>
                  {isPublishingTextPost ? "Publishing..." : "Publish Text Post"}
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}

      {/* Tab: Publishing Rules */}
      {activeTab === "rules" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-sm font-bold font-display text-foreground">
                Automation Safeguards
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Configure auto-publishing gates and default render framing.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
              <div>
                <label
                  htmlFor="rules-draft-toggle"
                  className="text-xs font-semibold text-foreground block cursor-pointer"
                >
                  Draft Mode Only (Safety Net)
                </label>
                <p className="text-xs text-muted">
                  Posts are saved as unpublished Facebook Page drafts rather than broadcasting directly to followers.
                </p>
              </div>
              <input
                id="rules-draft-toggle"
                type="checkbox"
                checked={draftMode}
                onChange={(e) => setDraftMode(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
              <div>
                <label
                  htmlFor="rules-aspect"
                  className="text-xs font-semibold text-foreground block"
                >
                  Default Aspect Ratio
                </label>
                <p className="text-xs text-muted">
                  Standard framing applied to newly imported prompt sheets.
                </p>
              </div>
              <select
                id="rules-aspect"
                value={defaultAspect}
                onChange={(e) => setDefaultAspect(e.target.value as "4:5" | "1:1" | "16:9")}
                className="h-9 px-3 rounded-lg bg-surface border border-border text-xs text-foreground cursor-pointer"
              >
                <option value="4:5">4:5 Portrait (Recommended)</option>
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Landscape</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab: General */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div>
              <label
                htmlFor="workspace-name"
                className="block text-xs font-mono uppercase tracking-wider text-muted mb-1.5"
              >
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full sm:w-96 h-10 px-3 rounded-lg bg-surface border border-border text-xs text-foreground focus:border-foreground focus:outline-none font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="workspace-timezone"
                className="block text-xs font-mono uppercase tracking-wider text-muted mb-1.5"
              >
                Publishing Time Zone
              </label>
              <input
                id="workspace-timezone"
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full sm:w-96 h-10 px-3 rounded-lg bg-surface border border-border text-xs text-foreground focus:border-foreground focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
              <div>
                <label
                  htmlFor="runner-active-toggle"
                  className="text-xs font-semibold text-foreground block cursor-pointer"
                >
                  Autonomous Worker Daemon
                </label>
                <p className="text-xs text-muted">
                  Allow background tasks to process queued prompts automatically when slots open.
                </p>
              </div>
              <input
                id="runner-active-toggle"
                type="checkbox"
                checked={runnerActive}
                onChange={(e) => setRunnerActive(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-foreground cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button Footer */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button size="md" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted font-mono">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
