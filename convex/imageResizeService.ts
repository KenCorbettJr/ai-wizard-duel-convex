"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import sharp from "sharp";

export const resizeImage = action({
  args: {
    imageBuffer: v.bytes(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    quality: v.optional(v.number()),
    format: v.optional(
      v.union(v.literal("png"), v.literal("jpeg"), v.literal("webp"))
    ),
  },
  returns: v.bytes(),
  handler: async (
    _ctx,
    { imageBuffer, width = 512, height = 512, quality = 80, format = "png" }
  ) => {
    try {
      console.log(
        `Resizing image to ${width}x${height} with quality ${quality} as ${format}`
      );

      // Validate input buffer
      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error("Invalid or empty image buffer provided");
      }

      // Create Sharp instance from the input buffer
      let sharpInstance = sharp(Buffer.from(imageBuffer));

      // Resize the image
      sharpInstance = sharpInstance.resize(width, height, {
        fit: "cover", // Crop to fit exact dimensions
        position: "center",
      });

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

      // Convert to buffer and return as ArrayBuffer
      const resizedBuffer = await sharpInstance.toBuffer();
      return resizedBuffer.buffer;
    } catch (error) {
      console.error("Image resize failed:", error);
      throw new Error(
        `Image resize failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

export const resizeImageWithMultipleSizes = action({
  args: {
    imageBuffer: v.bytes(),
    sizes: v.array(
      v.object({
        width: v.number(),
        height: v.number(),
        suffix: v.string(), // e.g., "thumbnail", "medium", "large"
      })
    ),
    quality: v.optional(v.number()),
    format: v.optional(
      v.union(v.literal("png"), v.literal("jpeg"), v.literal("webp"))
    ),
  },
  returns: v.array(
    v.object({
      suffix: v.string(),
      imageBuffer: v.bytes(),
      width: v.number(),
      height: v.number(),
    })
  ),
  handler: async (
    _ctx,
    { imageBuffer, sizes, quality = 80, format = "png" }
  ) => {
    try {
      console.log(`Resizing image to ${sizes.length} different sizes`);

      const results = [];

      for (const size of sizes) {
        console.log(
          `Creating ${size.suffix} version: ${size.width}x${size.height}`
        );

        // Create Sharp instance from the input buffer
        let sharpInstance = sharp(Buffer.from(imageBuffer));

        // Resize the image
        sharpInstance = sharpInstance.resize(size.width, size.height, {
          fit: "cover",
          position: "center",
        });

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
              compressionLevel: 6,
            });
            break;
        }

        // Convert to buffer
        const resizedBuffer = await sharpInstance.toBuffer();

        results.push({
          suffix: size.suffix,
          imageBuffer: resizedBuffer.buffer,
          width: size.width,
          height: size.height,
        });
      }

      return results;
    } catch (error) {
      console.error("Multi-size image resize failed:", error);
      throw new Error(
        `Multi-size image resize failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
