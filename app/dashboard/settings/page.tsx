"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/_design-system/icons";
import { FacebookIcon } from "@/_components/ui/icons";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { useToast } from "@/_components/ui/toast";
import { MODEL_OPTIONS, DEFAULT_IMAGE_MODEL } from "@/_lib/mock-config";

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

  // Live pages state
  const [pages, setPages] = useState<FacebookPageItem[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_IMAGE_MODEL);
  const [isSavingModel, setIsSavingModel] = useState(false);

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

  // Fetch current user settings & pages
  const refreshUserData = async () => {
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (json.ok && json.data) {
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
    // Fetch pages from /api/me
    fetch("/api/me")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          if (Array.isArray(json.data.pages)) {
            setPages(json.data.pages);
          }
        }
      })
      .catch(() => {});

    // Fetch settings (including image model)
    fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          if (json.data.imageModel) {
            setSelectedModel(json.data.imageModel);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Save image model to profile
  const handleSaveModel = async () => {
    try {
      setIsSavingModel(true);
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageModel: selectedModel }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error?.message || "Failed to save model");
      }
      addToast({
        title: "Model Updated",
        description: `Image generation will use ${MODEL_OPTIONS.find((m) => m.id === selectedModel)?.name || selectedModel}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      addToast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save model.",
        variant: "error",
      });
    } finally {
      setIsSavingModel(false);
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
          { id: "credentials" as const, label: "Image Generation", icon: "cloud" },
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
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted block mb-1">
                  Managed Provider
                </span>
                <h2 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                  <span>Cloudflare Workers AI</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-status-success/15 text-status-success font-semibold">
                    Active
                  </span>
                </h2>
              </div>
            </div>

            <p className="text-xs text-muted">
              Image generation uses the Cloudflare Workers AI REST API. Credentials are server-managed and not exposed to the browser.
            </p>

            <div className="rounded-lg border border-border bg-surface-raised p-4 text-xs text-muted space-y-1">
              <p>The workspace owner configures <code className="font-mono bg-surface px-1 py-0.5 rounded text-foreground">CLOUDFLARE_ACCOUNT_ID</code> and <code className="font-mono bg-surface px-1 py-0.5 rounded text-foreground">CLOUDFLARE_API_TOKEN</code> in the server environment.</p>
              <p>No user-supplied API keys are required.</p>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div>
              <h2 className="text-sm font-bold font-display text-foreground">
                Default Image Model
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Choose the Cloudflare Workers AI model used for image generation.
              </p>
            </div>

            <div className="space-y-3">
              {MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedModel === opt.id
                      ? "border-foreground bg-surface-raised"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="image-model"
                    value={opt.id}
                    checked={selectedModel === opt.id}
                    onChange={() => setSelectedModel(opt.id)}
                    className="accent-foreground cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-foreground block">
                      {opt.name}
                    </span>
                    <span className="text-[11px] text-muted block mt-0.5">
                      {opt.description}
                    </span>
                    <span className="text-[10px] font-mono text-muted/70 block mt-0.5">
                      {opt.id}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button size="sm" onClick={handleSaveModel} disabled={isSavingModel}>
                {isSavingModel ? "Saving..." : "Save Model"}
              </Button>
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
