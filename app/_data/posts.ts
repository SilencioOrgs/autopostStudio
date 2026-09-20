export interface PostRecord {
  id: string;
  brand: string;
  platform: "facebook" | "instagram" | "tiktok";
  title: string;
  caption: string;
  hashtags: string[];
  aspect: "4:5" | "1:1" | "16:9";
  scheduledTime: string;
  status: "queued" | "generating" | "ready" | "scheduled" | "posted" | "failed";
  likes?: number;
  comments?: number;
  reach?: string;
  errorMessage?: string;
}

export const MOCK_POSTS: PostRecord[] = [
  {
    id: "post-101",
    brand: "Studio Nine",
    platform: "facebook",
    title: "Launch Teaser — 4:5 Edition",
    caption: "The pipeline that runs itself. High-fidelity visual generation paired with rigorous human approval.",
    hashtags: ["#StudioNine", "#AutomatedPublishing", "#EditorialSaaS"],
    aspect: "4:5",
    scheduledTime: "Today, 7:00 PM",
    status: "ready",
  },
  {
    id: "post-102",
    brand: "Northline Coffee",
    platform: "facebook",
    title: "Cold Brew Slow Drip Lab",
    caption: "18-hour slow extraction at 4°C. Clean, crisp, zero bitterness. Reserve your growler for the weekend.",
    hashtags: ["#NorthlineRoasters", "#ColdBrew", "#CraftCoffee"],
    aspect: "1:1",
    scheduledTime: "Tomorrow, 11:30 AM",
    status: "scheduled",
  },
  {
    id: "post-103",
    brand: "Studio Nine",
    platform: "facebook",
    title: "Engineering Workspace Aesthetics",
    caption: "Tools built for engineers and creators who value simplicity, focus, and durability.",
    hashtags: ["#StudioNine", "#MinimalDesign", "#DeskSetup"],
    aspect: "4:5",
    scheduledTime: "Sep 22, 7:00 PM",
    status: "posted",
    likes: 342,
    comments: 28,
    reach: "4.8k",
  },
  {
    id: "post-104",
    brand: "Northline Coffee",
    platform: "facebook",
    title: "Pour-Over Recipe Breakdown",
    caption: "15g medium-coarse grind, 250g water at 93°C, 3-minute drawdown. Consistency begins with measurements.",
    hashtags: ["#BrewGuide", "#NorthlineRoasters", "#PourOverMethod"],
    aspect: "4:5",
    scheduledTime: "Sep 23, 8:00 AM",
    status: "generating",
  },
  {
    id: "post-105",
    brand: "Studio Nine",
    platform: "facebook",
    title: "Weekly Design System Highlights",
    caption: "High contrast monochrome interfaces promote clarity and reduce cognitive strain during long sessions.",
    hashtags: ["#DesignSystems", "#MonochromeEngineering", "#UIUX"],
    aspect: "16:9",
    scheduledTime: "Sep 24, 6:00 PM",
    status: "queued",
  },
  {
    id: "post-106",
    brand: "Northline Coffee",
    platform: "facebook",
    title: "Seasonal Harvest Origins",
    caption: "Direct partnership with smallholder farmers in Huila. Sustainable practices, honest pricing.",
    hashtags: ["#DirectOrigin", "#CoffeeFarming", "#EthicalSourcing"],
    aspect: "4:5",
    scheduledTime: "Sep 20, 9:00 AM",
    status: "failed",
    errorMessage: "Facebook Page access token expired. Re-authenticate in Settings.",
  },
];
