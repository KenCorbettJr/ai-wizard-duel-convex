"use node";

import type { z } from "genkit/beta";

function generateMockFromSchema<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const def = schema._def;

  switch (def.typeName) {
    case "ZodOptional":
    case "ZodNullable":
      return generateMockFromSchema(def.innerType);
    case "ZodString":
      return "mock-string";
    case "ZodNumber":
      return 123;
    case "ZodBoolean":
      return true;
    case "ZodEnum":
      return def.values[0];
    case "ZodArray":
      return [generateMockFromSchema(def.type)];
    case "ZodObject":
      const shape = def.shape();
      const obj: Record<string, unknown> = {};
      for (const key in shape) {
        obj[key] = generateMockFromSchema(shape[key]);
      }
      return obj;
    default:
      return null;
  }
}

/**
 * Mock services for emulator mode
 * Returns fake responses when ENV=emulate to avoid using real external services
 */

export function generateMockObject<T extends z.ZodTypeAny>(
  schema: T,
): ReturnType<typeof generateMockFromSchema> {
  return generateMockFromSchema(schema);
}

// Mock text generation response
export function generateMockText(prompt: string): string {
  const mockResponses = [
    "This is a mock AI response for testing purposes. The wizard casts a powerful spell!",
    "In the mystical realm of testing, the brave wizard ventures forth with mock magic.",
    "A simulated magical adventure unfolds as our hero demonstrates their abilities.",
    "The enchanted mock system responds with wisdom and wonder from the test realm.",
    "Behold! A generated response from the emulator's magical text generation service.",
  ];

  // Use prompt length to deterministically select a response for consistent testing
  const index = prompt.length % mockResponses.length;
  return mockResponses[index];
}

// Mock image generation - returns a simple colored image buffer
export async function generateMockImage(prompt: string): Promise<ArrayBuffer> {
  // Create a simple mock image buffer that varies based on the prompt
  // This simulates different images for different prompts
  return createMockImageBuffer(prompt);
}

function createMockImageBuffer(prompt: string): ArrayBuffer {
  // Create a simple PNG-like buffer for testing
  // This creates a deterministic "image" based on the prompt
  const hash = simpleHash(prompt);

  // Create a minimal PNG-like structure (simplified for testing)
  const width = 512;
  const height = 512;
  const bytesPerPixel = 4; // RGBA
  const imageSize = width * height * bytesPerPixel;

  const buffer = new ArrayBuffer(imageSize);
  const view = new Uint8Array(buffer);

  // Generate colors based on prompt hash
  const r = (hash & 0xff0000) >> 16;
  const g = (hash & 0x00ff00) >> 8;
  const b = hash & 0x0000ff;

  // Fill the buffer with the generated color
  for (let i = 0; i < imageSize; i += 4) {
    view[i] = r; // Red
    view[i + 1] = g; // Green
    view[i + 2] = b; // Blue
    view[i + 3] = 255; // Alpha (fully opaque)
  }

  return buffer;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Check if we're in emulator mode
export function isEmulatorMode(): boolean {
  return process.env.ENV === "emulate";
}

// Check if we're in test mode
export function isTestMode(): boolean {
  return process.env.NODE_ENV === "test";
}
