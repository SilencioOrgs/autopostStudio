export interface StepItem {
  number: number;
  label: string;
  description: string;
}

export const ONBOARDING_STEPS: readonly StepItem[] = [
  {
    number: 1,
    label: "Choose platform",
    description: "Select your social channel",
  },
  {
    number: 2,
    label: "Connect",
    description: "Link your Facebook Page",
  },
  {
    number: 3,
    label: "Ready",
    description: "AI key and test finish",
  },
] as const;

export const SETUP_STEPS: readonly StepItem[] = [
  {
    number: 1,
    label: "Platform selected",
    description: "Facebook Page chosen",
  },
  {
    number: 2,
    label: "Page connected",
    description: "Facebook Page linked",
  },
  {
    number: 3,
    label: "AI key & finish",
    description: "Google AI Studio & test",
  },
] as const;
