#!/usr/bin/env node
/**
 * Migration script to auto-approve existing users for the waitlist
 *
 * This script updates all existing Clerk users to set waitlistApproved: true
 * in their public metadata, preserving any existing role metadata.
 *
 * Usage: node scripts/migrate-waitlist-users.js
 *
 * Requirements:
 * - CLERK_SECRET_KEY environment variable must be set
 * - @clerk/backend package must be installed
 */

import { Clerk } from "@clerk/backend";

// Validate environment variables
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("❌ Error: CLERK_SECRET_KEY environment variable not set");
  console.error("Please set CLERK_SECRET_KEY in your .env.local file");
  process.exit(1);
}

// Initialize Clerk client
const clerk = new Clerk({ secretKey: CLERK_SECRET_KEY });

/**
 * Migrate a single user to auto-approve them for waitlist
 */
async function migrateUser(user) {
  try {
    const currentMetadata = user.publicMetadata || {};

    // Preserve existing role metadata
    const updatedMetadata = {
      ...currentMetadata,
      waitlistApproved: true,
      waitlistApprovedAt: Date.now(),
    };

    // Update user metadata
    await clerk.users.updateUser(user.id, {
      publicMetadata: updatedMetadata,
    });

    console.log(
      `✅ Migrated user: ${user.emailAddresses[0]?.emailAddress || user.id}`
    );
    console.log(`   - Role: ${currentMetadata.role || "user"}`);
    console.log(`   - Waitlist approved: true`);

    return { success: true, userId: user.id };
  } catch (error) {
    console.error(`❌ Failed to migrate user ${user.id}:`, error.message);
    return { success: false, userId: user.id, error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateAllUsers() {
  console.log("🚀 Starting waitlist migration for existing users...\n");

  let totalUsers = 0;
  let successCount = 0;
  let failureCount = 0;
  const failures = [];

  try {
    // Fetch all users with pagination
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      console.log(`📥 Fetching users (offset: ${offset})...`);

      const response = await clerk.users.getUserList({
        limit,
        offset,
      });

      const users = response.data;
      totalUsers += users.length;

      console.log(`   Found ${users.length} users in this batch\n`);

      // Process each user
      for (const user of users) {
        const result = await migrateUser(user);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          failures.push(result);
        }
      }

      // Check if there are more users to fetch
      hasMore = users.length === limit;
      offset += limit;

      // Add a small delay to avoid rate limiting
      if (hasMore) {
        console.log("\n⏳ Waiting before next batch...\n");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary");
    console.log("=".repeat(60));
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (failures.length > 0) {
      console.log("\n❌ Failed migrations:");
      failures.forEach((failure) => {
        console.log(`   - User ${failure.userId}: ${failure.error}`);
      });
    }

    console.log("\n✨ Migration complete!");
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateAllUsers();
