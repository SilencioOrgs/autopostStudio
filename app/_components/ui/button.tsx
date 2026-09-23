"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/_design-system/icons";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  href?: string;
  icon?: string;
  iconLeading?: string;
  iconTrailing?: string;
  children?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  href,
  icon,
  iconLeading,
  iconTrailing,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "h-8 px-3 text-label-sm gap-1.5 rounded-xs",
    md: "h-10 px-4 text-label-md gap-2 rounded-xs",
    lg: "h-12 px-6 text-body-md gap-2.5 rounded-sm",
  };

  const variantStyles = {
    primary:
      "bg-foreground text-background hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] shadow-xs font-semibold",
    secondary:
      "bg-surface-strong text-foreground border border-border hover:border-border-strong active:scale-[0.98]",
    outline:
      "bg-transparent text-foreground border border-border hover:border-foreground hover:bg-surface-strong active:scale-[0.98]",
    ghost:
      "bg-transparent text-muted hover:text-foreground hover:bg-surface-strong active:scale-[0.98]",
    danger:
      "bg-accent-error text-white hover:opacity-90 active:scale-[0.98] shadow-xs",
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;
  const effectiveLeadingIcon = iconLeading || icon;

  const content = (
    <>
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : effectiveLeadingIcon ? (
        <Icon name={effectiveLeadingIcon} size={size === "sm" ? 14 : 16} />
      ) : null}
      {children}
      {!loading && iconTrailing && (
        <Icon name={iconTrailing} size={size === "sm" ? 14 : 16} />
      )}
    </>
  );

  if (!children && !props["aria-label"]) {
    throw new Error("Icon-only Button requires an aria-label");
  }

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={combinedClasses} role="button">
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {content}
    </button>
  );
}
