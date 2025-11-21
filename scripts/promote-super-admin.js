/**
 * Script to promote a user to super admin role
 * Usage: node scripts/promote-super-admin.js <email>
 */

const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL environment variable not set");
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/promote-super-admin.js <email>");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function promoteUser() {
  try {
    console.log(`Promoting ${email} to super_admin...`);

    const result = await client.mutation("adminUsers:updateUserRoleByEmail", {
      email: email,
      newRole: "super_admin",
    });

    console.log("Success:", result.message);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

promoteUser();
