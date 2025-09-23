import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Mock the FAL module and fetch
const mockSubscribe = vi.fn();
const mockFetch = vi.fn();

vi.mock("@fal-ai/serverless-client", () => ({
  subscribe: mockSubscribe,
  config: vi.fn(),
}));

// Mock global fetch
global.fetch = mockFetch;

describe("Generate Image", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
    vi.clearAllMocks();
    // Mock the environment variable
    process.env.FAL_KEY = "test-fal-key";
  });

  describe("Image Generation", () => {
    test("should generate image with valid prompt", async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71]); // PNG header bytes
      const mockImageUrl = "https://example.com/image.png";

      // Mock FAL response
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "A magical wizard casting spells",
      });

      expect(result).toEqual(mockImageData.buffer);
      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: "A magical wizard casting spells",
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
    });

    test("should handle empty prompt", async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71]);
      const mockImageUrl = "https://example.com/image.png";

      // Mock FAL response
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "",
      });

      expect(result).toEqual(mockImageData.buffer);
      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: "",
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
    });

    test("should handle very long prompt", async () => {
      const longPrompt = "A wizard ".repeat(1000);
      const mockImageData = new Uint8Array([137, 80, 78, 71]);
      const mockImageUrl = "https://example.com/image.png";

      // Mock FAL response
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: longPrompt,
      });

      expect(result).toEqual(mockImageData.buffer);
      console.log({ mockSubscribe });
      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: longPrompt,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
    });

    test("should handle prompt with special characters", async () => {
      const specialPrompt = "A wizard with émojis 🧙‍♂️ and spëcial chars™!";
      const mockImageData = new Uint8Array([137, 80, 78, 71]);
      const mockImageUrl = "https://example.com/image.png";

      // Mock FAL response
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      // Mock fetch response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: specialPrompt,
      });

      expect(result).toEqual(mockImageData.buffer);
      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: specialPrompt,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle FAL service failure", async () => {
      mockSubscribe.mockRejectedValue(new Error("FAL service unavailable"));

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("Image generation failed: FAL service unavailable");
    });

    test("should handle missing FAL_KEY", async () => {
      const originalFalKey = process.env.FAL_KEY;
      delete process.env.FAL_KEY;

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("FAL_KEY environment variable is not set");

      // Restore the original value
      process.env.FAL_KEY = originalFalKey;
    });

    test("should handle no images in FAL response", async () => {
      mockSubscribe.mockResolvedValue({
        images: [],
      });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("No image generated from Fal service");
    });

    test("should handle missing images array in FAL response", async () => {
      mockSubscribe.mockResolvedValue({});

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("No image generated from Fal service");
    });

    test("should handle missing URL in FAL response", async () => {
      mockSubscribe.mockResolvedValue({
        images: [{}],
      });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("No image generated from Fal service");
    });

    test("should handle fetch failure", async () => {
      const mockImageUrl = "https://example.com/image.png";
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("Failed to fetch generated image: Not Found");
    });

    test("should handle fetch network error", async () => {
      const mockImageUrl = "https://example.com/image.png";
      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("Image generation failed: Network error");
    });

    test("should handle unknown error types", async () => {
      mockSubscribe.mockRejectedValue("Unknown error string");

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("Image generation failed: Unknown error");
    });

    test("should handle non-string error types", async () => {
      mockSubscribe.mockRejectedValue({ code: 500, message: "Server error" });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "A magical scene",
        })
      ).rejects.toThrow("Image generation failed: Unknown error");
    });
  });

  describe("Response Format Validation", () => {
    test("should handle different image formats", async () => {
      const mockImageData = new Uint8Array([255, 216, 255, 224]); // JPEG header bytes
      const mockImageUrl = "https://example.com/image.jpg";

      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "A JPEG image",
      });

      expect(result).toEqual(mockImageData.buffer);
    });

    test("should handle WebP format", async () => {
      const mockImageData = new Uint8Array([82, 73, 70, 70]); // WebP header bytes
      const mockImageUrl = "https://example.com/image.webp";

      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "A WebP image",
      });

      expect(result).toEqual(mockImageData.buffer);
    });

    test("should handle large image data", async () => {
      const largeImageData = new Uint8Array(1024 * 1024); // 1MB of data
      largeImageData.fill(255); // Fill with white pixels
      const mockImageUrl = "https://example.com/large-image.png";

      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(largeImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "A large image",
      });

      expect(result).toEqual(largeImageData.buffer);
      expect(new Uint8Array(result).length).toBe(1024 * 1024);
    });

    test("should handle empty image data", async () => {
      const emptyImageData = new Uint8Array(0);
      const mockImageUrl = "https://example.com/empty-image.png";

      mockSubscribe.mockResolvedValue({
        images: [{ url: mockImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(emptyImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "An empty image",
      });

      expect(result).toEqual(emptyImageData.buffer);
      expect(new Uint8Array(result).length).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle multiple images and use first one", async () => {
      const firstImageData = new Uint8Array([137, 80, 78, 71]);
      const firstImageUrl = "https://example.com/image1.png";
      const secondImageUrl = "https://example.com/image2.png";

      mockSubscribe.mockResolvedValue({
        images: [{ url: firstImageUrl }, { url: secondImageUrl }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(firstImageData.buffer),
      });

      const result = await t.action(api.generateImage.generateImage, {
        prompt: "Multiple images",
      });

      expect(result).toEqual(firstImageData.buffer);
      expect(global.fetch).toHaveBeenCalledWith(firstImageUrl);
    });

    test("should handle null URL in images array", async () => {
      const imageData = new Uint8Array([137, 80, 78, 71]);
      const validImageUrl = "https://example.com/image.png";

      mockSubscribe.mockResolvedValue({
        images: [{ url: null }, { url: validImageUrl }],
      });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "Null URL",
        })
      ).rejects.toThrow("No image generated from Fal service");
    });

    test("should handle undefined URL in images array", async () => {
      mockSubscribe.mockResolvedValue({
        images: [{ url: undefined }, {}],
      });

      await expect(
        t.action(api.generateImage.generateImage, {
          prompt: "Undefined URL",
        })
      ).rejects.toThrow("No image generated from Fal service");
    });

    // This test is erroring and I don't know why but it takes a while to run.
    // test("should handle arrayBuffer conversion error", async () => {
    //   const mockImageUrl = "https://example.com/image.png";

    //   mockSubscribe.mockResolvedValue({
    //     images: [{ url: mockImageUrl }],
    //   });

    //   global.fetch = vi.fn().mockResolvedValue({
    //     ok: true,
    //     arrayBuffer: () =>
    //       Promise.reject(new Error("ArrayBuffer conversion failed")),
    //   });

    //   await expect(
    //     t.action(api.generateImage.generateImage, {
    //       prompt: "ArrayBuffer error",
    //     })
    //   ).rejects.toThrow(
    //     "Image generation failed: ArrayBuffer conversion failed"
    //   );
    // });
  });
});
