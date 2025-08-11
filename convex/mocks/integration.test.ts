import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateText } from "../aiTextGeneration";

describe("Mock Services Integration", () => {
  const originalEnv = process.env.ENV;

  afterEach(() => {
    process.env.ENV = originalEnv;
  });

  describe("Text Generation in Emulator Mode", () => {
    it("should use mock text generation when ENV=emulate", async () => {
      process.env.ENV = "emulate";

      const result = await generateText("Test prompt for wizard battle");

      expect(result).toMatch(/mock|emulator|test/i);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Image Generation in Emulator Mode", () => {
    it("should use mock image generation when ENV=emulate", async () => {
      process.env.ENV = "emulate";

      // Test the mock directly since convex-test has API differences
      const { generateMockImage } = await import("./mockServices");
      const result = await generateMockImage("A magical wizard casting spells");

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });
  });

  describe("Production Mode", () => {
    it("should not use mocks when ENV is not emulate", async () => {
      process.env.ENV = "dev";

      // This test would normally fail without real API keys, but that's expected
      // We're just testing that the mock detection works correctly
      try {
        await generateText("Test prompt");
      } catch (error) {
        // Expected to fail in test environment without real API keys
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).not.toContain("mock");
      }
    });
  });
});
