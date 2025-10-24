"use client";

import { useQuery } from "convex/react";
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
}

export const ConvexImage = memo(function ConvexImage({
  storageId,
  alt,
  width = 400,
  height = 300,
  className,
}: ConvexImageProps) {
  const imageUrl = useConvexImage(api.wizards.getIllustrationUrl, {
    storageId,
  });

  if (!imageUrl) {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg ${className}`}
        style={{ width, height }}
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
      priority={false}
      loading="lazy"
    />
  );
});
