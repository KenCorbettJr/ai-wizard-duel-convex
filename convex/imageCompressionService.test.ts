import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Mock Sharp since it requires WebAssembly in the test environment
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("mock-compress-image")),
  }));
  return { default: mockSharp };
});

describe("imageCompressionService", () => {
  let t: TestConvex<typeof schema>;

  beforeEach(() => {
    t = convexTest(schema, import.meta.glob("./**/*.*s"));
  });

  it("should compress an image with default parameters", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    const result = await t.action(api.imageCompressionService.compressImage, {
      imageBuffer: mockImageBuffer,
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("should compress an image with custom dimensions", async () => {
    const mockImageBuffer = new ArrayBuffer(100);

    const result = await t.action(api.imageCompressionService.compressImage, {
      imageBuffer: mockImageBuffer,
      quality: 90,
      format: "jpeg",
    });

    expect(result).toBeInstanceOf(ArrayBuffer);
  });
});
