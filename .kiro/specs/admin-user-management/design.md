# Design Document

## Overview

This design implements a comprehensive user management interface for administrators in the AI Wizard Duel application. The system will provide a dedicated admin page for viewing all users, their activity statistics, and managing image credits. The interface will integrate with the existing admin dashboard structure and leverage the current database schema to aggregate user data efficiently.

## Architecture

### URL Structure

- `/admin/users` - Main user management page with list and search
- `/admin/users/[userId]` - Detailed user view (redirects to public profile with admin actions)

### Authentication & Authorization

The system will use the existing `verifySuperAdmin` utility from `convex/auth.utils.ts` to ensure only super_admin users can access these features. The admin layout already enforces this with the `SuperAdminOnly` component.

### Data Aggregation Strategy

User statistics will be calculated on-demand using Convex queries that aggregate data from multiple tables:

- Wizard count: Query `wizards` table by owner
- Multiplayer duel stats: Query `duels` table filtering out campaign battles
- Campaign battle stats: Query `campaignBattles` table by userId
- Credit transactions: Query `imageCreditTransactions` table by userId

## Components and Interfaces

### Frontend Components

#### 1. UserManagementPage

- **Location**: `src/app/admin/users/page.tsx`
- **Purpose**: Main admin interface for viewing and managing users
- **Features**:
  - Paginated user list with 50 users per page
  - Search bar for filtering by name, userId, or email
  - Sort options (join date, activity, username)
  - Activity level filters (inactive, low, medium, high)
  - Quick stats overview (total users, active users, etc.)
  - Real-time data updates via Convex subscriptions

#### 2. UserListTable

- **Location**: `src/components/admin/UserListTable.tsx`
- **Purpose**: Display users in a sortable, filterable table
- **Props**:
  - `users: UserWithStats[]`
  - `onUserClick: (userId: string) => void`
  - `onGrantCredits: (userId: string) => void`
- **Columns**:
  - Display Name / User ID
  - Email
  - Join Date
  - Wizards Count
  - Multiplayer Duels
  - Campaign Battles
  - Image Credits
  - Subscription Tier
  - Actions (View Profile, Grant Credits)

#### 3. GrantCreditsModal

- **Location**: `src/components/admin/GrantCreditsModal.tsx`
- **Purpose**: Modal dialog for granting image credits to users
- **Props**:
  - `userId: string`
  - `currentBalance: number`
  - `userName: string`
  - `onClose: () => void`
  - `onSuccess: () => void`
- **Features**:
  - Input field for credit amount (positive integers only)
  - Required reason/note textarea
  - Current balance display
  - Preview of new balance
  - Confirmation button with loading state

#### 4. UserStatsCard

- **Location**: `src/components/admin/UserStatsCard.tsx`
- **Purpose**: Display aggregated user statistics in card format
- **Props**:
  - `stats: UserStatistics`
- **Features**:
  - Total wizards created
  - Multiplayer duels (with win/loss breakdown)
  - Campaign battles (with completion status)
  - Last activity timestamp
  - Activity level indicator

#### 5. CreditHistoryModal

- **Location**: `src/components/admin/CreditHistoryModal.tsx`
- **Purpose**: Display detailed credit transaction history for a user
- **Props**:
  - `userId: string`
  - `onClose: () => void`
- **Features**:
  - Paginated transaction list
  - Transaction type badges (EARNED, CONSUMED, GRANTED, EXPIRED)
  - Timestamp and amount for each transaction
  - Source information (signup bonus, ad reward, admin grant, etc.)
  - Admin notes for manual grants

### Backend Functions

#### 1. User List and Search

```typescript
// convex/adminUsers.ts

export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal("joinDate"),
        v.literal("activity"),
        v.literal("username")
      )
    ),
    activityFilter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("inactive"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high")
      )
    ),
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("users"),
        clerkId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        userId: v.optional(v.string()),
        displayName: v.optional(v.string()),
        subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
        imageCredits: v.number(),
        createdAt: v.number(),
        role: v.union(
          v.literal("user"),
          v.literal("admin"),
          v.literal("super_admin")
        ),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
});
```

#### 2. User Statistics Aggregation

```typescript
// convex/adminUsers.ts

export const getUserStatistics = query({
  args: { userId: v.string() },
  returns: v.object({
    totalWizards: v.number(),
    multiplayerDuels: v.object({
      total: v.number(),
      wins: v.number(),
      losses: v.number(),
      inProgress: v.number(),
    }),
    campaignBattles: v.object({
      total: v.number(),
      wins: v.number(),
      losses: v.number(),
      currentProgress: v.number(), // Highest opponent defeated
    }),
    lastActivityAt: v.optional(v.number()),
    activityLevel: v.union(
      v.literal("inactive"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
  }),
});
```

#### 3. Credit Management

```typescript
// convex/adminUsers.ts

export const grantImageCredits = mutation({
  args: {
    targetUserId: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newBalance: v.number(),
  }),
});

export const getCreditHistory = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("imageCreditTransactions"),
        type: v.union(
          v.literal("EARNED"),
          v.literal("CONSUMED"),
          v.literal("GRANTED"),
          v.literal("EXPIRED")
        ),
        amount: v.number(),
        source: v.union(
          v.literal("SIGNUP_BONUS"),
          v.literal("AD_REWARD"),
          v.literal("PREMIUM_GRANT"),
          v.literal("ADMIN_GRANT")
        ),
        createdAt: v.number(),
        metadata: v.optional(v.record(v.string(), v.any())),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
});
```

#### 4. Platform Overview Stats

```typescript
// convex/adminUsers.ts

export const getPlatformStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeUsers24h: v.number(),
    activeUsers7d: v.number(),
    totalWizards: v.number(),
    totalDuels: v.number(),
    activeDuels: v.number(),
  }),
});
```

## Data Models

### Extended Types

```typescript
// User with aggregated statistics
type UserWithStats = {
  _id: Id<"users">;
  clerkId: string;
  email?: string;
  name?: string;
  userId?: string;
  displayName?: string;
  subscriptionTier: "FREE" | "PREMIUM";
  imageCredits: number;
  createdAt: number;
  role: "user" | "admin" | "super_admin";
  stats: {
    totalWizards: number;
    multiplayerDuels: {
      total: number;
      wins: number;
      losses: number;
    };
    campaignBattles: {
      total: number;
      wins: number;
      losses: number;
    };
    lastActivityAt?: number;
    activityLevel: "inactive" | "low" | "medium" | "high";
  };
};
```

### Activity Level Calculation

Activity levels are determined by recent engagement:

- **Inactive**: No activity in last 30 days OR zero wizards/duels
- **Low**: 1-2 duels in last 30 days OR 1-2 wizards total
- **Medium**: 3-10 duels in last 30 days OR 3-5 wizards total
- **High**: 10+ duels in last 30 days OR 6+ wizards total

## Error Handling

### Authorization Errors

- **Non-admin access**: Redirect to home page with error toast
- **Session expired**: Redirect to login with return URL
- **Insufficient permissions**: Display error message in admin layout

### Data Loading Errors

- **User not found**: Display "User not found" message in modal/page
- **Query timeout**: Show retry button with error message
- **Network errors**: Display offline indicator with retry option

### Credit Grant Errors

- **Invalid amount**: Show inline validation error (must be positive integer)
- **Missing reason**: Show inline validation error (required field)
- **Transaction failure**: Display error toast with retry option
- **Concurrent modification**: Refresh data and show warning

## Performance Considerations

### Query Optimization

- **Pagination**: Load 50 users per page to balance performance and UX
- **Indexes**: Leverage existing indexes (by_clerk_id, by_user_id)
- **Lazy loading**: Load statistics only when user row is expanded or viewed
- **Debouncing**: Debounce search input by 300ms to reduce query load

### Caching Strategy

- **User list**: Cache for 30 seconds (frequent updates expected)
- **User statistics**: Cache for 60 seconds (less critical for real-time accuracy)
- **Credit history**: Cache for 5 minutes (historical data, rarely changes)
- **Platform stats**: Cache for 2 minutes (overview data)

### Data Aggregation

- **Batch queries**: Use Promise.all() to fetch related data in parallel
- **Computed fields**: Calculate activity level on backend to reduce client processing
- **Selective loading**: Only load full statistics when user details are viewed

## Testing Strategy

### Unit Tests

- User statistics calculation logic
- Activity level determination
- Credit amount validation
- Search and filter logic
- Pagination handling

### Integration Tests

- User list loading with pagination
- Search functionality across multiple fields
- Credit grant workflow end-to-end
- Credit history retrieval
- Admin authorization checks

### End-to-End Tests

- Admin login and navigation to user management
- Search for specific user
- View user statistics
- Grant credits to user
- View credit transaction history
- Filter users by activity level

## Security Considerations

### Access Control

- All admin functions require super_admin role verification
- Use `verifySuperAdmin` utility for consistent authorization
- Log all admin actions (especially credit grants) with admin identity
- Display admin name in credit transaction metadata

### Audit Trail

- Record admin identity in credit grant transactions
- Include reason/note for all manual credit adjustments
- Timestamp all admin actions
- Store metadata for future audit queries

### Data Privacy

- Limit email visibility to admin users only
- Don't expose sensitive user data in public APIs
- Sanitize search queries to prevent injection
- Rate limit admin queries to prevent abuse

## UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Admin Navigation Sidebar │ User Management Page         │
│                          │                              │
│ - Dashboard              │ ┌──────────────────────────┐ │
│ - Platform Stats         │ │ Search & Filters         │ │
│ - Campaign Opponents     │ └──────────────────────────┘ │
│ - User Management ◄──────┼─                             │
│ - Dev Tools              │ ┌──────────────────────────┐ │
│ - Duel Management        │ │ Quick Stats Cards        │ │
│                          │ └──────────────────────────┘ │
│                          │                              │
│                          │ ┌──────────────────────────┐ │
│                          │ │ User List Table          │ │
│                          │ │ - Sortable columns       │ │
│                          │ │ - Action buttons         │ │
│                          │ │ - Pagination controls    │ │
│                          │ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Visual Indicators

- **Activity badges**: Color-coded badges for activity levels
  - Inactive: Gray
  - Low: Yellow
  - Medium: Blue
  - High: Green
- **Credit warnings**: Red highlight for users with 0 credits
- **Subscription badges**: Premium users get gold badge
- **Role indicators**: Admin/super_admin users get special badge

### Responsive Design

- Desktop: Full table with all columns visible
- Tablet: Collapse some columns, show in expandable rows
- Mobile: Card-based layout instead of table

## Integration with Existing Systems

### Admin Dashboard

- Add "User Management" card to admin dashboard home page
- Include quick stats (total users, users with 0 credits)
- Link to `/admin/users` page

### Admin Navigation

- Add "Users" navigation item to `AdminNavigation` component
- Use Users icon from lucide-react
- Position between "Platform Stats" and "Dev Tools"

### Existing Credit System

- Reuse `adminGrantCredits` mutation from `imageCreditService.ts`
- Extend to include admin identity in transaction metadata
- Ensure transaction logging captures admin actions

### User Profiles

- Link from admin user list to public user profile pages
- Add admin-only actions on profile pages (grant credits button)
- Show admin badge when viewing as admin

## Migration and Rollout

### Phase 1: Backend Functions

1. Create `convex/adminUsers.ts` with all query and mutation functions
2. Add comprehensive tests for statistics aggregation
3. Verify performance with production data volume

### Phase 2: Frontend Components

1. Build reusable components (UserListTable, GrantCreditsModal)
2. Create main user management page
3. Add navigation link to admin dashboard

### Phase 3: Integration

1. Connect frontend to backend queries
2. Add error handling and loading states
3. Implement pagination and search

### Phase 4: Testing and Polish

1. End-to-end testing of all workflows
2. Performance optimization based on real usage
3. UI polish and accessibility improvements

## Future Enhancements

### Potential Additions

- Bulk credit grants (select multiple users)
- User suspension/ban functionality
- Export user data to CSV
- Advanced analytics dashboard
- Email notification system for admins
- User activity timeline view
- Automated credit grants based on rules
