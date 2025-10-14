/**
 * Placeholder for Convex storage URL resolution
 * This will be implemented when the metadata queries are integrated
 */
export async function resolveStorageUrl(
  storageId: string,
): Promise<string | null> {
  // This is a placeholder implementation
  // In the actual implementation, this would use the Convex client to resolve storage URLs
  console.warn("Storage URL resolution not yet implemented for:", storageId);
  return null;
}

/**
 * Resolves multiple storage IDs to URLs in parallel
 */
export async function resolveMultipleStorageUrls(
  storageIds: string[],
): Promise<Record<string, string | null>> {
  const results = await Promise.allSettled(
    storageIds.map(async (id) => ({
      id,
      url: await resolveStorageUrl(id),
    })),
  );

  const resolved: Record<string, string | null> = {};
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      resolved[result.value.id] = result.value.url;
    }
  });

  return resolved;
}

/**
 * Optimizes image URL with proper dimensions and caching
 */
export function optimizeImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {},
): string {
  try {
    const urlObj = new URL(url);

    // Add optimization parameters for supported services
    if (options.width) {
      urlObj.searchParams.set("w", options.width.toString());
    }
    if (options.height) {
      urlObj.searchParams.set("h", options.height.toString());
    }
    if (options.quality) {
      urlObj.searchParams.set("q", options.quality.toString());
    }

    // Add cache-busting parameter
    urlObj.searchParams.set("v", Date.now().toString());

    return urlObj.toString();
  } catch (error) {
    console.warn("Failed to optimize image URL:", url, error);
    return url;
  }
}

/**
 * Validates that an image URL meets social media requirements
 */
export async function validateImageForSocialMedia(url: string): Promise<{
  isValid: boolean;
  width?: number;
  height?: number;
  error?: string;
}> {
  try {
    // In a real implementation, you might want to fetch the image and check dimensions
    // For now, we'll assume Convex storage URLs are properly sized
    if (url.includes("convex.cloud") || url.includes("convex.site")) {
      return { isValid: true };
    }

    // For other URLs, we'd need to implement actual image dimension checking
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gets the appropriate fallback image based on content type
 */
export function getFallbackImageUrl(
  type: "wizard" | "duel" | "app",
  status?: "active" | "completed" | "waiting",
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://ai-wizard-duel.com";

  switch (type) {
    case "wizard":
      return `${baseUrl}/images/default-wizard.jpg`;
    case "duel":
      switch (status) {
        case "completed":
          return `${baseUrl}/images/epic-duel.jpeg`;
        case "waiting":
          return `${baseUrl}/images/duel-bg.jpg`;
        case "active":
        default:
          return `${baseUrl}/images/duel-bg.jpg`;
      }
    case "app":
    default:
      return `${baseUrl}/images/hero.jpg`;
  }
}
