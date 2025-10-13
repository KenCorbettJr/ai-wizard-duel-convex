import { Doc } from "../../convex/_generated/dataModel";

/**
 * Configuration interface for generating metadata
 */
export interface MetadataConfig {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article";
}

/**
 * Wizard-specific metadata interface
 */
export interface WizardMetadata {
  wizard: Doc<"wizards">;
  stats?: {
    wins: number;
    losses: number;
    winRate: number;
  };
}

/**
 * Duel-specific metadata interface
 */
export interface DuelMetadata {
  duel: Doc<"duels">;
  wizards: Doc<"wizards">[];
  status: "active" | "completed" | "waiting";
}

/**
 * Social media image dimensions for validation
 */
export const SOCIAL_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 630,
  minWidth: 1200,
  minHeight: 630,
} as const;

/**
 * Default social media images for different content types
 */
export const DEFAULT_SOCIAL_IMAGES = {
  app: "/images/hero.jpg", // Fallback to existing hero image
  wizard: "/images/default-wizard.jpg", // Existing default wizard image
  duelActive: "/images/duel-bg.jpg", // Existing duel background
  duelCompleted: "/images/epic-duel.jpeg", // Existing epic duel image
  duelWaiting: "/images/duel-bg.jpg", // Existing duel background
} as const;

/**
 * Default metadata configuration for the application
 */
const DEFAULT_METADATA: MetadataConfig = {
  title: "AI Wizard Duel - Magical Battles Await",
  description:
    "Create powerful wizards and engage in epic AI-powered spell-casting duels. Join the magical arena where strategy meets creativity in turn-based combat.",
  image: DEFAULT_SOCIAL_IMAGES.app,
  url: "https://ai-wizard-duel.com",
  type: "website",
};

/**
 * Generates default metadata for fallback scenarios
 */
export function generateDefaultMetadata(
  overrides?: Partial<MetadataConfig>
): MetadataConfig {
  return {
    ...DEFAULT_METADATA,
    ...overrides,
  };
}

/**
 * Validates image dimensions for social media requirements
 */
export function validateImageDimensions(
  width: number,
  height: number
): boolean {
  return (
    width >= SOCIAL_IMAGE_DIMENSIONS.minWidth &&
    height >= SOCIAL_IMAGE_DIMENSIONS.minHeight
  );
}

/**
 * Validates and formats image URL for social media
 */
export function validateImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  // Ensure the URL is absolute
  if (imageUrl.startsWith("/")) {
    return `${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-wizard-duel.com"}${imageUrl}`;
  }

  return imageUrl;
}

/**
 * Truncates description to optimal length for social media
 */
export function formatDescription(
  description: string,
  maxLength: number = 300
): string {
  if (description.length <= maxLength) {
    return description;
  }

  // Find the last complete word within the limit
  const truncated = description.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }

  return truncated + "...";
}

/**
 * Gets the appropriate social media image based on content type and status
 */
export function getSocialImage(
  type: "app" | "wizard" | "duel",
  status?: "active" | "completed" | "waiting"
): string {
  switch (type) {
    case "app":
      return DEFAULT_SOCIAL_IMAGES.app;
    case "wizard":
      return DEFAULT_SOCIAL_IMAGES.wizard;
    case "duel":
      switch (status) {
        case "completed":
          return DEFAULT_SOCIAL_IMAGES.duelCompleted;
        case "waiting":
          return DEFAULT_SOCIAL_IMAGES.duelWaiting;
        case "active":
        default:
          return DEFAULT_SOCIAL_IMAGES.duelActive;
      }
    default:
      return DEFAULT_SOCIAL_IMAGES.app;
  }
}

/**
 * Generates a cache key for metadata
 */
export function generateCacheKey(type: "wizard" | "duel", id: string): string {
  return `metadata_${type}_${id}`;
}

/**
 * Optimizes Convex storage URL for social media sharing
 */
export function optimizeConvexImageUrl(
  storageUrl: string | null | undefined
): string | undefined {
  if (!storageUrl) {
    return undefined;
  }

  // Convex storage URLs are already optimized, but we can add query parameters
  // for specific dimensions if needed in the future
  try {
    const url = new URL(storageUrl);

    // Add cache-busting parameter to ensure fresh images
    url.searchParams.set("v", Date.now().toString());

    return url.toString();
  } catch (error) {
    console.warn("Invalid Convex storage URL:", storageUrl, error);
    return undefined;
  }
}

/**
 * Gets the best available image for a wizard with fallback logic
 */
export function getWizardImageUrl(wizard: {
  illustration?: string;
  illustrationURL?: string;
}): string {
  // Priority: Convex storage illustration > external URL > default
  if (wizard.illustration) {
    // This will be resolved by the Convex query
    return wizard.illustration;
  }

  if (wizard.illustrationURL) {
    return (
      validateImageUrl(wizard.illustrationURL) || DEFAULT_SOCIAL_IMAGES.wizard
    );
  }

  return DEFAULT_SOCIAL_IMAGES.wizard;
}

/**
 * Gets the best available image for a duel with fallback logic
 */
export function getDuelImageUrl(duel: {
  featuredIllustration?: string;
  latestRoundIllustration?: string;
  status: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}): string {
  // Priority: Featured illustration > Latest round illustration > Status-based default
  if (duel.featuredIllustration) {
    return duel.featuredIllustration;
  }

  if (duel.latestRoundIllustration) {
    return duel.latestRoundIllustration;
  }

  // Map duel status to social image status
  let socialStatus: "active" | "completed" | "waiting";
  switch (duel.status) {
    case "COMPLETED":
      socialStatus = "completed";
      break;
    case "WAITING_FOR_PLAYERS":
      socialStatus = "waiting";
      break;
    case "IN_PROGRESS":
    default:
      socialStatus = "active";
      break;
  }

  return getSocialImage("duel", socialStatus);
}

/**
 * Resolves a Convex storage ID to an optimized URL
 * This function should be used with the Convex query to get actual URLs
 */
export function resolveStorageUrl(
  storageId: string | undefined,
  fallbackUrl: string
): string {
  // This is a placeholder - the actual URL resolution happens in Convex queries
  // The storageId will be resolved to a full URL by the getOptimizedImageUrl query
  return storageId ? `convex-storage://${storageId}` : fallbackUrl;
}

/**
 * Processes and optimizes image URL for metadata generation
 */
export function processImageForMetadata(
  imageUrl: string | undefined,
  fallbackUrl: string
): string {
  if (!imageUrl) {
    return validateImageUrl(fallbackUrl) || DEFAULT_SOCIAL_IMAGES.app;
  }

  // Handle Convex storage URLs (they start with convex-storage://)
  if (imageUrl.startsWith("convex-storage://")) {
    // This indicates the URL needs to be resolved via Convex
    return fallbackUrl; // Use fallback until resolved
  }

  // Handle regular URLs
  const optimizedUrl = optimizeConvexImageUrl(imageUrl);
  if (optimizedUrl) {
    return validateImageUrl(optimizedUrl) || fallbackUrl;
  }

  return validateImageUrl(fallbackUrl) || DEFAULT_SOCIAL_IMAGES.app;
}

/**
 * Generates wizard-specific metadata for social media sharing
 */
export function generateWizardMetadata(
  wizard: {
    _id: string;
    name: string;
    description: string;
    illustration?: string;
    illustrationURL?: string;
    wins?: number;
    losses?: number;
    winRate: number;
    totalDuels: number;
  },
  imageUrl?: string
): MetadataConfig {
  const wins = wizard.wins || 0;
  const losses = wizard.losses || 0;
  const winRatePercent = Math.round(wizard.winRate * 100);

  // Create wizard-specific title
  const title = `${wizard.name} - AI Wizard Duel`;

  // Create engaging description with stats
  let description = wizard.description;

  if (wizard.totalDuels > 0) {
    const statsText = `${wins} wins, ${losses} losses (${winRatePercent}% win rate)`;
    description = `${description} • ${statsText}`;
  } else {
    description = `${description} • Ready for their first magical duel`;
  }

  // Format description to optimal length
  const formattedDescription = formatDescription(description, 280);

  // Determine the best image to use
  let socialImage: string;
  if (imageUrl) {
    // Use provided optimized image URL
    socialImage = validateImageUrl(imageUrl) || DEFAULT_SOCIAL_IMAGES.wizard;
  } else {
    // Use wizard's image or fallback
    socialImage = getWizardImageUrl(wizard);
  }

  // Generate wizard profile URL
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-wizard-duel.com"}/wizards/${wizard._id}`;

  return {
    title,
    description: formattedDescription,
    image: socialImage,
    url,
    type: "article",
  };
}

/**
 * Generates duel-specific metadata for social media sharing
 */
export function generateDuelMetadata(
  duel: {
    _id: string;
    status: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    currentRound: number;
    numberOfRounds: number | "TO_THE_DEATH";
    wizards: Array<{
      _id: string;
      name: string;
      wins?: number;
      losses?: number;
      winRate: number;
    }>;
    winners?: string[];
    losers?: string[];
    featuredIllustration?: string;
    latestRoundIllustration?: string;
  },
  imageUrl?: string
): MetadataConfig {
  const wizardNames = duel.wizards.map((w) => w.name);

  // Create status-aware title
  let title: string;
  if (duel.status === "COMPLETED" && duel.winners && duel.losers) {
    const winnerNames = duel.winners
      .map((winnerId) => duel.wizards.find((w) => w._id === winnerId)?.name)
      .filter(Boolean)
      .join(" & ");
    const loserNames = duel.losers
      .map((loserId) => duel.wizards.find((w) => w._id === loserId)?.name)
      .filter(Boolean)
      .join(" & ");
    title = `Epic Duel: ${winnerNames} defeated ${loserNames}`;
  } else if (duel.status === "IN_PROGRESS") {
    title = `Live Duel: ${wizardNames.join(" vs ")}`;
  } else if (duel.status === "WAITING_FOR_PLAYERS") {
    title = `Join the Duel: ${wizardNames.join(" vs ")}`;
  } else {
    title = `Wizard Duel: ${wizardNames.join(" vs ")}`;
  }

  // Create engaging description with duel info
  let description = `Round ${duel.currentRound}`;
  if (typeof duel.numberOfRounds === "number") {
    description += ` of ${duel.numberOfRounds}`;
  } else {
    description += " - Battle to the death!";
  }

  // Add wizard win rates if available
  const wizardStats = duel.wizards
    .map((wizard) => {
      const winRate = Math.round(wizard.winRate * 100);
      return `${wizard.name} (${winRate}% win rate)`;
    })
    .join(" vs ");

  description += ` • ${wizardStats}`;

  // Format description to optimal length
  const formattedDescription = formatDescription(description, 280);

  // Determine the best image to use
  let socialImage: string;
  if (imageUrl) {
    // Use provided optimized image URL
    socialImage =
      validateImageUrl(imageUrl) ||
      getSocialImage("duel", mapDuelStatus(duel.status));
  } else {
    // Use duel's image or fallback
    socialImage = getDuelImageUrl(duel);
  }

  // Generate duel URL
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://ai-wizard-duel.com"}/duels/${duel._id}`;

  return {
    title,
    description: formattedDescription,
    image: socialImage,
    url,
    type: "article",
  };
}

/**
 * Maps duel status to social image status
 */
function mapDuelStatus(
  status: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
): "active" | "completed" | "waiting" {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "WAITING_FOR_PLAYERS":
      return "waiting";
    case "IN_PROGRESS":
    default:
      return "active";
  }
}
