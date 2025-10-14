import { v } from "convex/values";

/**
 * User ID validation rules:
 * - Length: 3-20 characters
 * - Characters: Alphanumeric (a-z, A-Z, 0-9), underscore (_), hyphen (-)
 * - Case: Case-insensitive for uniqueness, case-preserving for display
 * - Reserved: Block common reserved words
 * - Immutable: Cannot be changed after initial creation
 */

// Reserved words that cannot be used as user IDs
const RESERVED_WORDS = [
  "admin",
  "api",
  "www",
  "app",
  "mail",
  "ftp",
  "localhost",
  "root",
  "support",
  "help",
  "about",
  "contact",
  "terms",
  "privacy",
  "legal",
  "blog",
  "news",
  "docs",
  "documentation",
  "guide",
  "tutorial",
  "login",
  "signin",
  "signup",
  "register",
  "auth",
  "oauth",
  "profile",
  "account",
  "settings",
  "dashboard",
  "home",
  "user",
  "users",
  "wizard",
  "wizards",
  "duel",
  "duels",
  "game",
  "play",
  "match",
  "battle",
  "fight",
  "magic",
  "null",
  "undefined",
  "true",
  "false",
  "test",
  "demo",
  "system",
  "config",
  "setup",
  "install",
  "update",
  "delete",
];

export interface UserIdValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validates a user ID according to the format rules
 */
export function validateUserId(userId: string): UserIdValidationResult {
  // Check length
  if (userId.length < 3) {
    return {
      isValid: false,
      error: "User ID must be at least 3 characters long",
      suggestion: userId + "123",
    };
  }

  if (userId.length > 20) {
    return {
      isValid: false,
      error: "User ID must be no more than 20 characters long",
      suggestion: userId.substring(0, 20),
    };
  }

  // Check allowed characters (alphanumeric, underscore, hyphen)
  const allowedPattern = /^[a-zA-Z0-9_-]+$/;
  if (!allowedPattern.test(userId)) {
    return {
      isValid: false,
      error:
        "User ID can only contain letters, numbers, underscores, and hyphens",
      suggestion: userId.replace(/[^a-zA-Z0-9_-]/g, ""),
    };
  }

  // Check reserved words (case-insensitive)
  if (RESERVED_WORDS.includes(userId.toLowerCase())) {
    return {
      isValid: false,
      error: "This user ID is reserved and cannot be used",
      suggestion: userId + "_user",
    };
  }

  return { isValid: true };
}

/**
 * Normalizes a user ID for case-insensitive comparison
 */
export function normalizeUserId(userId: string): string {
  return userId.toLowerCase();
}

/**
 * Generates suggestions for alternative user IDs when the desired one is taken
 */
export function generateUserIdSuggestions(
  baseUserId: string,
  count: number = 3,
): string[] {
  const suggestions: string[] = [];
  const normalizedBase = baseUserId.toLowerCase();

  // Add a few numbered suggestions first
  for (let i = 1; i <= 3; i++) {
    const suggestion = normalizedBase + i;
    if (suggestion.length <= 20) {
      suggestions.push(suggestion);
    }
  }

  // Add underscore variations
  if (normalizedBase.length <= 18) {
    suggestions.push(normalizedBase + "_1");
    suggestions.push(normalizedBase + "_x");
  }

  // Add year variations
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);
  if ((normalizedBase + yearSuffix).length <= 20) {
    suggestions.push(normalizedBase + yearSuffix);
  }

  // Add more numbered suggestions if needed
  for (let i = 4; i <= count + 5; i++) {
    const suggestion = normalizedBase + i;
    if (suggestion.length <= 20 && suggestions.length < count + 5) {
      suggestions.push(suggestion);
    }
  }

  // Return the requested number of unique suggestions
  return [...new Set(suggestions)].slice(0, count);
}

/**
 * Validator for user ID arguments in Convex functions
 */
export const userIdValidator = v.string();

/**
 * Validator for display name arguments in Convex functions
 */
export const displayNameValidator = v.optional(v.string());
