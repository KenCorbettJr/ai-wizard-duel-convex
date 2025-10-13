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
 * Generates complete default metadata for Next.js
 */
export function generateCompleteDefaultMetadata(
  overrides?: Partial<MetadataConfig>
): CompleteMetadata {
  const config = generateDefaultMetadata(overrides);

  // Validate and canonicalize the URL
  const canonicalResult = canonicalizeUrl(config.url);
  const canonicalUrl = canonicalResult.canonicalUrl;

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonicalUrl,
      type: config.type || "website",
      images: [
        {
          url: config.image || DEFAULT_SOCIAL_IMAGES.app,
          width: SOCIAL_IMAGE_DIMENSIONS.width,
          height: SOCIAL_IMAGE_DIMENSIONS.height,
          alt: "AI Wizard Duel - Magical Battles Await",
        },
      ],
      siteName: "AI Wizard Duel",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [config.image || DEFAULT_SOCIAL_IMAGES.app],
      site: "@aiwizardduel",
      creator: "@aiwizardduel",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Validates image dimensions for social media requirements
 */
export function validateImageDimensions(
  width: number,
  height: number
): {
  isValid: boolean;
  width: number;
  height: number;
  recommendation?: string;
} {
  const isValid =
    width >= SOCIAL_IMAGE_DIMENSIONS.minWidth &&
    height >= SOCIAL_IMAGE_DIMENSIONS.minHeight;

  if (!isValid) {
    return {
      isValid: false,
      width,
      height,
      recommendation: `Image dimensions ${width}x${height} are below the minimum requirement of ${SOCIAL_IMAGE_DIMENSIONS.minWidth}x${SOCIAL_IMAGE_DIMENSIONS.minHeight} for optimal social media display`,
    };
  }

  return {
    isValid: true,
    width,
    height,
  };
}

/**
 * Validates image URL and dimensions for social media
 */
export async function validateImageForSocialMedia(imageUrl: string): Promise<{
  isValid: boolean;
  url: string;
  dimensions?: { width: number; height: number };
  issues: string[];
}> {
  const issues: string[] = [];

  // Validate URL format
  try {
    new URL(imageUrl);
  } catch {
    issues.push("Invalid URL format");
    return {
      isValid: false,
      url: imageUrl,
      issues,
    };
  }

  // For now, we'll assume images are valid since we can't easily check dimensions
  // In a real implementation, you might use a service to fetch image metadata
  return {
    isValid: issues.length === 0,
    url: imageUrl,
    issues,
  };
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
 * Complete metadata interface for Next.js Metadata API
 */
export interface CompleteMetadata {
  title: string;
  description: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: "website" | "article";
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
    siteName: string;
    locale?: string;
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    images: string[];
    creator?: string;
    site?: string;
  };
  alternates: {
    canonical: string;
  };
  robots?: {
    index: boolean;
    follow: boolean;
  };
}

/**
 * Validates description length for social media optimization
 */
export function validateDescriptionLength(description: string): {
  isValid: boolean;
  length: number;
  recommendation?: string;
} {
  const length = description.length;

  if (length < 150) {
    return {
      isValid: false,
      length,
      recommendation:
        "Description should be at least 150 characters for better social media engagement",
    };
  }

  if (length > 300) {
    return {
      isValid: false,
      length,
      recommendation:
        "Description should be no more than 300 characters to avoid truncation",
    };
  }

  return {
    isValid: true,
    length,
  };
}

/**
 * Creates canonical URL with proper formatting
 */
export function createCanonicalUrl(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://ai-wizard-duel.com";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Normalizes and validates URL for canonical use
 */
export function canonicalizeUrl(url: string): {
  canonicalUrl: string;
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  try {
    const urlObj = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
    ];
    trackingParams.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    // Ensure HTTPS for external URLs
    if (urlObj.protocol === "http:" && urlObj.hostname !== "localhost") {
      urlObj.protocol = "https:";
      issues.push("Upgraded HTTP to HTTPS for security");
    }

    // Remove trailing slash unless it's the root path
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
      urlObj.pathname = pathname;
    }

    // Sort search parameters for consistency
    urlObj.searchParams.sort();

    return {
      canonicalUrl: urlObj.toString(),
      isValid: true,
      issues,
    };
  } catch (error) {
    issues.push(
      `Invalid URL format: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      canonicalUrl: url,
      isValid: false,
      issues,
    };
  }
}

/**
 * Validates metadata configuration for completeness and optimization
 */
export function validateMetadataConfig(config: MetadataConfig): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Validate title
  if (!config.title || config.title.trim().length === 0) {
    issues.push("Title is required");
  } else if (config.title.length > 60) {
    warnings.push(
      "Title is longer than 60 characters and may be truncated in search results"
    );
  }

  // Validate description
  const descValidation = validateDescriptionLength(config.description);
  if (!descValidation.isValid && descValidation.recommendation) {
    warnings.push(descValidation.recommendation);
  }

  // Validate URL
  const urlValidation = canonicalizeUrl(config.url);
  if (!urlValidation.isValid) {
    issues.push(...urlValidation.issues);
  }

  // Validate image URL if provided
  if (config.image) {
    try {
      new URL(config.image);
    } catch {
      issues.push("Invalid image URL format");
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
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
  const url = createCanonicalUrl(`/wizards/${wizard._id}`);

  return {
    title,
    description: formattedDescription,
    image: socialImage,
    url,
    type: "article",
  };
}

/**
 * Generates complete Next.js metadata for wizard pages
 */
export function generateCompleteWizardMetadata(
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
): CompleteMetadata {
  const config = generateWizardMetadata(wizard, imageUrl);

  // Validate the metadata configuration
  const validation = validateMetadataConfig(config);
  if (!validation.isValid) {
    console.error(`Wizard metadata validation failed:`, validation.issues);
  }
  if (validation.warnings.length > 0) {
    console.warn(`Wizard metadata warnings:`, validation.warnings);
  }

  // Canonicalize the URL
  const canonicalResult = canonicalizeUrl(config.url);
  const canonicalUrl = canonicalResult.canonicalUrl;

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonicalUrl,
      type: config.type || "article",
      images: [
        {
          url: config.image || DEFAULT_SOCIAL_IMAGES.wizard,
          width: SOCIAL_IMAGE_DIMENSIONS.width,
          height: SOCIAL_IMAGE_DIMENSIONS.height,
          alt: `${wizard.name} - AI Wizard Profile`,
        },
      ],
      siteName: "AI Wizard Duel",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [config.image || DEFAULT_SOCIAL_IMAGES.wizard],
      site: "@aiwizardduel",
      creator: "@aiwizardduel",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
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
  const url = createCanonicalUrl(`/duels/${duel._id}`);

  return {
    title,
    description: formattedDescription,
    image: socialImage,
    url,
    type: "article",
  };
}

/**
 * Generates complete Next.js metadata for duel pages
 */
export function generateCompleteDuelMetadata(
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
): CompleteMetadata {
  const config = generateDuelMetadata(duel, imageUrl);

  // Validate the metadata configuration
  const validation = validateMetadataConfig(config);
  if (!validation.isValid) {
    console.error(`Duel metadata validation failed:`, validation.issues);
  }
  if (validation.warnings.length > 0) {
    console.warn(`Duel metadata warnings:`, validation.warnings);
  }

  // Canonicalize the URL
  const canonicalResult = canonicalizeUrl(config.url);
  const canonicalUrl = canonicalResult.canonicalUrl;

  // Create appropriate alt text for the image
  const wizardNames = duel.wizards.map((w) => w.name).join(" vs ");
  const imageAlt =
    duel.status === "COMPLETED"
      ? `Epic duel between ${wizardNames} - Battle completed`
      : `Live magical duel: ${wizardNames}`;

  return {
    title: config.title,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonicalUrl,
      type: config.type || "article",
      images: [
        {
          url:
            config.image || getSocialImage("duel", mapDuelStatus(duel.status)),
          width: SOCIAL_IMAGE_DIMENSIONS.width,
          height: SOCIAL_IMAGE_DIMENSIONS.height,
          alt: imageAlt,
        },
      ],
      siteName: "AI Wizard Duel",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [
        config.image || getSocialImage("duel", mapDuelStatus(duel.status)),
      ],
      site: "@aiwizardduel",
      creator: "@aiwizardduel",
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
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
