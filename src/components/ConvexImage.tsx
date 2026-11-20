"use client";

import { api } from "../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";
import Image from "next/image";
import { memo } from "react";

interface ConvexImageProps {
  storageId: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Rendered size hint. Without it Next only offers 1x/2x of `width`. */
  sizes?: string;
  /** Re-encode quality. Stored images are already compressed, so stay high. */
  quality?: number;
}

export const ConvexImage = memo(function ConvexImage({
  storageId,
  alt,
  width = 400,
  height = 300,
  className,
  sizes,
  quality = 90,
}: ConvexImageProps) {
  const imageUrl = useConvexImage(api.wizards.getIllustrationUrl, {
    storageId,
  });

  if (!imageUrl) {
    return (
      <div
        className={`bg-muted animate-pulse rounded-lg ${className}`}
        // Height comes from the ratio, so a class like h-auto or h-full still
        // applies and the box never overflows a narrower container.
        style={{
          width,
          maxWidth: "100%",
          aspectRatio: `${width} / ${height}`,
        }}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      quality={quality}
      priority={false}
      loading="lazy"
    />
  );
});
