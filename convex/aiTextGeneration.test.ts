import { expect, test, describe, vi, beforeEach, afterEach } from "vitest";

// Mock the AI module before importing the function
const mockGenerate = vi.fn();
vi.mock("./ai/getAI", () => ({
  getGemni20FlashAI: vi.fn(() => ({
    generate: mockGenerate,
  })),
}));

// Import after mocking
import { generateText } from "./aiTextGeneration";

describe("AI Text Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "development"; // take ourselves out of test mode so we can test the interactions with the AI module
  });

  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  test("should generate text with basic prompt", async () => {
    const mockResponse = { text: "Generated wizard story" };
    mockGenerate.mockResolvedValue(mockResponse);

    const result = await generateText("Tell me about a wizard");

    expect(mockGenerate).toHaveBeenCalledWith({
      prompt: "Tell me about a wizard",
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    expect(result).toBe("Generated wizard story");
  });

  test("should combine system prompt with user prompt", async () => {
    const mockResponse = { text: "Epic duel story" };
    mockGenerate.mockResolvedValue(mockResponse);

    const systemPrompt = "You are a fantasy storyteller";
    const userPrompt = "Describe a wizard duel";

    const result = await generateText(userPrompt, systemPrompt);

    expect(mockGenerate).toHaveBeenCalledWith({
      prompt: "You are a fantasy storyteller\n\nDescribe a wizard duel",
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });
    expect(result).toBe("Epic duel story");
  });

  test("should use custom configuration", async () => {
    const mockResponse = { text: "Custom config story" };
    mockGenerate.mockResolvedValue(mockResponse);

    const config = {
      temperature: 0.9,
      maxTokens: 1000,
    };

    const result = await generateText("Tell a story", undefined, config);

    expect(mockGenerate).toHaveBeenCalledWith({
      prompt: "Tell a story",
      config: {
        temperature: 0.9,
        maxOutputTokens: 1000,
      },
    });
    expect(result).toBe("Custom config story");
  });

  test("should handle AI generation errors", async () => {
    const mockError = new Error("API rate limit exceeded");
    mockGenerate.mockRejectedValue(mockError);

    await expect(async () => {
      await generateText("Tell me a story");
    }).rejects.toThrowError(
      "AI text generation failed: API rate limit exceeded"
    );
  });

  test("should handle unknown errors", async () => {
    mockGenerate.mockRejectedValue("Unknown error");

    await expect(async () => {
      await generateText("Tell me a story");
    }).rejects.toThrowError("AI text generation failed: Unknown error");
  });
});
