"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import sharp from "sharp";

export const compressImage = action({
  args: {
    imageBuffer: v.bytes(),
    quality: v.optional(v.number()),
    format: v.optional(
      v.union(v.literal("png"), v.literal("jpeg"), v.literal("webp"))
    ),
  },
  returns: v.bytes(),
  handler: async (_ctx, { imageBuffer, quality = 80, format = "webp" }) => {
    try {
      console.log(`Compressing image to ${quality}`);

      // Validate input buffer
      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error("Invalid or empty image buffer provided");
      }

      // Create Sharp instance from the input buffer
      let sharpInstance = sharp(Buffer.from(imageBuffer));

      // Set output format and quality
      switch (format) {
        case "jpeg":
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case "webp":
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case "png":
        default:
          sharpInstance = sharpInstance.png({
            quality,
            compressionLevel: 6, // Good balance of size vs speed
          });
          break;
      }

      return (await sharpInstance.toBuffer()).buffer as ArrayBuffer;
    } catch (error) {
      console.error("Image compression failed:", error);
      throw new Error(
        `Image compression failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
