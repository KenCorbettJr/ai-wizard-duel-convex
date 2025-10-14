import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateDefaultMetadata,
  validateImageDimensions,
  validateImageUrl,
  formatDescription,
  getSocialImage,
  generateCacheKey,
  validateDescriptionLength,
  canonicalizeUrl,
  validateMetadataConfig,
  SOCIAL_IMAGE_DIMENSIONS,
  DEFAULT_SOCIAL_IMAGES,
  type MetadataConfig,
} from "./metadata";

describe("Metadata Utilities", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    }
  });

  describe("generateDefaultMetadata", () => {
    it("should return default metadata when no overrides provided", () => {
      const metadata = generateDefaultMetadata();

      expect(metadata).toEqual({
        title: "AI Wizard Duel - Magical Battles Await",
        description:
          "Create powerful wizards and engage in epic AI-powered spell-casting duels. Join the magical arena where strategy meets creativity in turn-based combat.",
        image: DEFAULT_SOCIAL_IMAGES.app,
        url: "https://ai-wizard-duel.com",
        type: "website",
      });
    });

    it("should merge overrides with default metadata", () => {
      const overrides: Partial<MetadataConfig> = {
        title: "Custom Title",
        description: "Custom description",
      };

      const metadata = generateDefaultMetadata(overrides);

      expect(metadata).toEqual({
        title: "Custom Title",
        description: "Custom description",
        image: DEFAULT_SOCIAL_IMAGES.app,
        url: "https://ai-wizard-duel.com",
        type: "website",
      });
    });

    it("should override all properties when provided", () => {
      const overrides: Partial<MetadataConfig> = {
        title: "New Title",
        description: "New description",
        image: "/custom-image.jpg",
        url: "https://custom-url.com",
        type: "article",
      };

      const metadata = generateDefaultMetadata(overrides);

      expect(metadata).toEqual(overrides);
    });

    it("should handle empty overrides object", () => {
      const metadata = generateDefaultMetadata({});

      expect(metadata).toEqual({
        title: "AI Wizard Duel - Magical Battles Await",
        description:
          "Create powerful wizards and engage in epic AI-powered spell-casting duels. Join the magical arena where strategy meets creativity in turn-based combat.",
        image: DEFAULT_SOCIAL_IMAGES.app,
        url: "https://ai-wizard-duel.com",
        type: "website",
      });
    });
  });

  describe("validateImageDimensions", () => {
    it("should return valid result for valid dimensions", () => {
      const result1 = validateImageDimensions(1200, 630);
      expect(result1.isValid).toBe(true);
      expect(result1.width).toBe(1200);
      expect(result1.height).toBe(630);
      expect(result1.recommendation).toBeUndefined();

      const result2 = validateImageDimensions(1400, 700);
      expect(result2.isValid).toBe(true);

      const result3 = validateImageDimensions(2000, 1000);
      expect(result3.isValid).toBe(true);
    });

    it("should return invalid result for dimensions below minimum width", () => {
      const result1 = validateImageDimensions(1199, 630);
      expect(result1.isValid).toBe(false);
      expect(result1.width).toBe(1199);
      expect(result1.height).toBe(630);
      expect(result1.recommendation).toContain("below the minimum requirement");

      const result2 = validateImageDimensions(800, 630);
      expect(result2.isValid).toBe(false);

      const result3 = validateImageDimensions(0, 630);
      expect(result3.isValid).toBe(false);
    });

    it("should return invalid result for dimensions below minimum height", () => {
      const result1 = validateImageDimensions(1200, 629);
      expect(result1.isValid).toBe(false);
      expect(result1.width).toBe(1200);
      expect(result1.height).toBe(629);
      expect(result1.recommendation).toContain("below the minimum requirement");

      const result2 = validateImageDimensions(1200, 400);
      expect(result2.isValid).toBe(false);

      const result3 = validateImageDimensions(1200, 0);
      expect(result3.isValid).toBe(false);
    });

    it("should return invalid result for both dimensions below minimum", () => {
      const result1 = validateImageDimensions(800, 400);
      expect(result1.isValid).toBe(false);
      expect(result1.recommendation).toContain("below the minimum requirement");

      const result2 = validateImageDimensions(1199, 629);
      expect(result2.isValid).toBe(false);
    });

    it("should handle edge cases with exact minimum dimensions", () => {
      const result = validateImageDimensions(
        SOCIAL_IMAGE_DIMENSIONS.minWidth,
        SOCIAL_IMAGE_DIMENSIONS.minHeight,
      );
      expect(result.isValid).toBe(true);
      expect(result.width).toBe(SOCIAL_IMAGE_DIMENSIONS.minWidth);
      expect(result.height).toBe(SOCIAL_IMAGE_DIMENSIONS.minHeight);
      expect(result.recommendation).toBeUndefined();
    });
  });

  describe("validateImageUrl", () => {
    it("should return undefined for undefined input", () => {
      expect(validateImageUrl(undefined)).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(validateImageUrl("")).toBeUndefined();
    });

    it("should return absolute URL unchanged", () => {
      const absoluteUrl = "https://example.com/image.jpg";
      expect(validateImageUrl(absoluteUrl)).toBe(absoluteUrl);
    });

    it("should convert relative URL to absolute using environment variable", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://custom-domain.com";
      const relativeUrl = "/images/wizard.jpg";
      const expected = "https://custom-domain.com/images/wizard.jpg";

      expect(validateImageUrl(relativeUrl)).toBe(expected);
    });

    it("should use default domain when environment variable not set", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const relativeUrl = "/images/wizard.jpg";
      const expected = "https://ai-wizard-duel.com/images/wizard.jpg";

      expect(validateImageUrl(relativeUrl)).toBe(expected);
    });

    it("should handle various absolute URL formats", () => {
      const urls = [
        "https://example.com/image.jpg",
        "http://example.com/image.png",
        "https://cdn.example.com/path/to/image.webp",
      ];

      urls.forEach((url) => {
        expect(validateImageUrl(url)).toBe(url);
      });
    });
  });

  describe("formatDescription", () => {
    it("should return description unchanged if within limit", () => {
      const shortDescription = "This is a short description.";
      expect(formatDescription(shortDescription)).toBe(shortDescription);
    });

    it("should truncate long description at word boundary", () => {
      const longDescription =
        "This is a very long description that exceeds the maximum character limit and should be truncated at a word boundary to maintain readability and proper formatting for social media platforms.";
      const result = formatDescription(longDescription, 100);

      expect(result.length).toBeLessThanOrEqual(104); // 100 + "..."
      expect(result.endsWith("...")).toBe(true);
      expect(result).not.toMatch(/\s\.\.\.$/); // Should not end with space before ellipsis
    });

    it("should use custom max length", () => {
      const description =
        "This is a description that should be truncated at fifty characters.";
      const result = formatDescription(description, 50);

      expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle description exactly at max length", () => {
      const description = "A".repeat(300);
      const result = formatDescription(description, 300);

      expect(result).toBe(description);
      expect(result.length).toBe(300);
    });

    it("should handle very short descriptions", () => {
      const description = "Short";
      expect(formatDescription(description, 300)).toBe(description);
    });

    it("should truncate at character limit if no good word boundary found", () => {
      const description = "A".repeat(400); // No spaces, all same character
      const result = formatDescription(description, 300);

      expect(result).toBe("A".repeat(300) + "...");
      expect(result.length).toBe(303);
    });

    it("should handle empty description", () => {
      expect(formatDescription("")).toBe("");
    });

    it("should find word boundary within 80% of max length", () => {
      // Create a description where the last space is at 85% of max length
      const maxLength = 100;
      const spacePosition = Math.floor(maxLength * 0.85);
      const description =
        "A".repeat(spacePosition) + " " + "B".repeat(maxLength - spacePosition);

      const result = formatDescription(description, maxLength);

      expect(result.endsWith("...")).toBe(true);
      expect(result.length).toBe(spacePosition + 3); // Position of space + "..."
    });
  });

  describe("getSocialImage", () => {
    it("should return app image for app type", () => {
      expect(getSocialImage("app")).toBe(DEFAULT_SOCIAL_IMAGES.app);
    });

    it("should return wizard image for wizard type", () => {
      expect(getSocialImage("wizard")).toBe(DEFAULT_SOCIAL_IMAGES.wizard);
    });

    it("should return active duel image for duel type without status", () => {
      expect(getSocialImage("duel")).toBe(DEFAULT_SOCIAL_IMAGES.duelActive);
    });

    it("should return active duel image for active status", () => {
      expect(getSocialImage("duel", "active")).toBe(
        DEFAULT_SOCIAL_IMAGES.duelActive,
      );
    });

    it("should return completed duel image for completed status", () => {
      expect(getSocialImage("duel", "completed")).toBe(
        DEFAULT_SOCIAL_IMAGES.duelCompleted,
      );
    });

    it("should return waiting duel image for waiting status", () => {
      expect(getSocialImage("duel", "waiting")).toBe(
        DEFAULT_SOCIAL_IMAGES.duelWaiting,
      );
    });

    it("should return app image for unknown type", () => {
      // @ts-expect-error Testing invalid input
      expect(getSocialImage("unknown")).toBe(DEFAULT_SOCIAL_IMAGES.app);
    });

    it("should handle all duel statuses correctly", () => {
      const statuses: Array<"active" | "completed" | "waiting"> = [
        "active",
        "completed",
        "waiting",
      ];
      const expectedImages = [
        DEFAULT_SOCIAL_IMAGES.duelActive,
        DEFAULT_SOCIAL_IMAGES.duelCompleted,
        DEFAULT_SOCIAL_IMAGES.duelWaiting,
      ];

      statuses.forEach((status, index) => {
        expect(getSocialImage("duel", status)).toBe(expectedImages[index]);
      });
    });
  });

  describe("generateCacheKey", () => {
    it("should generate correct cache key for wizard", () => {
      const wizardId = "wizard123";
      const expected = "metadata_wizard_wizard123";

      expect(generateCacheKey("wizard", wizardId)).toBe(expected);
    });

    it("should generate correct cache key for duel", () => {
      const duelId = "duel456";
      const expected = "metadata_duel_duel456";

      expect(generateCacheKey("duel", duelId)).toBe(expected);
    });

    it("should handle different ID formats", () => {
      const ids = [
        "abc123",
        "k1234567890abcdef",
        "short",
        "very-long-id-with-hyphens-and-numbers-123456789",
      ];

      ids.forEach((id) => {
        expect(generateCacheKey("wizard", id)).toBe(`metadata_wizard_${id}`);
        expect(generateCacheKey("duel", id)).toBe(`metadata_duel_${id}`);
      });
    });

    it("should handle empty ID", () => {
      expect(generateCacheKey("wizard", "")).toBe("metadata_wizard_");
      expect(generateCacheKey("duel", "")).toBe("metadata_duel_");
    });
  });

  describe("validateDescriptionLength", () => {
    it("should return valid for descriptions within range", () => {
      const result = validateDescriptionLength("A".repeat(200));
      expect(result.isValid).toBe(true);
      expect(result.length).toBe(200);
      expect(result.recommendation).toBeUndefined();
    });

    it("should return invalid for descriptions too short", () => {
      const result = validateDescriptionLength("Short");
      expect(result.isValid).toBe(false);
      expect(result.length).toBe(5);
      expect(result.recommendation).toContain("at least 150 characters");
    });

    it("should return invalid for descriptions too long", () => {
      const result = validateDescriptionLength("A".repeat(350));
      expect(result.isValid).toBe(false);
      expect(result.length).toBe(350);
      expect(result.recommendation).toContain("no more than 300 characters");
    });

    it("should handle edge cases", () => {
      const result150 = validateDescriptionLength("A".repeat(150));
      expect(result150.isValid).toBe(true);

      const result300 = validateDescriptionLength("A".repeat(300));
      expect(result300.isValid).toBe(true);
    });
  });

  describe("canonicalizeUrl", () => {
    it("should return valid canonical URL for valid input", () => {
      const result = canonicalizeUrl("https://example.com/path");
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://example.com/path");
      expect(result.issues).toHaveLength(0);
    });

    it("should remove tracking parameters", () => {
      const result = canonicalizeUrl(
        "https://example.com/path?utm_source=test&utm_medium=email&normal=keep",
      );
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://example.com/path?normal=keep");
    });

    it("should upgrade HTTP to HTTPS", () => {
      const result = canonicalizeUrl("http://example.com/path");
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://example.com/path");
      expect(result.issues).toContain("Upgraded HTTP to HTTPS for security");
    });

    it("should remove trailing slash", () => {
      const result = canonicalizeUrl("https://example.com/path/");
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://example.com/path");
    });

    it("should preserve root path trailing slash", () => {
      const result = canonicalizeUrl("https://example.com/");
      expect(result.isValid).toBe(true);
      expect(result.canonicalUrl).toBe("https://example.com/");
    });

    it("should handle invalid URLs", () => {
      const result = canonicalizeUrl("not-a-url");
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("validateMetadataConfig", () => {
    const validConfig = {
      title: "Test Title",
      description: "A".repeat(200),
      image: "https://example.com/image.jpg",
      url: "https://example.com/page",
      type: "article" as const,
    };

    it("should return valid for complete config", () => {
      const result = validateMetadataConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect missing title", () => {
      const result = validateMetadataConfig({ ...validConfig, title: "" });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain("Title is required");
    });

    it("should warn about long title", () => {
      const result = validateMetadataConfig({
        ...validConfig,
        title: "A".repeat(70),
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect invalid image URL", () => {
      const result = validateMetadataConfig({
        ...validConfig,
        image: "not-a-url",
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain("Invalid image URL format");
    });
  });

  describe("Constants", () => {
    it("should have correct social image dimensions", () => {
      expect(SOCIAL_IMAGE_DIMENSIONS).toEqual({
        width: 1200,
        height: 630,
        minWidth: 1200,
        minHeight: 630,
      });
    });

    it("should have all required default social images", () => {
      expect(DEFAULT_SOCIAL_IMAGES).toEqual({
        app: "/images/hero.jpg",
        wizard: "/images/default-wizard.jpg",
        duelActive: "/images/duel-bg.jpg",
        duelCompleted: "/images/epic-duel.jpeg",
        duelWaiting: "/images/duel-bg.jpg",
      });
    });

    it("should have valid image paths", () => {
      Object.values(DEFAULT_SOCIAL_IMAGES).forEach((imagePath) => {
        expect(imagePath).toMatch(/^\/images\/.+\.(jpg|jpeg|png|webp)$/);
      });
    });
  });
});
