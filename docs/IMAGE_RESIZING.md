# Image Resizing with Sharp

This document explains how the AI Wizard Duel application uses Sharp (WebAssembly) to resize AI-generated images for better performance and storage efficiency.

## Overview

The application now automatically resizes AI-generated images to reduce file sizes and improve loading times. This is implemented using Sharp with WebAssembly support, which works in Node.js environments without requiring native dependencies.

## Features

- **Automatic Resizing**: All AI-generated images are automatically resized to optimal dimensions
- **Multiple Formats**: Supports PNG, JPEG, and WebP output formats
- **Quality Control**: Configurable quality settings for different use cases
- **Graceful Fallback**: If resizing fails, the original image is used
- **Test-Safe**: Resizing is automatically skipped during tests to avoid mock image issues

## Configuration

Image sizes and quality settings are configured in `convex/imageConfig.ts`:

```typescript
export const IMAGE_SIZES = {
  WIZARD_ILLUSTRATION: {
    width: 512,
    height: 512,
    quality: 85,
    format: "png" as const,
  },
  DUEL_ROUND: {
    width: 768,
    height: 768,
    quality: 80,
    format: "png" as const,
  },
  // ... more configurations
};
```

## Usage

### Basic Image Resizing

```typescript
import { api } from "./_generated/api";

// Resize a single image
const resizedBuffer = await ctx.runAction(api.imageResizeService.resizeImage, {
  imageBuffer: originalImageBuffer,
  width: 512,
  height: 512,
  quality: 85,
  format: "png",
});
```

### Multiple Size Generation

```typescript
// Generate multiple sizes from one image
const sizes = [
  { width: 256, height: 256, suffix: "thumbnail" },
  { width: 512, height: 512, suffix: "medium" },
  { width: 1024, height: 1024, suffix: "large" },
];

const results = await ctx.runAction(
  api.imageResizeService.resizeImageWithMultipleSizes,
  {
    imageBuffer: originalImageBuffer,
    sizes,
    quality: 85,
    format: "png",
  }
);
```

## Integration Points

### Wizard Illustrations

Wizard illustrations are automatically resized to 512x512 pixels with 85% quality:

- Generated in `convex/generateWizardIllustration.ts`
- Uses configuration from `IMAGE_SIZES.WIZARD_ILLUSTRATION`
- Fallback to original image if resize fails

### Duel Round Illustrations

Duel round illustrations are resized to 768x768 pixels with 80% quality:

- Generated in `convex/generateRoundIllustration.ts`
- Uses configuration from `IMAGE_SIZES.DUEL_ROUND`
- Fallback to original image if resize fails

### FAL AI Integration

The main image generation service (`convex/generateImage.ts`) includes optional resizing:

- Resizing can be skipped with `skipResize: true` parameter
- Automatically skipped during tests
- Graceful fallback to original image

## Performance Benefits

- **Reduced Storage**: Images are typically 60-80% smaller after resizing
- **Faster Loading**: Smaller images load faster in the UI
- **Bandwidth Savings**: Less data transfer for users
- **Consistent Sizing**: All images have predictable dimensions

## Error Handling

The resizing system includes robust error handling:

1. **Invalid Input**: Validates image buffer before processing
2. **Format Errors**: Falls back to original image if Sharp can't process the format
3. **Memory Issues**: Handles large images gracefully
4. **Test Environment**: Automatically skips resizing during tests

## Testing

The image resizing service includes comprehensive tests:

```bash
npm test -- imageResizeService.test.ts
```

Tests cover:

- Basic resizing functionality
- Multiple format support (PNG, JPEG, WebP)
- Multi-size generation
- Error handling scenarios

## Installation

Sharp with WebAssembly support is installed via:

```bash
npm install --cpu=wasm32 sharp
```

This ensures compatibility with serverless environments and avoids native dependency issues.

## Configuration Options

### Resize Modes

- `fit: 'cover'` - Crop to exact dimensions (default)
- `fit: 'contain'` - Fit within dimensions, may add padding
- `fit: 'fill'` - Stretch to exact dimensions

### Quality Settings

- **PNG**: 0-100, affects compression level
- **JPEG**: 0-100, standard quality setting
- **WebP**: 0-100, modern format with better compression

### Format Selection

Choose format based on use case:

- **PNG**: Best for illustrations with transparency
- **JPEG**: Good for photos, smaller file sizes
- **WebP**: Modern format, best compression, not universally supported

## Monitoring

The system logs resize operations for monitoring:

```
Resizing image to 512x512 with quality 85 as png
```

Failed resize attempts are logged as warnings:

```
Image resize failed, returning original image: [error details]
```
