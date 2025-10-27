import { describe, it, expect, afterEach } from "vitest";
import {
  generateMockText,
  generateMockImage,
  isEmulatorMode,
} from "./mockServices";

describe("Mock Services", () => {
  const originalEnv = process.env.ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.ENV = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("isEmulatorMode", () => {
    it("should return true when ENV=emulate", () => {
      process.env.ENV = "emulate";
      expect(isEmulatorMode()).toBe(true);
    });

    it("should return false when ENV=dev", () => {
      process.env.ENV = "dev";
      expect(isEmulatorMode()).toBe(false);
    });
  });

  describe("generateMockText", () => {
    it("should return deterministic text based on prompt", () => {
      const prompt = "test prompt";
      const result1 = generateMockText(prompt);
      const result2 = generateMockText(prompt);

      expect(result1).toBe(result2);
      expect(result1).toContain("mock");
    });

    it("should return different text for different prompts", () => {
      const result1 = generateMockText("short");
      const result2 = generateMockText("this is a much longer prompt");

      expect(result1).not.toBe(result2);
    });
  });

  describe("generateMockImage", () => {
    it("should return an ArrayBuffer", async () => {
      const result = await generateMockImage("test prompt");
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it("should return deterministic images based on prompt", async () => {
      const prompt = "test prompt";
      const result1 = await generateMockImage(prompt);
      const result2 = await generateMockImage(prompt);

      expect(result1.byteLength).toBe(result2.byteLength);

      // Compare the actual bytes
      const view1 = new Uint8Array(result1);
      const view2 = new Uint8Array(result2);
      expect(view1).toEqual(view2);
    }, 15000);

    it("should return different images for different prompts", async () => {
      const result1 = await generateMockImage("prompt 1");
      const result2 = await generateMockImage("prompt 2");

      const view1 = new Uint8Array(result1);
      const view2 = new Uint8Array(result2);

      // At least some bytes should be different
      let different = false;
      for (let i = 0; i < Math.min(view1.length, view2.length); i++) {
        if (view1[i] !== view2[i]) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });
  });
});
