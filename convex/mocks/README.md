# Mock Services for Emulator Mode

This directory contains mock implementations of external services (Google Gemini AI and FAL AI) that are used when running in emulator mode (`ENV=emulate`).

## Purpose

When developing locally with the emulator, you don't want to:

- Make real API calls to external services
- Use up API quotas during development
- Depend on external service availability
- Expose real API keys in local development

## How It Works

The mock system automatically detects when `ENV=emulate` and returns fake responses instead of calling real services:

### Text Generation (Google Gemini)

- Returns predefined mock responses that vary based on prompt length
- Provides consistent, deterministic responses for testing
- No real API calls are made

### Image Generation (FAL AI)

- Returns a simple colored image buffer that varies based on the prompt
- Creates deterministic images for consistent testing
- No real API calls are made

## Usage

The mocks are automatically used when:

1. `ENV=emulate` is set in your environment
2. You run `npm run emulate` (which sets up the emulator environment)

### Environment Setup

In emulator mode (`.env.emulate` and `.env.local`):

```bash
ENV=emulate
# API keys are commented out - not needed in emulator mode
# FAL_KEY=disabled_in_emulator_mode
# GOOGLE_API_KEY=disabled_in_emulator_mode
```

### Console Output

When mocks are being used, you'll see console messages like:

- `🎭 Using mock AI text generation (emulator mode)`
- `🎭 Using mock image generation (emulator mode)`

## Testing

Run the mock service tests:

```bash
npm test convex/mocks/mockServices.test.ts
```

## Files

- `mockServices.ts` - Main mock implementation
- `mockServices.test.ts` - Tests for the mock services
- `README.md` - This documentation

## Integration

The mocks are integrated into:

- `convex/aiTextGeneration.ts` - Text generation service
- `convex/generateImage.ts` - Image generation service
- `convex/ai/getAI.ts` - AI client configuration

## Development

To add new mock responses or modify existing ones, edit the mock arrays in `mockServices.ts`. The system uses deterministic selection based on prompt characteristics to ensure consistent testing behavior.
