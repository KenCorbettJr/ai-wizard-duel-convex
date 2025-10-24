/**
 * Transforms a Convex storage URL to use our proxy in emulation mode
 * This is needed because Next.js 16 blocks private IP addresses
 */
export function transformConvexImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  // Check if this is a localhost Convex storage URL (emulation mode)
  // We don't need to check environment since we only transform localhost URLs

  // Check if this is a localhost Convex storage URL
  const localhostPattern = /^http:\/\/127\.0\.0\.1:3210\/api\/storage\/(.+)$/;
  const match = url.match(localhostPattern);

  if (match) {
    const storageId = match[1];
    return `/api/convex-image/${storageId}`;
  }

  return url;
}
