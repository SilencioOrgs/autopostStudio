"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  Check,
  ShieldCheck,
  HelpCircle,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  Radio,
  Info,
} from "lucide-react";
import { Stepper } from "@/_components/stepper";
import { OnboardingFooter } from "@/_components/onboarding-footer";
import { FacebookIcon } from "@/_components/ui/icons";
import { Button } from "@/_components/ui/button";
import { Dialog } from "@/_components/ui/dialog";
import { SETUP_STEPS } from "@/_lib/steps";
import { useToast } from "@/_components/ui/toast";
import type { ApiResponse } from "@/app/_lib/errors";

interface ConnectedFacebookPage {
  id: string;
  page_id: string;
  page_name: string;
  category: string | null;
  followers_count: number;
  token_last4: string;
  token_status: "valid" | "invalid" | "expired" | "unverified";
  token_expires_at: string | null;
  last_verified_at: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json: ApiResponse<ConnectedFacebookPage[]> = await res.json();
    if (!json.ok) throw new Error(json.error.message);
    return json.data;
  });

export default function ConnectFacebookPage() {
  const { toast } = useToast();
  const { data: pages = [], isLoading, mutate } = useSWR<ConnectedFacebookPage[]>(
    "/api/facebook/pages",
    fetcher
  );

  // Form state for adding a page
  const [showAddForm, setShowAddForm] = useState(false);
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [pageName, setPageName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Action states for existing pages
  const [verifyingPageId, setVerifyingPageId] = useState<string | null>(null);
  const [disconnectingPage, setDisconnectingPage] = useState<ConnectedFacebookPage | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Help & Info modal state
  const [showHelp, setShowHelp] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const defaultPage = pages.find((p) => p.is_default) || pages[0];

  // Handler: Verify & add page
  const handleConnectPage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanId = pageId.trim();
    const cleanToken = token.trim();

    if (!cleanId) {
      setFormError("Please enter your Facebook Page ID.");
      return;
    }

    if (!/^\d+$/.test(cleanId)) {
      setFormError("Facebook Page ID must be numeric digits only (e.g. 104829104812391).");
      return;
    }

    if (!cleanToken) {
      setFormError("Please enter your Page Access Token.");
      return;
    }

    if (cleanToken.length < 15) {
      setFormError("Access token appears too short. Meta tokens usually start with 'EAA...'.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/facebook/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: cleanId,
          token: cleanToken,
          pageName: pageName.trim() || undefined,
        }),
      });

      const json: ApiResponse<ConnectedFacebookPage> = await res.json();
      if (!json.ok) {
        throw new Error(json.error.message);
      }

      toast({
        title: "Facebook Page Connected",
        description: `Verified and linked ${json.data.page_name} with encrypted token (••••••${json.data.token_last4}).`,
        variant: "success",
      });

      // Reset form and refresh list
      setPageId("");
      setToken("");
      setPageName("");
      setShowAddForm(false);
      await mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setFormError(msg);
      toast({
        title: "Connection Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handler: Re-verify an existing page
  const handleReverifyPage = async (page: ConnectedFacebookPage) => {
    setVerifyingPageId(page.id);
    try {
      const res = await fetch(`/api/facebook/pages/${page.id}/verify`, { method: "POST" });
      const json: ApiResponse<{ status: string }> = await res.json();

      if (!json.ok) {
        throw new Error(json.error.message);
      }

      toast({
        title: "Token Verified",
        description: `Permissions for ${page.page_name} are active.`,
        variant: "success",
      });
      await mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Re-verification failed";
      toast({
        title: "Verification Alert",
        description: msg,
        variant: "error",
      });
      await mutate();
    } finally {
      setVerifyingPageId(null);
    }
  };

  // Handler: Set page as default
  const handleSetDefault = async (pageId: string) => {
    try {
      const res = await fetch(`/api/facebook/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const json: ApiResponse<ConnectedFacebookPage> = await res.json();
      if (!json.ok) throw new Error(json.error.message);

      toast({
        title: "Default Page Set",
        description: `${json.data.page_name} is now the default publishing target.`,
        variant: "success",
      });
      await mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set default";
      toast({ title: "Update Failed", description: msg, variant: "error" });
    }
  };

  // Handler: Disconnect page
  const handleConfirmDisconnect = async () => {
    if (!disconnectingPage) return;
    setIsDisconnecting(true);

    try {
      const res = await fetch(`/api/facebook/pages/${disconnectingPage.id}`, { method: "DELETE" });
      const json: ApiResponse<{ deleted: boolean; affectedScheduledPosts: number; message: string }> =
        await res.json();

      if (!json.ok) throw new Error(json.error.message);

      toast({
        title: "Page Disconnected",
        description: json.data.message,
        variant: "neutral",
      });

      setDisconnectingPage(null);
      await mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      toast({ title: "Failed to disconnect", description: msg, variant: "error" });
    } finally {
      setIsDisconnecting(false);
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
                  ONBOARDING // STAGE 01
                </span>
                <h2 className="text-headline-sm font-bold text-foreground mt-1">
                  Setup content engine
                </h2>
                <p className="text-body-sm text-muted mt-1 leading-relaxed">
                  Authorize your Facebook Pages and configure your BYO AI generation key.
                </p>
              </div>

              <Stepper
                steps={SETUP_STEPS}
                currentStep={1}
                variant="vertical"
                completedDescriptionOverride={{
                  1: defaultPage ? `${defaultPage.page_name} (${pages.length} linked)` : undefined,
                }}
              />
            </div>

            {/* Meta Reality Check Notice */}
            <div className="p-5 border border-border bg-surface-strong rounded-xs space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs font-mono">
                <Info size={16} className="text-accent-warn shrink-0" />
                <span>META APP PERMISSIONS REALITY CHECK</span>
              </div>
              <p className="text-xs text-muted leading-relaxed font-mono">
                Publishing to Facebook Pages requires an app with <strong>pages_manage_posts</strong> and{" "}
                <strong>pages_read_engagement</strong> permissions. Until your Meta App passes App Review,
                only accounts with an app role (Admin, Developer, or Tester) can publish content.
              </p>
            </div>

            {/* Trust Policy Box */}
            <div className="p-5 border border-border bg-surface-strong rounded-xs space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs font-mono">
                <ShieldCheck size={16} className="text-accent-ready shrink-0" />
                <span>SECURITY GUARANTEE</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Page Access Tokens are encrypted with AES-256-GCM before writing to the database. Tokens
                never leave the server and are only decrypted during scheduled Facebook post creation.
              </p>
            </div>
          </aside>

          {/* RIGHT: Main Form Container */}
          <section className="lg:col-span-8 p-6 sm:p-10 border border-border bg-surface rounded-xs shadow-xs space-y-8">
            <div className="space-y-2">
              <span className="font-mono text-xs text-muted uppercase tracking-widest font-semibold">
                STEP 01 // SOCIAL CHANNELS
              </span>
              <h1 className="text-headline-xl font-bold text-foreground tracking-tight">
                Connect your Facebook Pages
              </h1>
              <p className="text-body-md text-muted leading-relaxed">
                Link Facebook Pages using your Page ID and Page Access Token. You can connect multiple
                Pages, set a primary default, and re-verify status anytime.
              </p>
            </div>

            {/* Connected Pages List */}
            {isLoading ? (
              <div className="p-8 border border-border rounded-xs bg-surface-strong text-center space-y-3">
                <Loader2 size={24} className="animate-spin text-muted mx-auto" />
                <p className="text-xs font-mono text-muted">Checking connected pages...</p>
              </div>
            ) : pages.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold">
                    Connected Pages ({pages.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm((prev) => !prev)}
                  >
                    <Plus size={14} />
                    <span>{showAddForm ? "Cancel" : "Add Another Page"}</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-5 border rounded-xs bg-surface-strong transition-all ${
                        page.is_default ? "border-foreground" : "border-border"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xs bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FacebookIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-foreground text-sm font-mono">
                                {page.page_name}
                              </h4>
                              {page.is_default && (
                                <span className="text-[10px] font-mono px-2 py-0.5 bg-foreground text-background rounded-xs font-semibold">
                                  DEFAULT
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 border rounded-xs ${
                                  page.token_status === "valid"
                                    ? "border-accent-ready text-accent-ready bg-accent-ready/10"
                                    : "border-accent-error text-accent-error bg-accent-error/10"
                                }`}
                              >
                                {page.token_status}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-muted mt-0.5">
                              ID: {page.page_id} · {page.category || "Facebook Page"} · {page.followers_count}{" "}
                              followers · Token: ••••••{page.token_last4}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!page.is_default && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(page.id)}
                              title="Set as default publishing page"
                            >
                              <Radio size={13} />
                              <span className="hidden sm:inline">Set Default</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleReverifyPage(page)}
                            disabled={verifyingPageId === page.id}
                            title="Re-verify credentials against Graph API"
                          >
                            <RefreshCw
                              size={13}
                              className={verifyingPageId === page.id ? "animate-spin" : ""}
                            />
                            <span>{verifyingPageId === page.id ? "Checking..." : "Re-verify"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDisconnectingPage(page)}
                            className="text-status-error hover:bg-status-error/10"
                            title="Disconnect this page"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Add / Connect Page Form */}
            {(showAddForm || pages.length === 0) && (
              <form
                onSubmit={handleConnectPage}
                className="p-6 border border-border bg-surface-strong rounded-xs space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FacebookIcon size={18} className="text-[#1877F2]" />
                    <h3 className="font-mono text-xs uppercase font-bold tracking-wider text-foreground">
                      {pages.length === 0 ? "Connect Facebook Page" : "Add Another Facebook Page"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="text-xs font-mono text-muted hover:text-foreground underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>How to get Page Token?</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                {/* Form Error */}
                {formError && (
                  <div className="p-3 border border-status-error/30 bg-status-error/10 rounded-xs flex items-center gap-2 text-xs font-mono text-status-error">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Field: Page ID */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="fb-page-id"
                    className="block font-mono text-xs uppercase tracking-wider text-foreground font-semibold"
                  >
                    Facebook Page ID
                  </label>
                  <input
                    id="fb-page-id"
                    type="text"
                    value={pageId}
                    onChange={(e) => {
                      setPageId(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. 104829104812391"
                    className="w-full h-11 px-3.5 bg-surface border border-border rounded-xs font-mono text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>

                {/* Field: Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="fb-token"
                      className="block font-mono text-xs uppercase tracking-wider text-foreground font-semibold"
                    >
                      Page Access Token
                    </label>
                    <span className="text-[10px] font-mono text-muted">Never stored in plaintext</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="fb-token"
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="EAAOXZBrwP91kBA..."
                      className="w-full h-11 pl-3.5 pr-20 bg-surface border border-border rounded-xs font-mono text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 px-2.5 py-1 text-xs font-mono text-muted hover:text-foreground flex items-center gap-1 bg-surface-strong border border-border rounded-xs transition-colors cursor-pointer"
                    >
                      {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showToken ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                </div>

                {/* Field: Optional Label */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="fb-page-name"
                    className="block font-mono text-xs uppercase tracking-wider text-muted font-semibold"
                  >
                    Custom Page Label (Optional)
                  </label>
                  <input
                    id="fb-page-name"
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="e.g. My Brand Official"
                    className="w-full h-11 px-3.5 bg-surface border border-border rounded-xs font-mono text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isVerifying}
                    className="w-full sm:w-auto"
                  >
                    <Check size={15} />
                    <span>Verify &amp; Save Credentials</span>
                  </Button>
                  <span className="text-[11px] font-mono text-muted">
                    Validated directly with Meta Graph API
                  </span>
                </div>
              </form>
            )}

            {/* Permissions Details Disclosures */}
            <div className="space-y-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-mono text-muted hover:text-foreground cursor-pointer select-none transition-colors"
              >
                <HelpCircle size={14} />
                <span>What permissions does AutoPost Studio require?</span>
                <ChevronRight
                  size={14}
                  className={`transition-transform duration-200 ${showHelp ? "rotate-90" : ""}`}
                />
              </button>

              {showHelp && (
                <div className="p-4 bg-surface-strong border border-border rounded-xs text-xs font-mono text-muted space-y-2 animate-fade-in">
                  <p>
                    • <strong>pages_manage_posts:</strong> Required to publish photo posts, captions, and
                    native scheduled posts to your Page feed.
                  </p>
                  <p>
                    • <strong>pages_read_engagement:</strong> Reads post IDs to confirm successful delivery
                    and track publication state.
                  </p>
                  <p>
                    • <strong>No personal access:</strong> We never request access to personal profile
                    timelines, private Messenger chats, or ad account financials.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={Boolean(disconnectingPage)}
        onOpenChange={(open) => !open && setDisconnectingPage(null)}
        title="Disconnect Facebook Page?"
        description="Are you sure you want to disconnect this Page?"
        maxWidth="sm"
      >
        <div className="space-y-3 text-xs font-mono text-muted">
          <p>
            Disconnecting <strong>{disconnectingPage?.page_name}</strong> will remove access credentials.
            Any scheduled posts queued for this Page will be unlinked.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDisconnectingPage(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={isDisconnecting}
            onClick={handleConfirmDisconnect}
          >
            Disconnect Page
          </Button>
        </div>
      </Dialog>

      {/* Token Guide Dialog */}
      <Dialog
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
        title="How to get a Facebook Page Access Token"
        description="Follow these steps in Meta for Developers to generate your Page Access Token."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs font-mono text-muted leading-relaxed max-h-[50vh] overflow-y-auto pr-2 border-y border-border py-4">
          <div className="space-y-1">
            <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
              Step 1: Get your Page ID
            </h4>
            <p>
              Open your Facebook Page in a browser → click <strong>About</strong> → scroll down to{" "}
              <strong>Page ID</strong> (a string of 15–16 digits).
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
              Step 2: Generate a Page Token via Meta Graph Explorer
            </h4>
            <p>
              Go to <strong>developers.facebook.com/tools/explorer</strong> → select your Meta App → in
              User or Page dropdown, select your Facebook Page.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
              Step 3: Grant Required Permissions
            </h4>
            <p>
              Under Permissions, add: <code>pages_manage_posts</code> and{" "}
              <code>pages_read_engagement</code> → click <strong>Generate Access Token</strong>.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
              Step 4: Permanent System User Token (Recommended for Production)
            </h4>
            <p>
              In Meta Business Manager → Users → System Users → create a System User → Assign Assets (your
              Page) with Manage Page access → Generate a non-expiring Token.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="primary" size="sm" onClick={() => setIsGuideOpen(false)}>
            Got it
          </Button>
        </div>
      </Dialog>

      {/* Onboarding Footer */}
      <OnboardingFooter
        backHref="/get-started"
        nextHref="/get-started/setup"
        isNextDisabled={pages.length === 0}
        nextLabel="Continue to AI Setup"
      />
    </>
  );
}
