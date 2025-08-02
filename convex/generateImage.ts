import * as fal from "@fal-ai/serverless-client";

export async function generateImage(illustrationPrompt: string, falKey: string): Promise<ArrayBuffer> {
  // Configure fal client with API key
  fal.config({
    credentials: falKey,
  });

  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: illustrationPrompt,
        image_size: "square_hd", // 1024x1024
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    // Get the image URL from the result
    const imageUrl = result.data.images[0]?.url;
    if (!imageUrl) {
      throw new Error("No image generated from Fal service");
    }

    // Fetch the image data
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error generating image with Fal:", error);
    throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}