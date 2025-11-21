# Clerk Waitlist Setup Guide

This guide walks you through configuring the Clerk waitlist feature for the AI Wizard Duel application.

## Prerequisites

- Access to your Clerk Dashboard
- Admin privileges in your Clerk organization
- The application's Clerk instance configured

## Step 1: Enable Waitlist in Clerk Dashboard

1. **Navigate to Clerk Dashboard**
   - Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Select your AI Wizard Duel application

2. **Enable Waitlist Feature**
   - In the left sidebar, click on **"Waitlist"**
   - Toggle **"Enable Waitlist"** to ON
   - Configure waitlist settings:
     - **Approval Mode**: Manual (recommended) or Automatic
     - **Email Notifications**: Enable to notify users of status changes
     - **Waitlist Page**: Customize the messaging and branding

3. **Save Changes**
   - Click **"Save"** to apply the waitlist configuration

## Step 2: Configure Public Metadata Fields

1. **Navigate to User Settings**
   - In the Clerk Dashboard, go to **"Users & Authentication"** → **"User Settings"**

2. **Configure Public Metadata**
   - Scroll to **"Public Metadata"** section
   - Ensure the following fields are available:
     - `role` (string): User role (user, admin, super_admin)
     - `waitlistApproved` (boolean): Waitlist approval status
     - `waitlistJoinedAt` (number): Timestamp when user joined waitlist
     - `waitlistApprovedAt` (number): Timestamp when user was approved

3. **Set Default Values** (Optional)
   - You can set default metadata for new users
   - For existing users, they should be auto-approved (see migration script)

## Step 3: Update JWT Template

1. **Navigate to JWT Templates**
   - In the Clerk Dashboard, go to **"JWT Templates"**
   - Find or create the **"convex"** template

2. **Include Public Metadata in JWT**
   - Edit the JWT template
   - Ensure the template includes public metadata:

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "role": "{{user.public_metadata.role}}",
  "waitlistApproved": "{{user.public_metadata.waitlistApproved}}",
  "waitlistJoinedAt": "{{user.public_metadata.waitlistJoinedAt}}",
  "waitlistApprovedAt": "{{user.public_metadata.waitlistApprovedAt}}"
}
```

3. **Save the Template**
   - Click **"Save"** to apply changes
   - The JWT will now include waitlist metadata

## Step 4: Configure Environment Variables

The environment variables have already been added to your `.env.local` file:

```bash
# Waitlist Configuration
NEXT_PUBLIC_WAITLIST_ENABLED=false
```

### Environment Variable Options

- `NEXT_PUBLIC_WAITLIST_ENABLED=false`: Waitlist is disabled (default for development)
- `NEXT_PUBLIC_WAITLIST_ENABLED=true`: Waitlist is enabled and enforced

### Development vs Production

- **Development**: Set to `false` to bypass waitlist checks during development
- **Production**: Set to `true` to enforce waitlist for all users

## Step 5: Configure Webhooks (Optional)

For real-time status updates, you can configure webhooks:

1. **Navigate to Webhooks**
   - In the Clerk Dashboard, go to **"Webhooks"**

2. **Create Webhook Endpoint**
   - Add your application's webhook URL
   - Subscribe to events:
     - `user.created`
     - `user.updated`

3. **Handle Webhook Events**
   - Process waitlist status changes in your application
   - Update user access in real-time

## Step 6: Test the Configuration

1. **Create a Test User**
   - Sign up with a new email address
   - Verify the user appears in the waitlist

2. **Check Metadata**
   - In Clerk Dashboard, view the user's public metadata
   - Verify `waitlistApproved` is set correctly

3. **Test Approval Flow**
   - Approve the test user in Clerk Dashboard
   - Verify the user gains access to protected features

4. **Test JWT Token**
   - Inspect the JWT token in your application
   - Verify it includes waitlist metadata fields

## Step 7: Migrate Existing Users

Before enabling the waitlist in production, you should auto-approve all existing users:

1. **Run Migration Script** (to be implemented in task 8)
   - The migration script will set `waitlistApproved: true` for all existing users
   - This ensures current users maintain access

2. **Verify Migration**
   - Check that all existing users have `waitlistApproved: true`
   - Test that existing users can still access the application

## Troubleshooting

### Issue: Waitlist metadata not appearing in JWT

**Solution**:

- Verify the JWT template includes the metadata fields
- Regenerate the JWT by signing out and signing back in
- Check that the Clerk instance is using the correct JWT template

### Issue: Users not being redirected to waitlist page

**Solution**:

- Verify middleware is configured correctly (task 6)
- Check that `NEXT_PUBLIC_WAITLIST_ENABLED` is set to `true`
- Ensure the waitlist page exists at `/waitlist`

### Issue: Admins being blocked by waitlist

**Solution**:

- Verify admin users have `role: "admin"` or `role: "super_admin"` in public metadata
- Admins are automatically approved regardless of `waitlistApproved` status

### Issue: Development mode not bypassing waitlist

**Solution**:

- Set `NEXT_PUBLIC_WAITLIST_ENABLED=false` in `.env.local`
- Restart the development server
- Verify `NODE_ENV=development`

## Security Considerations

1. **Server-Side Validation**
   - Always verify waitlist status on the server (middleware, API routes)
   - Never trust client-side checks alone

2. **Metadata Integrity**
   - Only Clerk Dashboard should modify `waitlistApproved`
   - Users cannot modify their own public metadata

3. **Admin Bypass**
   - Admins and super admins automatically bypass waitlist
   - Ensure admin roles are properly secured

## Next Steps

After completing this setup:

1. ✅ Clerk waitlist is configured
2. ✅ Environment variables are set
3. ✅ JWT template includes waitlist metadata
4. ⏭️ Proceed to implement waitlist utility functions (task 2)
5. ⏭️ Create waitlist status hook (task 3)
6. ⏭️ Implement waitlist page (task 4)

## Resources

- [Clerk Waitlist Documentation](https://clerk.com/docs/authentication/waitlist)
- [Clerk Public Metadata Guide](https://clerk.com/docs/users/metadata)
- [Clerk JWT Templates](https://clerk.com/docs/backend-requests/making/jwt-templates)
