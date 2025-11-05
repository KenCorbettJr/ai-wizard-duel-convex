#!/usr/bin/env node

/**
 * Script to seed campaign opponents in development
 * Run with: node scripts/seed-campaign-opponents.js
 */

const { execSync } = require("child_process");

try {
  console.log("Seeding campaign opponents...");

  // Run the convex mutation to seed opponents
  const result = execSync(
    "npx convex run campaigns:seedCampaignOpponentsPublic",
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("Result:", result);
  console.log("✅ Campaign opponents seeded successfully!");
} catch (error) {
  console.error("❌ Failed to seed campaign opponents:", error.message);
  console.error(
    "Make sure your Convex development server is running (npm run dev)"
  );
  process.exit(1);
}
