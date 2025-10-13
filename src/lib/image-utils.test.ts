import { describe, it, expect } from "vitest";
import {
  optimizeImageUrl,
  getFallbackImageUrl,
  validateImageForSocialMedia,
  resolveStorageUrl,
  resolveMultipleStorageUrls,
} from "./image-utils";

describe("Image Utilities", () => {
  describe("optimizeImageUrl", () => {
    it("should add optimization parameters to URL", () => {
      const url = "https://example.com/image.jpg";
      const optimized = optimizeImageUrl(url, {
        width: 1200,
        height: 630,
        quality: 85,
      });

      expect(optimized).toContain("w=1200");
      expect(optimized).toContain("h=630");
      expect(optimized).toContain("q=85");
      expect(optimized).toContain("v=");
    });

    it("should handle URLs without optimization parameters", () => {
      const url = "https://example.com/image.jpg";
      const optimized = optimizeImageUrl(url);

      expect(optimized).toContain("v=");
      expect(optimized).not.toContain("w=");
      expect(optimized).not.toContain("h=");
      expect(optimized).not.toContain("q=");
    });

    it("should handle invalid URLs gracefully", () => {
      const invalidUrl = "not-a-url";
      const result = optimizeImageUrl(invalidUrl);

      expect(result).toBe(invalidUrl);
    });
  });

  describe("getFallbackImageUrl", () => {
    it("should return correct wizard fallback URL", () => {
      const url = getFallbackImageUrl("wizard");
      expect(url).toContain("/images/default-wizard.jpg");
    });

    it("should return correct duel fallback URLs for different statuses", () => {
      const activeUrl = getFallbackImageUrl("duel", "active");
      const completedUrl = getFallbackImageUrl("duel", "completed");
      const waitingUrl = getFallbackImageUrl("duel", "waiting");

      expect(activeUrl).toContain("/images/duel-bg.jpg");
      expect(completedUrl).toContain("/images/epic-duel.jpeg");
      expect(waitingUrl).toContain("/images/duel-bg.jpg");
    });

    it("should return app fallback URL", () => {
      const url = getFallbackImageUrl("app");
      expect(url).toContain("/images/hero.jpg");
    });

    it("should handle unknown type gracefully", () => {
      const url = getFallbackImageUrl("unknown" as "wizard" | "duel" | "app");
      expect(url).toContain("/images/hero.jpg");
    });
  });

  describe("validateImageForSocialMedia", () => {
    it("should validate Convex URLs as valid", async () => {
      const convexUrl = "https://example.convex.cloud/image.jpg";
      const result = await validateImageForSocialMedia(convexUrl);

      expect(result.isValid).toBe(true);
    });

    it("should validate other URLs as valid (placeholder implementation)", async () => {
      const url = "https://example.com/image.jpg";
      const result = await validateImageForSocialMedia(url);

      expect(result.isValid).toBe(true);
    });
  });

  describe("resolveStorageUrl", () => {
    it("should return null for placeholder implementation", async () => {
      const result = await resolveStorageUrl("test-storage-id");
      expect(result).toBeNull();
    });
  });

  describe("resolveMultipleStorageUrls", () => {
    it("should resolve multiple storage URLs", async () => {
      const storageIds = ["id1", "id2", "id3"];
      const result = await resolveMultipleStorageUrls(storageIds);

      expect(result).toHaveProperty("id1");
      expect(result).toHaveProperty("id2");
      expect(result).toHaveProperty("id3");
      expect(result.id1).toBeNull();
      expect(result.id2).toBeNull();
      expect(result.id3).toBeNull();
    });

    it("should handle empty array", async () => {
      const result = await resolveMultipleStorageUrls([]);
      expect(result).toEqual({});
    });
  });
});
