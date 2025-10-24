// Shared types to avoid circular dependencies

export type SubscriptionTier = "FREE" | "PREMIUM";

export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "PAST_DUE"
  | "TRIALING";

export type UserSubscription = {
  _id: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionEndsAt?: number;
  imageCredits: number;
  monthlyUsage: {
    duelsPlayed: number;
    wizardsCreated: number;
    imageGenerations: number;
    adsWatched: number;
    resetDate: number;
  };
} | null;

export type CanCreateWizardResult = {
  canCreate: boolean;
  reason?: string;
  currentCount: number;
  limit: number | "UNLIMITED";
};

export type CanStartDuelResult = {
  canStart: boolean;
  reason?: string;
  currentCount: number;
  limit: number | "UNLIMITED";
};

export type CanGenerateImagesResult = {
  canGenerate: boolean;
  reason?: string;
  imageCredits: number;
  isPremium: boolean;
};

export type CanWatchRewardAdResult = {
  canWatch: boolean;
  reason?: string;
  cooldownEndsAt?: number;
};

export type UserUsageStatus = {
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  wizards: {
    current: number;
    limit: number | "UNLIMITED";
    canCreate: boolean;
  };
  duels: {
    current: number;
    limit: number | "UNLIMITED";
    canStart: boolean;
  };
  imageCredits: {
    current: number;
    canGenerate: boolean;
    isPremium: boolean;
  };
  monthlyUsage: {
    duelsPlayed: number;
    wizardsCreated: number;
    imageGenerations: number;
    adsWatched: number;
    resetDate: number;
  };
} | null;
