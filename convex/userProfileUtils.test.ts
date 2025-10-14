import { describe, it, expect } from "vitest";
import {
  validateUserId,
  normalizeUserId,
  generateUserIdSuggestions,
} from "./userProfileUtils";

describe("validateUserId", () => {
  it("should accept valid user IDs", () => {
    const validIds = [
      "john",
      "user123",
      "test_user",
      "my-handle",
      "Player_1",
      "wizard-master",
      "abc123def",
      "a".repeat(20), // 20 characters (max length)
    ];

    validIds.forEach((id) => {
      const result = validateUserId(id);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it("should reject user IDs that are too short", () => {
    const result = validateUserId("ab");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("at least 3 characters");
    expect(result.suggestion).toBe("ab123");
  });

  it("should reject user IDs that are too long", () => {
    const longId = "a".repeat(21);
    const result = validateUserId(longId);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("no more than 20 characters");
    expect(result.suggestion).toBe("a".repeat(20));
  });

  it("should reject user IDs with invalid characters", () => {
    const invalidIds = [
      "user@domain",
      "test user", // space
      "user.name", // dot
      "user#123", // hash
      "user$name", // dollar sign
      "user%123", // percent
    ];

    invalidIds.forEach((id) => {
      const result = validateUserId(id);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(
        "letters, numbers, underscores, and hyphens",
      );
    });
  });

  it("should reject reserved words", () => {
    const reservedWords = [
      "admin",
      "api",
      "www",
      "user",
      "wizard",
      "duel",
      "ADMIN", // case insensitive
      "Api",
      "USER",
    ];

    reservedWords.forEach((word) => {
      const result = validateUserId(word);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("reserved");
      expect(result.suggestion).toBe(word + "_user");
    });
  });

  it("should provide helpful suggestions for invalid IDs", () => {
    // Too short
    expect(validateUserId("ab").suggestion).toBe("ab123");

    // Too long
    const longId = "verylongusernamethatexceedslimit";
    expect(validateUserId(longId).suggestion).toBe(longId.substring(0, 20));

    // Invalid characters
    expect(validateUserId("user@domain").suggestion).toBe("userdomain");
    expect(validateUserId("test user").suggestion).toBe("testuser");

    // Reserved word
    expect(validateUserId("admin").suggestion).toBe("admin_user");
  });
});

describe("normalizeUserId", () => {
  it("should convert user IDs to lowercase", () => {
    expect(normalizeUserId("JohnDoe")).toBe("johndoe");
    expect(normalizeUserId("TEST_USER")).toBe("test_user");
    expect(normalizeUserId("My-Handle")).toBe("my-handle");
    expect(normalizeUserId("already_lowercase")).toBe("already_lowercase");
  });
});

describe("generateUserIdSuggestions", () => {
  it("should generate numbered suggestions", () => {
    const suggestions = generateUserIdSuggestions("john", 3);
    expect(suggestions).toContain("john1");
    expect(suggestions).toContain("john2");
    expect(suggestions).toContain("john3");
  });

  it("should generate underscore variations", () => {
    const suggestions = generateUserIdSuggestions("user", 6);
    expect(suggestions).toContain("user_1");
    expect(suggestions).toContain("user_x");
  });

  it("should generate year suffix suggestions", () => {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    const suggestions = generateUserIdSuggestions("test", 6);
    expect(suggestions).toContain("test" + yearSuffix);
  });

  it("should respect length limits", () => {
    const longBase = "verylongusername"; // 16 chars
    const suggestions = generateUserIdSuggestions(longBase, 5);

    // Should include numbered suggestions that fit
    expect(suggestions).toContain(longBase + "1");
    expect(suggestions).toContain(longBase + "2");

    // Should not include suggestions that exceed 20 chars
    suggestions.forEach((suggestion) => {
      expect(suggestion.length).toBeLessThanOrEqual(20);
    });
  });

  it("should return the requested number of suggestions", () => {
    expect(generateUserIdSuggestions("user", 3)).toHaveLength(3);
    expect(generateUserIdSuggestions("test", 5)).toHaveLength(5);
    expect(generateUserIdSuggestions("handle", 1)).toHaveLength(1);
  });

  it("should handle edge cases gracefully", () => {
    // Very long base that can't accommodate most suffixes
    const veryLongBase = "a".repeat(19); // 19 chars
    const suggestions = generateUserIdSuggestions(veryLongBase, 3);

    // Should still return some suggestions, even if limited
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((suggestion) => {
      expect(suggestion.length).toBeLessThanOrEqual(20);
    });
  });
});
