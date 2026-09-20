"use client";

import { useReducedMotion as useFramerReducedMotion, type Variants } from "framer-motion";

/**
 * AutoPost Studio Motion System
 * Monochrome Engineering — Restraint over decoration.
 */

export const durations = {
  fast: 0.15,      // 150ms
  base: 0.25,      // 250ms
  slow: 0.4,       // 400ms
  deliberate: 0.7, // 700ms
} as const;

export const easings = {
  expoOut: [0.16, 1, 0.3, 1] as const,
  expoIn: [0.4, 0, 0.2, 1] as const,
  linear: [0, 0, 1, 1] as const,
};

export const transitions = {
  fast: { duration: durations.fast, ease: easings.expoOut },
  base: { duration: durations.base, ease: easings.expoOut },
  slow: { duration: durations.slow, ease: easings.expoOut },
  deliberate: { duration: durations.deliberate, ease: easings.expoOut },
  exit: { duration: durations.fast, ease: easings.expoIn },
};

/**
 * Hook to check if user prefers reduced motion.
 * Standardizes reduced motion behavior across all interactive components.
 */
export function useMotionSafe() {
  const shouldReduceMotion = useFramerReducedMotion();
  return {
    shouldReduceMotion: Boolean(shouldReduceMotion),
  };
}

/**
 * Standard scroll reveal variants for sections and primary content blocks.
 */
export const scrollRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.slow,
      ease: easings.expoOut,
    },
  },
};

/**
 * Reduced-motion compliant scroll reveal (opacity only, ≤150ms).
 */
export const reducedScrollRevealVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.fast },
  },
};

/**
 * Stagger container for grids, cards, and list items (60ms stagger).
 */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

/**
 * Item entrance within a stagger container.
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.base,
      ease: easings.expoOut,
    },
  },
};

/**
 * Scale transitions for primary buttons and interactive pill elements.
 */
export const buttonScaleVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: durations.fast, ease: easings.expoOut } },
  tap: { scale: 0.98, transition: { duration: durations.fast, ease: easings.expoIn } },
};

/**
 * Modal & dialog overlay variants.
 */
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.base, ease: easings.expoOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.fast, ease: easings.expoIn },
  },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.expoOut },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: durations.fast, ease: easings.expoIn },
  },
};

/**
 * Drawer variants (slide from right on desktop, slide from bottom on mobile).
 */
export const drawerRightVariants: Variants = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: durations.slow, ease: easings.expoOut },
  },
  exit: {
    x: "100%",
    opacity: 0.8,
    transition: { duration: durations.fast, ease: easings.expoIn },
  },
};

export const drawerBottomVariants: Variants = {
  hidden: { y: "100%", opacity: 0.8 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: durations.slow, ease: easings.expoOut },
  },
  exit: {
    y: "100%",
    opacity: 0.8,
    transition: { duration: durations.fast, ease: easings.expoIn },
  },
};

/**
 * Toast notification animation variants.
 */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durations.base, ease: easings.expoOut },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.95,
    transition: { duration: durations.fast, ease: easings.expoIn },
  },
};
