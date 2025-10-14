import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
  "info",
  "contact",
  "about",
  "terms",
  "privacy",
  "legal",
  "blog",
  "news",
  "docs",
  "documentation",
  "status",
  "health",
  "ping",
  "test",
  "staging",
  "dev",
  "development",
  "prod",
  "production",
  "beta",
  "alpha",
  "demo",
  "example",
  "sample",
  "null",
  "undefined",
  "true",
  "false",
  "system",
  "user",
  "users",
  "profile",
  "profiles",
  "account",
  "accounts",
  "settings",
  "config",
  "configuration",
  "dashboard",
  "home",
  "index",
  "login",
  "logout",
  "signin",
  "signout",
  "signup",
  "register",
  "auth",
  "authentication",
  "authorization",
  "oauth",
  "sso",
  "security",
  "password",
  "reset",
  "forgot",
  "recovery",
  "verify",
  "verification",
  "confirm",
  "confirmation",
  "activate",
  "activation",
  "deactivate",
  "deactivation",
  "delete",
  "deletion",
  "remove",
  "removal",
  "ban",
  "banned",
  "suspend",
  "suspended",
  "block",
  "blocked",
  "report",
  "reports",
  "abuse",
  "spam",
  "moderator",
  "mod",
  "mods",
  "administrator",
  "administrators",
  "owner",
  "owners",
  "staff",
  "team",
  "official",
  "verified",
  "premium",
  "pro",
  "plus",
  "enterprise",
  "business",
  "corporate",
  "company",
  "organization",
  "org",
  "group",
  "groups",
  "community",
  "communities",
  "forum",
  "forums",
  "chat",
  "message",
  "messages",
  "notification",
  "notifications",
  "alert",
  "alerts",
  "email",
  "emails",
  "sms",
  "phone",
  "mobile",
  "desktop",
  "web",
  "website",
  "site",
  "domain",
  "subdomain",
  "cdn",
  "static",
  "assets",
  "media",
  "images",
  "videos",
  "files",
  "uploads",
  "downloads",
  "backup",
  "backups",
  "archive",
  "archives",
  "log",
  "logs",
  "analytics",
  "stats",
  "statistics",
  "metrics",
  "monitoring",
  "health",
  "status",
  "uptime",
  "downtime",
  "maintenance",
  "update",
  "updates",
  "upgrade",
  "upgrades",
  "migration",
  "migrations",
  "import",
  "imports",
  "export",
  "exports",
  "sync",
  "synchronization",
  "webhook",
  "webhooks",
  "callback",
  "callbacks",
  "redirect",
  "redirects",
  "proxy",
  "proxies",
  "cache",
  "caching",
  "session",
  "sessions",
  "cookie",
  "cookies",
  "token",
  "tokens",
  "key",
  "keys",
  "secret",
  "secrets",
  "public",
  "private",
  "internal",
  "external",
  "guest",
  "anonymous",
  "wizard",
  "wizards",
  "duel",
  "duels",
  "game",
  "games",
  "play",
  "player",
  "players",
  "match",
  "matches",
  "tournament",
  "tournaments",
  "leaderboard",
  "leaderboards",
  "ranking",
  "rankings",
  "score",
  "scores",
  "point",
  "points",
  "level",
  "levels",
  "achievement",
  "achievements",
  "badge",
  "badges",
  "reward",
  "rewards",
  "credit",
  "credits",
  "coin",
  "coins",
  "gem",
  "gems",
  "gold",
  "silver",
  "bronze",
  "diamond",
  "platinum",
  "legendary",
  "epic",
  "rare",
  "common",
  "item",
  "items",
  "inventory",
  "shop",
  "store",
  "purchase",
  "purchases",
  "payment",
  "payments",
  "billing",
  "invoice",
  "invoices",
  "subscription",
  "subscriptions",
  "plan",
  "plans",
  "tier",
  "tiers",
  "free",
  "trial",
  "refund",
  "refunds",
  "cancel",
  "cancellation",
];

// Validate user ID format
function validateUserIdFormat(userId: string): {
  valid: boolean;
  error?: string;
} {
  // Check length
  if (userId.length < 3) {
    return {
      valid: false,
      error: "User ID must be at least 3 characters long",
    };
  }
  if (userId.length > 20) {
    return {
      valid: false,
      error: "User ID must be no more than 20 characters long",
    };
  }

  // Check allowed characters (alphanumeric, underscore, hyphen)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(userId)) {
    return {
      valid: false,
      error:
        "User ID can only contain letters, numbers, underscores, and hyphens",
    };
  }

  // Check for reserved words (case-insensitive)
  if (RESERVED_WORDS.includes(userId.toLowerCase())) {
    return {
      valid: false,
      error: "This user ID is reserved and cannot be used",
    };
  }

  return { valid: true };
}

// Generate suggestions for taken user IDs
function generateSuggestions(userId: string): string[] {
  const suggestions: string[] = [];
  const baseId = userId.toLowerCase();

  // Add numbers to the end
  for (let i = 1; i <= 3; i++) {
    suggestions.push(`${baseId}${i}`);
  }

  // Add random numbers
  const randomNum = Math.floor(Math.random() * 999) + 1;
  suggestions.push(`${baseId}${randomNum}`);

  // Add underscore variations
  suggestions.push(`${baseId}_1`);
  suggestions.push(`${baseId}_${new Date().getFullYear()}`);

  return suggestions.slice(0, 3); // Return only first 3 suggestions
}

/**
 * Check if a user ID is available and valid
 */
export const checkUserIdAvailability = query({
  args: { userId: v.string() },
  returns: v.object({
    available: v.boolean(),
    valid: v.boolean(),
    error: v.optional(v.string()),
    suggestions: v.optional(v.array(v.string())),
  }),
  handler: async (ctx, { userId }) => {
    // First validate format
    const formatValidation = validateUserIdFormat(userId);
    if (!formatValidation.valid) {
      return {
        available: false,
        valid: false,
        error: formatValidation.error,
      };
    }

    // Check if userId is already taken (case-insensitive)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.toLowerCase()))
      .first();

    if (existingUser) {
      const suggestions = generateSuggestions(userId);
      return {
        available: false,
        valid: true,
        error: "This user ID is already taken",
        suggestions,
      };
    }

    return {
      available: true,
      valid: true,
    };
  },
});

/**
 * Set user ID and display name for authenticated user (one-time only)
 */
export const setUserId = mutation({
  args: {
    userId: v.string(),
    displayName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { userId, displayName }) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Find the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { success: false, error: "User record not found" };
    }

    // Check if user already has a userId (immutable after creation)
    if (user.userId) {
      return {
        success: false,
        error: "User ID has already been set and cannot be changed",
      };
    }

    // Validate format
    const formatValidation = validateUserIdFormat(userId);
    if (!formatValidation.valid) {
      return { success: false, error: formatValidation.error };
    }

    // Check availability (case-insensitive)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.toLowerCase()))
      .first();

    if (existingUser) {
      return { success: false, error: "This user ID is already taken" };
    }

    // Set the userId (store in lowercase for consistency) and other profile fields
    await ctx.db.patch(user._id, {
      userId: userId.toLowerCase(), // Store in lowercase for case-insensitive uniqueness
      displayName: displayName || user.name, // Use provided displayName or fall back to existing name
      profileCreatedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
/**
 * Check if current authenticated user has completed profile setup
 */
export const getCurrentUserProfileStatus = query({
  args: {},
  returns: v.object({
    hasProfile: v.boolean(),
    userId: v.optional(v.string()),
    displayName: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasProfile: false };
    }

    // Find the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { hasProfile: false };
    }

    // Check if user has completed profile setup (has userId)
    const hasProfile = !!user.userId;

    return {
      hasProfile,
      userId: user.userId,
      displayName: user.displayName,
    };
  },
});

/**
 * Get public user profile by userId
 */
export const getUserProfile = query({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.string(),
      displayName: v.optional(v.string()),
      joinDate: v.number(),
      totalWizards: v.number(),
      totalDuels: v.number(),
      wins: v.number(),
      losses: v.number(),
      winRate: v.number(),
    })
  ),
  handler: async (ctx, { userId }) => {
    // Find user by userId (case-insensitive)
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.toLowerCase()))
      .first();

    if (!user || !user.userId) {
      return null; // User not found or hasn't completed profile setup
    }

    // Get user's wizards count
    const wizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", user.clerkId))
      .collect();

    const totalWizards = wizards.length;

    // Calculate wizard wins and losses
    let totalWins = 0;
    let totalLosses = 0;

    wizards.forEach((wizard) => {
      totalWins += wizard.wins || 0;
      totalLosses += wizard.losses || 0;
    });

    // Get duels where user participated (filter by array contains)
    const duels = await ctx.db
      .query("duels")
      .collect()
      .then((allDuels) =>
        allDuels.filter((duel) => duel.players.includes(user.clerkId))
      );

    const totalDuels = duels.length;

    // Calculate win rate
    const totalGames = totalWins + totalLosses;
    const winRate =
      totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    return {
      userId: user.userId,
      displayName: user.displayName,
      joinDate: user.createdAt,
      totalWizards,
      totalDuels,
      wins: totalWins,
      losses: totalLosses,
      winRate,
    };
  },
});
/**
 * Get all wizards owned by a specific userId (public information only)
 */
export const getUserWizards = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("wizards"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      illustrationURL: v.optional(v.string()),
      illustration: v.optional(v.string()),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
      winRate: v.number(),
    })
  ),
  handler: async (ctx, { userId }) => {
    // Find user by userId (case-insensitive)
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId.toLowerCase()))
      .first();

    if (!user || !user.userId) {
      return []; // User not found or hasn't completed profile setup
    }

    // Get all wizards owned by this user
    const wizards = await ctx.db
      .query("wizards")
      .withIndex("by_owner", (q) => q.eq("owner", user.clerkId))
      .collect();

    // Transform wizards to include calculated win rate and only public information
    return wizards.map((wizard) => {
      const wins = wizard.wins || 0;
      const losses = wizard.losses || 0;
      const totalGames = wins + losses;
      const winRate =
        totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

      return {
        _id: wizard._id,
        _creationTime: wizard._creationTime,
        name: wizard.name,
        description: wizard.description,
        illustrationURL: wizard.illustrationURL,
        illustration: wizard.illustration,
        wins,
        losses,
        winRate,
      };
    });
  },
});

/**
 * Update user profile (display name and other editable fields)
 * Note: userId is immutable and cannot be changed after creation
 */
export const updateUserProfile = mutation({
  args: {
    displayName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { displayName }) => {
    // Get current user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Find the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { success: false, error: "User record not found" };
    }

    // Check if user has completed profile setup
    if (!user.userId) {
      return {
        success: false,
        error: "Profile setup must be completed before editing",
      };
    }

    // Validate display name (basic validation)
    if (!displayName || displayName.trim().length === 0) {
      return { success: false, error: "Display name cannot be empty" };
    }

    if (displayName.trim().length > 50) {
      return {
        success: false,
        error: "Display name must be 50 characters or less",
      };
    }

    // Update the user profile
    await ctx.db.patch(user._id, {
      displayName: displayName.trim(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
