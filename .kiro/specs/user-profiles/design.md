# Design Document

## Overview

This design implements user profiles with custom user IDs (handles) for the AI Wizard Duel application. The system will extend the existing user management infrastructure to support unique, Twitter-like handles and public profile pages that showcase user wizards and statistics.

## Architecture

### Database Schema Changes

The existing `users` table will be extended with new fields:

- `userId`: Unique user handle (string, 3-20 characters, alphanumeric + underscore/hyphen)
- `displayName`: User's chosen display name (optional, falls back to Clerk name)
- `profileCreatedAt`: Timestamp when profile was completed

### URL Structure

- `/users/[userId]` - Public profile page for user with given handle
- `/profile/setup` - Initial profile setup page for new users
- `/profile/edit` - Profile editing page (authenticated users only)

### Authentication Flow Integration

The system will integrate with the existing Clerk authentication and `UserInitializer` component:

1. User signs up via Clerk
2. `UserInitializer` creates basic user record
3. User is redirected to profile setup to choose their handle
4. Profile completion unlocks full app functionality

## Components and Interfaces

### Frontend Components

#### 1. ProfileSetupForm

- **Location**: `src/components/ProfileSetupForm.tsx`
- **Purpose**: Handle initial user ID creation during onboarding
- **Props**:
  - `onComplete: (userId: string) => void`
  - `initialName?: string`
- **Features**:
  - Real-time availability checking
  - Format validation
  - Error handling for taken handles

#### 2. UserProfilePage

- **Location**: `src/app/users/[userId]/page.tsx`
- **Purpose**: Display public user profile
- **Features**:
  - User statistics (total wizards, duels, win rate)
  - Wizard gallery grid
  - Social sharing metadata
  - 404 handling for non-existent users

#### 3. UserIdDisplay

- **Location**: `src/components/UserIdDisplay.tsx`
- **Purpose**: Reusable component for showing user handles with links
- **Props**:
  - `userId: string`
  - `displayName?: string`
  - `showAvatar?: boolean`
  - `size?: 'sm' | 'md' | 'lg'`

#### 4. ProfileEditForm

- **Location**: `src/components/ProfileEditForm.tsx`
- **Purpose**: Allow users to update display name and other profile settings
- **Note**: User ID remains immutable after creation

### Backend Functions

#### 1. User Profile Management

```typescript
// convex/userProfiles.ts

export const checkUserIdAvailability = query({
  args: { userId: v.string() },
  returns: v.object({
    available: v.boolean(),
    suggestion: v.optional(v.string()),
  }),
});

export const setUserId = mutation({
  args: { userId: v.string(), displayName: v.optional(v.string()) },
  returns: v.object({ success: v.boolean() }),
});

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
    }),
  ),
});

export const getUserWizardsPublic = query({
  args: { userId: v.string() },
  returns: v.array(/* wizard schema */),
});
```

#### 2. Enhanced Wizard Queries

```typescript
// Updates to convex/wizards.ts

export const getWizardWithOwnerInfo = query({
  args: { wizardId: v.id("wizards") },
  returns: v.object({
    // existing wizard fields
    ownerUserId: v.optional(v.string()),
    ownerDisplayName: v.optional(v.string()),
  }),
});
```

## Data Models

### Extended User Schema

```typescript
users: defineTable({
  // Existing fields...
  clerkId: v.string(),
  role: v.union(
    v.literal("user"),
    v.literal("admin"),
    v.literal("super_admin"),
  ),
  email: v.optional(v.string()),
  name: v.optional(v.string()),

  // New profile fields
  userId: v.optional(v.string()), // Unique handle, set during onboarding
  displayName: v.optional(v.string()), // User's chosen display name
  profileCreatedAt: v.optional(v.number()), // When profile was completed

  // Existing monetization fields...
  subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
  // ... rest of existing fields
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_user_id", ["userId"]) // New index for handle lookups
  .index("by_stripe_customer", ["stripeCustomerId"]);
```

### User ID Validation Rules

- **Length**: 3-20 characters
- **Characters**: Alphanumeric (a-z, A-Z, 0-9), underscore (\_), hyphen (-)
- **Case**: Case-insensitive for uniqueness, case-preserving for display
- **Reserved**: Block common reserved words (admin, api, www, etc.)
- **Immutable**: Cannot be changed after initial creation

## Error Handling

### User ID Validation Errors

- **Invalid format**: Clear messaging about allowed characters
- **Too short/long**: Specific length requirements
- **Already taken**: Suggest alternatives with numbers or variations
- **Reserved word**: Explain restriction and suggest alternatives

### Profile Page Errors

- **404 for non-existent users**: Custom 404 page with search suggestions
- **Network errors**: Retry mechanisms and offline indicators
- **Loading states**: Skeleton components during data fetching

### Onboarding Flow Errors

- **Clerk authentication failures**: Redirect to sign-in with error message
- **Database errors**: Graceful fallback with retry options
- **Incomplete profiles**: Block access to main app until profile complete

## Testing Strategy

### Unit Tests

- User ID validation logic
- Profile data transformation functions
- Error handling scenarios
- Database query functions

### Integration Tests

- Complete onboarding flow
- Profile page rendering with real data
- User ID availability checking
- Wizard ownership display

### End-to-End Tests

- New user signup and profile creation
- Public profile page access
- Wizard creation with owner attribution
- Profile sharing functionality

## SEO and Social Sharing

### Meta Tags for Profile Pages

```typescript
// src/app/users/[userId]/page.tsx metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: `${displayName} (@${userId}) - AI Wizard Duel`,
    description: `View ${displayName}'s wizards and duel statistics. ${wizardCount} wizards, ${winRate}% win rate.`,
    openGraph: {
      title: `${displayName} (@${userId})`,
      description: `${wizardCount} wizards • ${totalDuels} duels • ${winRate}% win rate`,
      images: [{ url: "/og-profile.png" }],
    },
  };
}
```

### URL Structure

- Clean URLs: `/users/johndoe` instead of `/users/123`
- Canonical URLs for SEO
- Proper 404 handling for invalid handles

## Migration Strategy

### Existing User Migration

1. **Gradual rollout**: Existing users prompted to create handles on next login
2. **Optional initially**: Users can continue without handles temporarily
3. **Incentivized adoption**: Small credit bonus for completing profile
4. **Fallback display**: Show Clerk name/email if no handle set

### Database Migration

1. Add new columns to users table with optional constraints
2. Create new index for userId lookups
3. Update existing queries to handle optional userId field
4. Backfill existing users with suggested handles (optional)

## Performance Considerations

### Caching Strategy

- **Profile data**: Cache user profiles for 5 minutes
- **Wizard counts**: Cache aggregated statistics for 15 minutes
- **Availability checks**: Debounce user ID availability queries

### Database Optimization

- **Indexes**: Efficient lookups by userId and clerkId
- **Query optimization**: Minimize joins and aggregations
- **Pagination**: Implement pagination for large wizard collections

### Image Loading

- **Lazy loading**: Wizard illustrations load on scroll
- **Placeholder images**: Show skeleton while loading
- **Error fallbacks**: Default images for failed loads
