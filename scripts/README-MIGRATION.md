# Waitlist Migration Script

This directory contains a migration script to auto-approve existing users for the Clerk waitlist feature.

## Overview

The `migrate-waitlist-users.js` script updates all existing Clerk users to set `waitlistApproved: true` in their public metadata. This ensures that existing users maintain access to the application when the waitlist feature is enabled.

## Prerequisites

1. **Environment Variables**: Ensure `CLERK_SECRET_KEY` is set in your `.env.local` file
2. **Dependencies**: Install the required package:
   ```bash
   npm install
   ```

## Usage

### Running the Migration

```bash
node scripts/migrate-waitlist-users.js
```

### What the Script Does

1. **Fetches all users** from Clerk using pagination (100 users per batch)
2. **Preserves existing metadata** including role information (user, admin, super_admin)
3. **Updates each user** with:
   - `waitlistApproved: true`
   - `waitlistApprovedAt: <timestamp>`
4. **Logs progress** for each user migrated
5. **Provides a summary** of successful and failed migrations

### Example Output

```
🚀 Starting waitlist migration for existing users...

📥 Fetching users (offset: 0)...
   Found 15 users in this batch

✅ Migrated user: user@example.com
   - Role: user
   - Waitlist approved: true
✅ Migrated user: admin@example.com
   - Role: admin
   - Waitlist approved: true

============================================================
📊 Migration Summary
============================================================
Total users processed: 15
✅ Successfully migrated: 15
❌ Failed: 0

✨ Migration complete!
```

## Important Notes

### Metadata Preservation

The script preserves all existing public metadata fields, including:

- `role` (user, admin, super_admin)
- Any custom fields you've added

### Idempotency

The script is safe to run multiple times. If a user already has `waitlistApproved: true`, it will simply update the timestamp.

### Rate Limiting

The script includes a 1-second delay between batches to avoid Clerk API rate limits.

### Error Handling

- Individual user failures are logged but don't stop the migration
- A summary of all failures is provided at the end
- The script exits with code 1 if a critical error occurs

## When to Run This Script

Run this migration script **before** enabling waitlist enforcement in production:

1. **Development/Testing**: Test the script in a development environment first
2. **Pre-Production**: Run the script in production during a maintenance window
3. **Enable Waitlist**: After successful migration, enable the waitlist feature

## Verification

After running the migration, verify that users can still access the application:

1. Check a few user accounts in the Clerk Dashboard
2. Verify `publicMetadata.waitlistApproved` is set to `true`
3. Test login with an existing user account
4. Confirm protected routes are accessible

## Rollback

If you need to rollback the migration, you can manually update user metadata in the Clerk Dashboard or create a reverse script that removes the `waitlistApproved` field.

## Troubleshooting

### "CLERK_SECRET_KEY environment variable not set"

Ensure your `.env.local` file contains:

```bash
CLERK_SECRET_KEY=sk_test_...
```

### "Failed to migrate user"

Check the error message in the output. Common issues:

- Network connectivity problems
- Invalid Clerk API key
- Rate limiting (the script should handle this automatically)

### Users Still Can't Access After Migration

1. Verify the migration completed successfully
2. Check that the middleware is reading the correct metadata field
3. Ensure JWT template includes public metadata
4. Clear browser cache and cookies

## Support

For issues or questions about the migration script, refer to:

- [Clerk Documentation](https://clerk.com/docs)
- [Project Requirements](.kiro/specs/clerk-waitlist/requirements.md)
- [Design Document](.kiro/specs/clerk-waitlist/design.md)
