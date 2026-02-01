import type { BillingCycle } from "@/types";

export interface SubscriptionTemplate {
  id: string;
  name: string;
  category: string;
  billing_cycle: BillingCycle;
}

export const SUBSCRIPTION_TEMPLATES: SubscriptionTemplate[] = [
  { id: "netflix", name: "Netflix", category: "streaming", billing_cycle: "monthly" },
  { id: "spotify", name: "Spotify", category: "music", billing_cycle: "monthly" },
  { id: "disney-plus", name: "Disney+", category: "streaming", billing_cycle: "monthly" },
  { id: "hbo-max", name: "HBO Max", category: "streaming", billing_cycle: "monthly" },
  { id: "amazon-prime", name: "Amazon Prime", category: "streaming", billing_cycle: "yearly" },
  { id: "apple-tv", name: "Apple TV+", category: "streaming", billing_cycle: "monthly" },
  { id: "icloud", name: "iCloud", category: "cloud", billing_cycle: "monthly" },
  { id: "google-one", name: "Google One", category: "cloud", billing_cycle: "monthly" },
  { id: "dropbox", name: "Dropbox", category: "cloud", billing_cycle: "monthly" },
  { id: "gym", name: "Gimnasio", category: "fitness", billing_cycle: "monthly" },
  { id: "microsoft-365", name: "Microsoft 365", category: "software", billing_cycle: "yearly" },
  { id: "adobe", name: "Adobe Creative Cloud", category: "software", billing_cycle: "monthly" },
  { id: "notion", name: "Notion", category: "software", billing_cycle: "monthly" },
  { id: "xbox-game-pass", name: "Xbox Game Pass", category: "gaming", billing_cycle: "monthly" },
  { id: "playstation-plus", name: "PlayStation Plus", category: "gaming", billing_cycle: "monthly" },
  { id: "newspaper", name: "Periódico / Revista", category: "news", billing_cycle: "monthly" },
  { id: "course", name: "Curso online", category: "education", billing_cycle: "monthly" },
];
