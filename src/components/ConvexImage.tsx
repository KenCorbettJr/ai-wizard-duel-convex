"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Image from "next/image";

interface ConvexImageProps {
  storageId: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function ConvexImage({
  storageId,
  alt,
  width = 400,
  height = 300,
  className,
}: ConvexImageProps) {
  const imageUrl = useQuery(api.wizards.getIllustrationUrl, { storageId });

  if (!imageUrl) {
    return (
      <div
        className={`bg-gray-200 animate-pulse rounded-lg ${className}`}
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
    />
  );
}
