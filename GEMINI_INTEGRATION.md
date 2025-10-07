# Gemini Flash Image Integration for Duel Illustrations

This document explains how to integrate Gemini 2.5 Flash Image Preview for generating progressive duel illustrations in the AI Wizard Duel application.

## Overview

The application now supports two image generation methods:

1. **FAL AI (Default)**: Generates standalone images for each round
2. **Gemini Flash Image (Optional)**: Generates progressive images that build upon previous rounds

## How It Works

### FAL AI Approach (Current)

- Each round generates a completely new image based on the text prompt
- No visual continuity between rounds
- Reliable and fast generation

### Gemini Flash Image Approach (New)

- **Introduction Round (Round 0)**: Uses **both** wizard illustrations as input images and combines them into a single arena scene
- **All Subsequent Rounds**: Takes the previous round's image and modifies it based on the new round's narrative, enhanced with wizard descriptions for character consistency
- Creates visual continuity throughout the duel
- Shows the progression of the magical battle
- Maintains wizard identities and characteristics across rounds

## Setup Instructions

### 1. Configure Environment Variables

The integration uses your existing Google AI API key. Add this variable to your `.env.local` file:

```bash
# Gemini Image Generation Configuration (uses GOOGLE_API_KEY)
USE_GEMINI_FOR_IMAGES=true
```

Your existing `GOOGLE_API_KEY` will be used for both text and image generation.

### 2. API Configuration

The integration uses the Genkit framework with Google AI, specifically the `gemini-2.5-flash-image-preview` model. No additional API setup is required beyond your existing Google AI configuration.

## Usage

### Enabling Gemini Generation

Set the environment variable:

```bash
USE_GEMINI_FOR_IMAGES=true
```

### Disabling Gemini Generation (Fallback to FAL)

Set the environment variable:

```bash
USE_GEMINI_FOR_IMAGES=false
```

## Technical Implementation

### Key Files Modified

1. **`convex/generateImageWithGemini.ts`**: Updated to use Gemini Flash Image AI instead of Banana API
2. **`convex/generateRoundIllustration.ts`**: Enhanced to support progressive image generation
3. **`convex/processDuelRound.ts`**: Updated to pass Gemini flag to illustration generation
4. **`convex/duels.ts`**: Updated scheduling functions to support Gemini parameter
5. **`convex/duelIntroduction.ts`**: Updated to support Gemini for introduction images

### Image Generation Flow

#### For Introduction Round (Round 0):

1. Get both wizard illustrations from the database
2. Pass **all available wizard illustrations** as input images to Gemini
3. Use multi-image composition to generate arena scene with both wizards
4. Gemini combines both wizard images into a single cohesive dueling scene
5. Store the result for use in subsequent rounds

#### For All Subsequent Rounds (Round 1+):

1. Retrieve the previous round's illustration as the base image
2. Get wizard descriptions (names and characteristics) for context
3. Enhance the prompt with wizard information to maintain character consistency
4. Use image-to-image generation to show the progression while preserving wizard identities

### Fallback Behavior

- If Gemini generation fails, the system automatically falls back to FAL
- If no previous image is available, Gemini generates a new image from scratch
- If wizard illustrations aren't available, the system uses text-only prompts

## Customization Options

### Wizard Context Enhancement

For subsequent rounds, the system automatically enhances prompts with wizard descriptions:

```typescript
// Base prompt enhancement
let enhancedPrompt = `${prompt}. Continue the scene from the reference image, showing the progression of the magical duel. Maintain the arena setting and wizard positions while showing the new magical effects.`;

// Add wizard context for character consistency
if (wizardDescriptions && wizardDescriptions.length > 0) {
  const wizardContext = wizardDescriptions
    .map((w) => `${w.name}: ${w.description}`)
    .join(". ");
  enhancedPrompt += ` The wizards in this scene are: ${wizardContext}. Make sure to maintain their visual characteristics and identities from the previous image.`;
}
```

This ensures that:

- Wizard names and characteristics are preserved across rounds
- Visual consistency is maintained throughout the duel
- The AI understands which wizard performed which actions

## Troubleshooting

### Common Issues

1. **API Key Not Set**: Ensure `GOOGLE_API_KEY` is properly configured
2. **Model Access**: Verify you have access to the `gemini-2.5-flash-image-preview` model
3. **Image Storage Issues**: Check Convex file storage permissions and limits

### Debugging

Enable detailed logging by checking the console output. The system logs:

- When Gemini generation is attempted
- When fallback to FAL occurs
- Image retrieval and storage operations
- API response handling

### Testing

The system includes test-compatible mock responses and handles emulator mode gracefully. All existing tests should continue to pass regardless of the image generation method used.

## Future Enhancements

Potential improvements to consider:

1. **Quality Settings**: Expose more generation parameters to users
2. **Batch Processing**: Generate multiple variations and let users choose
3. **Style Consistency**: Maintain consistent art style across all rounds
4. **Performance Optimization**: Cache and reuse base images when appropriate

## Cost Considerations

- Gemini Flash Image may have different pricing than FAL
- Image-to-image generation might be more expensive than text-to-image
- Consider implementing usage limits or user quotas if needed
- Monitor API usage and costs through your Google Cloud Console

## Security Notes

- API keys should never be exposed to the client
- All image generation happens server-side in Convex actions
- Generated images are stored securely in Convex file storage
- Consider implementing rate limiting for image generation requests
