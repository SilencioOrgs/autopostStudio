import { AccordionItemData } from "@/_components/ui/accordion";

export const FAQ_ITEMS: AccordionItemData[] = [
  {
    id: "faq-1",
    question: "How does the Bring Your Own (BYO) AI key work?",
    answer:
      "AutoPost Studio connects directly to your Google AI Studio (Gemini 2.5 / Imagen 3) or OpenAI API key. We send image generation requests directly to the model endpoints from your browser workspace without any proxy markup or credit deductions. You only pay standard API rates directly to the AI provider.",
  },
  {
    id: "faq-2",
    question: "Can posts ever be published without my explicit approval?",
    answer:
      "No. AutoPost Studio operates strictly with a human-in-the-loop approval gate. Every generated image, caption, and hashtag draft enters the Review stage first. Posts are only queued to publish once you review and click 'Approve'.",
  },
  {
    id: "faq-3",
    question: "What platforms are supported right now?",
    answer:
      "Facebook Pages publishing is fully operational today via official Graph API integration. Support for Instagram, TikTok, X (Twitter), and LinkedIn is actively in beta and will roll out to all active plans.",
  },
  {
    id: "faq-4",
    question: "How do I format my prompt sheets for import?",
    answer:
      "You can import a standard CSV or connect a Google Sheet containing four columns: 'Style', 'Image Prompt', 'Caption', and 'Hashtags'. AutoPost Studio parses each row into a distinct generation pipeline item.",
  },
  {
    id: "faq-5",
    question: "What happens if a scheduled post fails to publish?",
    answer:
      "If Facebook returns a temporary API error or expired token notice, AutoPost Studio immediately logs the failure, marks the item in your dashboard, and executes automatic retries according to your plan settings without losing your draft.",
  },
  {
    id: "faq-6",
    question: "Can I adjust captions and hashtags after image generation?",
    answer:
      "Yes. The Review deck features an inline markdown and text editor where you can tweak copy, add brand tags, or regenerate the image prompt before giving final publishing approval.",
  },
  {
    id: "faq-7",
    question: "Is there a free trial or refund policy?",
    answer:
      "All new accounts start with a 14-day full-access trial of the Studio plan with zero credit card required. If you decide to cancel a paid subscription within 30 days, we provide a full refund with no questions asked.",
  },
  {
    id: "faq-8",
    question: "Where are my API keys stored?",
    answer:
      "Keys are stored securely in your encrypted browser session or local keychain with only the last 4 characters displayed in the UI. Keys are never transmitted to third parties or shared across teams.",
  },
];
