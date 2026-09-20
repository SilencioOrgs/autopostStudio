"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/app/_components/ui/logo";
import { ThemeToggle } from "@/app/_components/ui/theme-toggle";
import { Button } from "@/app/_components/ui/button";
import { Dialog } from "@/app/_components/ui/dialog";
import { useToast } from "@/app/_components/ui/toast";
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, ShieldCheck, CheckSquare, Square, FileText } from "lucide-react";
import type { ApiResponse } from "@/app/_lib/errors";

interface SimpleAuthCardProps {
  initialMode?: "signin" | "signup";
}

export function SimpleAuthCard({ initialMode = "signin" }: SimpleAuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get("next") || "/dashboard";
  const { addToast } = useToast();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    terms?: string;
    general?: string;
  }>({});

  const validateForm = () => {
    const errs: {
      username?: string;
      email?: string;
      password?: string;
      terms?: string;
    } = {};

    if (mode === "signup") {
      if (!username.trim()) {
        errs.username = "Username is required.";
      } else if (username.length < 3) {
        errs.username = "Username must be at least 3 characters.";
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errs.username = "Letters, numbers, and underscores only.";
      }

      if (!termsAccepted) {
        errs.terms = "You must agree to the Terms & Conditions to register.";
      }
    }

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
            termsAccepted: true,
          }),
        });

        const json: ApiResponse<{ user: { id: string; email: string; emailConfirmed: boolean }; session: boolean }> =
          await res.json();

        if (!json.ok) {
          setErrors({ general: json.error.message });
          addToast({
            title: "Registration Failed",
            description: json.error.message,
            variant: "error",
          });
          setIsSubmitting(false);
          return;
        }

        addToast({
          title: "Account Created",
          description: `Welcome, ${username}! Starting onboarding setup...`,
          variant: "success",
        });

        router.push("/get-started");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const json: ApiResponse<{ user: { id: string; email: string; emailConfirmed: boolean }; session: boolean }> =
          await res.json();

        if (!json.ok) {
          setErrors({ general: json.error.message });
          addToast({
            title: "Sign In Failed",
            description: json.error.message,
            variant: "error",
          });
          setIsSubmitting(false);
          return;
        }

        addToast({
          title: "Signed In Successfully",
          description: "Loading dashboard...",
          variant: "success",
        });

        router.push(nextRoute);
      }
    } catch {
      setErrors({ general: "Network error. Please check connection and try again." });
      addToast({
        title: "Network Error",
        description: "Could not contact server. Please retry.",
        variant: "error",
      });
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <Logo href="/" size="sm" />
        <ThemeToggle />
      </header>

      {/* Main Centered Auth Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-surface-strong border border-border rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded-md font-semibold transition-all cursor-pointer text-center ${
                mode === "signin"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-md font-semibold transition-all cursor-pointer text-center ${
                mode === "signup"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Sign in to AutoPost Studio" : "Create your account"}
            </h1>
            <p className="text-xs text-muted mt-1 font-mono">
              {mode === "signin"
                ? "Access your automated posting pipeline"
                : "BYO Google AI Studio key · Direct Facebook publishing"}
            </p>
          </div>

          {/* General Error Banner */}
          {errors.general && (
            <div className="p-3 bg-status-error/10 border border-status-error/30 rounded-lg text-xs font-mono text-status-error">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field: Username (Signup Only) */}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-username"
                  className="block text-xs font-mono uppercase tracking-wider text-foreground font-semibold"
                >
                  Username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-muted pointer-events-none">
                    <User size={15} />
                  </span>
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) {
                        setErrors((prev) => ({ ...prev, username: undefined }));
                      }
                    }}
                    placeholder="e.g. content_lead"
                    autoComplete="username"
                    className="w-full h-11 pl-9 pr-3.5 bg-surface-strong border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>
                {errors.username && (
                  <p className="text-[11px] font-mono text-status-error">{errors.username}</p>
                )}
              </div>
            )}

            {/* Field: Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-mono uppercase tracking-wider text-foreground font-semibold"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="e.g. editor@company.com"
                  autoComplete="email"
                  className="w-full h-11 pl-9 pr-3.5 bg-surface-strong border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-mono text-status-error">{errors.email}</p>
              )}
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-mono uppercase tracking-wider text-foreground font-semibold"
                >
                  Password
                </label>
                <span className="text-[10px] font-mono text-muted">Min 8 characters</span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full h-11 pl-9 pr-10 bg-surface-strong border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted/50 focus:outline-none focus:border-foreground transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 text-muted hover:text-foreground cursor-pointer transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-mono text-status-error">{errors.password}</p>
              )}
            </div>

            {/* Terms Checkbox (Signup Only) */}
            {mode === "signup" && (
              <div className="pt-1 space-y-1">
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTermsAccepted((prev) => !prev);
                      if (errors.terms) {
                        setErrors((prev) => ({ ...prev, terms: undefined }));
                      }
                    }}
                    className="mt-0.5 text-foreground cursor-pointer shrink-0"
                    aria-label="Accept Terms and Conditions"
                  >
                    {termsAccepted ? (
                      <CheckSquare size={16} className="text-foreground" />
                    ) : (
                      <Square size={16} className="text-muted hover:text-foreground" />
                    )}
                  </button>
                  <label className="text-xs font-mono text-muted leading-snug select-none">
                    I accept the{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-foreground underline underline-offset-2 hover:text-muted cursor-pointer font-medium"
                    >
                      Terms and Conditions
                    </button>{" "}
                    and Privacy Policy.
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-[11px] font-mono text-status-error pl-6">{errors.terms}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={mode === "signup" && !termsAccepted}
                className="w-full"
              >
                <span>{mode === "signin" ? "Sign In with Email" : "Create Account"}</span>
                <ArrowRight size={15} />
              </Button>
            </div>
          </form>

          {/* Simple Switch Prompt */}
          <div className="pt-2 border-t border-border text-center text-xs text-muted">
            {mode === "signin" ? (
              <span>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-foreground font-semibold hover:underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign up with email
                </button>
              </span>
            ) : (
              <span>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-foreground font-semibold hover:underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 p-3 border border-border bg-surface-strong rounded-lg flex items-center justify-center gap-2 text-center text-[11px] font-mono text-muted">
          <ShieldCheck size={14} className="text-status-success shrink-0" />
          <span>Email &amp; password auth · Secure Supabase session</span>
        </div>
      </main>

      {/* Terms & Conditions Modal */}
      <Dialog
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        title="Terms and Conditions (v1.0)"
        description="Please review our terms of service before registering your account."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs font-mono text-muted leading-relaxed max-h-[50vh] overflow-y-auto pr-2 border-y border-border py-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <FileText size={16} />
            <span>AutoPost Studio Terms of Service</span>
          </div>
          <p>
            Welcome to AutoPost Studio. By creating an account, you agree to these Terms. Please read them
            carefully.
          </p>
          <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
            1. Bring-Your-Own API Key
          </h4>
          <p>
            AutoPost Studio requires you to provide your own Google AI Studio API key for image and text
            generation. All generation costs are billed directly to your Google account. We do not provide
            a fallback key or apply markups to your inference.
          </p>
          <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
            2. Social Publishing &amp; Meta Permissions
          </h4>
          <p>
            Publishing to Facebook Pages requires valid Page Access Tokens. You represent that you have
            the legal right to publish content to any Facebook Page you connect to this service.
          </p>
          <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
            3. Data &amp; Security
          </h4>
          <p>
            Your API keys and Facebook access tokens are encrypted using AES-256-GCM at rest and are never
            shared with third parties or logged in plaintext.
          </p>
          <h4 className="text-foreground font-bold uppercase tracking-wider text-[11px]">
            4. Content Responsibility
          </h4>
          <p>
            You retain ownership of your prompts, uploaded sheets, and generated images. You are solely
            responsible for ensuring your content complies with Meta and Google policies.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTermsModal(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setTermsAccepted(true);
              setShowTermsModal(false);
              if (errors.terms) {
                setErrors((prev) => ({ ...prev, terms: undefined }));
              }
            }}
          >
            I Accept the Terms
          </Button>
        </div>
      </Dialog>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] font-mono text-muted py-2">
        AutoPost Studio · Content Engine Platform
      </footer>
    </div>
  );
}
