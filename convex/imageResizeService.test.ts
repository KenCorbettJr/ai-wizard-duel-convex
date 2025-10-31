import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api } from "./_generated/api";

// Mock Sharp since it requires WebAssembly in the test environment
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-resized-image")),
  }));
  return { default: mockSharp };
});

describe("imageResizeService", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest();
  });

  it("should resize an image with default parameters", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    const result = await t.action(api.imageResizeService.resizeImage, {
      imageBuffer: mockImageBuffer,
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("should resize an image with custom dimensions", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    const result = await t.action(api.imageResizeService.resizeImage, {
      imageBuffer: mockImageBuffer,
      width: 256,
      height: 256,
      quality: 90,
      format: "jpeg",
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
  });

  it("should create multiple sizes of an image", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    const sizes = [
      { width: 128, height: 128, suffix: "thumbnail" },
      { width: 256, height: 256, suffix: "medium" },
      { width: 512, height: 512, suffix: "large" },
    ];

    const results = await t.action(
      api.imageResizeService.resizeImageWithMultipleSizes,
      {
        imageBuffer: mockImageBuffer,
        sizes,
        quality: 85,
        format: "png",
      }
    );

    expect(results).toHaveLength(3);
    expect(results[0].suffix).toBe("thumbnail");
    expect(results[0].width).toBe(128);
    expect(results[0].height).toBe(128);
    expect(results[0].imageBuffer).toBeInstanceOf(ArrayBuffer);
  });

  it("should handle different image formats", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    // Test PNG
    const pngResult = await t.action(api.imageResizeService.resizeImage, {
      imageBuffer: mockImageBuffer,
      format: "png",
    });
    expect(pngResult).toBeInstanceOf(ArrayBuffer);

    // Test JPEG
    const jpegResult = await t.action(api.imageResizeService.resizeImage, {
      imageBuffer: mockImageBuffer,
      format: "jpeg",
    });
    expect(jpegResult).toBeInstanceOf(ArrayBuffer);

    // Test WebP
    const webpResult = await t.action(api.imageResizeService.resizeImage, {
      imageBuffer: mockImageBuffer,
      format: "webp",
    });
    expect(webpResult).toBeInstanceOf(ArrayBuffer);
  });
});
