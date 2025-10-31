// Image configuration for different use cases in the AI Wizard Duel app

export const IMAGE_SIZES = {
  // Wizard illustrations - smaller for profile display
  WIZARD_ILLUSTRATION: {
    width: 512,
    height: 512,
    quality: 85,
    format: "png" as const,
  },

  // Duel round illustrations - medium size for story display
  DUEL_ROUND: {
    width: 768,
    height: 768,
    quality: 80,
    format: "png" as const,
  },

  // Thumbnails for lists and previews
  THUMBNAIL: {
    width: 256,
    height: 256,
    quality: 75,
    format: "webp" as const,
  },

  // Large display images
  LARGE_DISPLAY: {
    width: 1024,
    height: 1024,
    quality: 85,
    format: "png" as const,
  },
} as const;

export const MULTI_SIZE_CONFIGS = {
  // Generate multiple sizes for wizard illustrations
  WIZARD_MULTI: [
    { width: 256, height: 256, suffix: "thumbnail" },
    { width: 512, height: 512, suffix: "medium" },
    { width: 768, height: 768, suffix: "large" },
  ],

  // Generate multiple sizes for duel illustrations
  DUEL_MULTI: [
    { width: 384, height: 384, suffix: "small" },
    { width: 768, height: 768, suffix: "medium" },
    { width: 1024, height: 1024, suffix: "large" },
  ],
} as const;

// Helper function to get image size config by type
export function getImageSizeConfig(type: keyof typeof IMAGE_SIZES) {
  return IMAGE_SIZES[type];
}

// Helper function to get multi-size config by type
export function getMultiSizeConfig(type: keyof typeof MULTI_SIZE_CONFIGS) {
  return MULTI_SIZE_CONFIGS[type];
}
