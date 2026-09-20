"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useScroll, motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/_components/ui/logo";
import { Button } from "@/_components/ui/button";
import { ThemeToggle } from "@/_components/ui/theme-toggle";

const NAV_LINKS = [
  { label: "Pipeline", href: "#how-it-works" },
  { label: "Capabilities", href: "#features" },
  { label: "Interactive Demo", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function StickyNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 2px Top Scroll Progress Bar */}
      <motion.div
        style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-foreground z-50 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Sticky Header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-250 ${
          isScrolled
            ? "bg-surface/85 backdrop-blur-md border-b border-border shadow-xs py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Logo href="/" size="md" />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-body-sm text-muted hover:text-foreground transition-colors font-medium relative py-1 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-foreground transition-all duration-200 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-body-sm font-medium text-muted hover:text-foreground transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Button
              href="/get-started"
              size="sm"
              variant="primary"
              iconTrailing="arrow_right"
            >
              Get started
            </Button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-foreground rounded-xs hover:bg-surface-strong transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-in Menu Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Drawer */}
          <div className="relative ml-auto w-full max-w-xs h-full bg-surface border-l border-border p-6 flex flex-col justify-between shadow-2xl z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Logo href="/" size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-muted hover:text-foreground rounded-xs hover:bg-surface-strong cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-col space-y-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-headline-sm font-medium text-foreground hover:text-muted transition-colors py-1.5"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="space-y-3 pt-6 border-t border-border">
              <Button
                href="/login"
                variant="outline"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Button>
              <Button
                href="/get-started"
                variant="primary"
                className="w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>Get started</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
