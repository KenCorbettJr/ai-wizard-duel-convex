# AI Text Generation Setup with Google Genkit

The duel introduction system now uses Google's Genkit with Gemini 2.5 Flash for AI-powered text generation.

## Setup Instructions

### 1. Install Dependencies
The required Genkit dependencies have been added to `package.json`:
```bash
npm install
```

### 2. Get Google AI API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Configure Environment Variables
Add your Google AI API key to `.env.local`:
```
GOOGLE_AI_API_KEY=your_actual_google_ai_api_key_here
```

Replace `your_google_ai_api_key_here` with your actual API key from Google AI Studio.

## How It Works

The system uses Google's Genkit framework with Gemini 2.5 Flash to:

1. **Generate Epic Introductions**: The Arcane Arbiter creates dramatic, personalized introductions for each duel
2. **Create Illustration Prompts**: AI generates detailed prompts for the low-poly arena illustrations
3. **Maintain Consistency**: Uses structured prompts to ensure consistent, high-quality output

## Features

- ✅ **AI-generated introductions** using Gemini 2.5 Flash
- ✅ **AI-generated illustrations** via FAL AI
- ✅ **Graceful fallback** to templates if AI fails
- ✅ **Structured JSON output** for reliable parsing
- ✅ **Epic narrative style** with dramatic flair

## Configuration Options

The AI text generation supports:
- **Temperature**: Controls creativity (default: 1.5 for dramatic flair)
- **Max Tokens**: Controls response length (default: 2000)
- **System Prompts**: Detailed instructions for consistent output

## Troubleshooting

If you see "AI text generation not configured" errors:
1. Verify your `GOOGLE_AI_API_KEY` is set in `.env.local`
2. Restart your development server
3. Check the console for detailed error messages

The system will automatically fall back to template-based introductions if AI generation fails, ensuring your duels always have epic introductions!