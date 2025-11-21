# Design Document: Clerk Waitlist Integration

## Overview

This design document outlines the implementation of a waitlist system using Clerk's built-in waitlist functionality to restrict access to the AI Wizard Duel application. The system will require new users to join a waitlist and be approved by administrators before gaining access to core application features.

The implementation leverages Clerk's native waitlist components and metadata system, integrating seamlessly with the existing authentication infrastructure. The design ensures that unapproved users can sign up and check their status, while approved users gain full access to all application features.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Waitlist   │  │   Protected  │  │   Approved   │      │
│  │     Page     │  │    Routes    │  │  User Pages  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Waitlist Status Verification                  │   │
│  │  - Check authentication                               │   │
│  │  - Verify waitlist approval                          │   │
│  │  - Route protection logic                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Clerk Authentication                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Waitlist   │  │     User     │  │    Public    │      │
│  │   Metadata   │  │   Sessions   │  │   Metadata   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
│  - User data synchronization                                 │
│  - Feature access control                                    │
│  - Waitlist status queries                                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Unauthenticated User Flow:**
   - User visits application → Redirected to waitlist signup
   - User submits waitlist form → Clerk creates waitlist entry
   - User sees pending status page

2. **Waitlist User Flow:**
   - User signs in → Middleware checks waitlist status
   - Status is pending → Redirected to waiting page
   - User can view status but cannot access protected features

3. **Approved User Flow:**
   - Admin approves user in Clerk Dashboard
   - User signs in → Middleware verifies approval
   - User gains full access to all features

4. **Admin Flow:**
   - Admin accesses Clerk Dashboard
   - Reviews pending waitlist requests
   - Approves or denies users
   - Changes reflect immediately in application

## Components and Interfaces

### 1. Waitlist Page Component

**Location:** `src/app/waitlist/page.tsx`

**Purpose:** Display waitlist signup form and status for users

**Props:** None (uses Clerk hooks internally)

**Key Features:**

- Displays Clerk's `<Waitlist />` component for signup
- Shows current waitlist status for authenticated users
- Provides messaging about the approval process
- Styled to match application theme

### 2. Waitlist Middleware

**Location:** `middleware.ts`

**Purpose:** Protect routes and enforce waitlist approval

**Functionality:**

- Intercepts all route requests
- Checks user authentication status
- Verifies waitlist approval via Clerk metadata
- Redirects unapproved users to waitlist page
- Allows approved users to access all routes
- Exempts public routes (landing page, sign-in, waitlist)

**Protected Routes:**

- `/wizards/*` - Wizard management
- `/duels/*` - Duel creation and participation
- `/campaign/*` - Campaign mode
- `/leaderboard` - Leaderboard viewing
- `/profile/*` - Profile management
- `/admin/*` - Admin features (also requires admin role)

**Public Routes:**

- `/` - Landing page
- `/sign-in/*` - Authentication
- `/sign-up/*` - Registration
- `/waitlist` - Waitlist page
- `/api/*` - API routes

### 3. Waitlist Status Hook

**Location:** `src/hooks/useWaitlistStatus.ts`

**Purpose:** Provide waitlist status information to components

**Interface:**

```typescript
interface WaitlistStatus {
  isApproved: boolean;
  isPending: boolean;
  isLoading: boolean;
  user: User | null;
}

function useWaitlistStatus(): WaitlistStatus;
```

**Usage:**

```typescript
const { isApproved, isPending, isLoading } = useWaitlistStatus();

if (isLoading) return <LoadingSpinner />;
if (isPending) return <WaitlistPendingMessage />;
return <ProtectedContent />;
```

### 4. Waitlist Guard Component

**Location:** `src/components/WaitlistGuard.tsx`

**Purpose:** Client-side protection for sensitive UI elements

**Props:**

```typescript
interface WaitlistGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

**Usage:**

```typescript
<WaitlistGuard fallback={<WaitlistMessage />}>
  <CreateWizardButton />
</WaitlistGuard>
```

### 5. Auth Utility Extensions

**Location:** `src/lib/auth.ts`

**New Functions:**

```typescript
/**
 * Check if a user is approved on the waitlist
 */
function isWaitlistApproved(user: User | null | undefined): boolean;

/**
 * Check if a user is pending on the waitlist
 */
function isWaitlistPending(user: User | null | undefined): boolean;

/**
 * Get waitlist status for a user
 */
function getWaitlistStatus(
  user: User | null | undefined
): "approved" | "pending" | "none";
```

## Data Models

### Clerk User Metadata

Clerk stores waitlist information in the user's public metadata:

```typescript
interface ClerkPublicMetadata {
  role?: "user" | "admin" | "super_admin";
  waitlistApproved?: boolean;
  waitlistJoinedAt?: number; // timestamp
  waitlistApprovedAt?: number; // timestamp
}
```

**Metadata Fields:**

- `waitlistApproved`: Boolean indicating if user is approved (set by Clerk Dashboard)
- `waitlistJoinedAt`: Timestamp when user joined waitlist
- `waitlistApprovedAt`: Timestamp when user was approved
- `role`: Existing role field (unchanged)

### Convex User Schema Extension

No changes required to Convex schema. The existing `users` table will continue to work as-is. Waitlist status is managed entirely through Clerk metadata.

## Error Handling

### Error Scenarios

1. **Clerk API Unavailable**
   - Fallback: Allow access in development mode
   - Production: Show error page with retry option
   - Log error for monitoring

2. **Metadata Not Synced**
   - Retry fetching user data
   - Show loading state during retry
   - Fallback to pending status if uncertain

3. **Middleware Failure**
   - Log error
   - Allow access to prevent lockout
   - Alert administrators

4. **Waitlist Component Load Failure**
   - Show fallback form with contact information
   - Provide alternative signup method
   - Log error for debugging

### Error Messages

- **Pending Status:** "Your request to join AI Wizard Duel is being reviewed. We'll notify you via email once you're approved!"
- **API Error:** "We're having trouble loading your waitlist status. Please try again in a moment."
- **Access Denied:** "This feature requires waitlist approval. Please check your status on the waitlist page."

## Testing Strategy

### Unit Tests

1. **Auth Utility Tests** (`src/lib/auth.test.ts`)
   - Test `isWaitlistApproved()` with various user metadata states
   - Test `isWaitlistPending()` with different scenarios
   - Test `getWaitlistStatus()` return values
   - Test edge cases (null user, missing metadata)

2. **Waitlist Hook Tests** (`src/hooks/useWaitlistStatus.test.tsx`)
   - Test hook returns correct status for approved users
   - Test hook returns correct status for pending users
   - Test loading states
   - Test with unauthenticated users

3. **Waitlist Guard Tests** (`src/components/WaitlistGuard.test.tsx`)
   - Test children render for approved users
   - Test fallback renders for pending users
   - Test loading state handling

### Integration Tests

1. **Middleware Integration** (Cypress)
   - Test unauthenticated user redirected to waitlist
   - Test pending user cannot access protected routes
   - Test approved user can access all routes
   - Test public routes remain accessible

2. **End-to-End Waitlist Flow** (Cypress)
   - Test complete signup flow
   - Test status checking
   - Test approval flow (with test user)
   - Test access after approval

### Property-Based Tests

Not applicable for this feature as it primarily involves integration with external service (Clerk) and UI flows.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Protected route enforcement

_For any_ protected route in the application, when an unapproved user attempts to access it, the system should redirect them to the waitlist page.

**Validates: Requirements 1.4, 2.5, 4.5**

### Property 2: Permission verification completeness

_For any_ permission check in the system, the check should verify both authentication status and waitlist approval status before granting access.

**Validates: Requirements 2.1, 4.3**

### Property 3: Approved user full access

_For any_ application feature, when an approved user attempts to access it, the system should grant access without waitlist restrictions.

**Validates: Requirements 2.3, 5.1**

### Property 4: Approved user UI consistency

_For any_ route that an approved user navigates to, the system should not display waitlist-related messages or restrictions.

**Validates: Requirements 5.2**

### Example Tests

The following acceptance criteria are best validated through specific example tests rather than property-based tests:

**Example 1: Unauthenticated user sees waitlist interface**

- Validates: Requirements 1.1
- Test: Visit application without authentication, verify waitlist signup is displayed

**Example 2: Waitlist entry creation**

- Validates: Requirements 1.2
- Test: Submit waitlist form, verify entry created in Clerk

**Example 3: Confirmation message display**

- Validates: Requirements 1.3
- Test: Successfully join waitlist, verify confirmation message appears

**Example 4: Duplicate email handling**

- Validates: Requirements 1.5
- Test: Attempt to join with existing email, verify status is displayed

**Example 5: Pending user message**

- Validates: Requirements 2.2
- Test: Sign in as pending user, verify waiting message is shown

**Example 6: Status accuracy**

- Validates: Requirements 2.4
- Test: Check status display matches Clerk metadata

**Example 7: Approval grants access**

- Validates: Requirements 3.2
- Test: Set approval metadata, verify access is granted

**Example 8: Denial maintains restrictions**

- Validates: Requirements 3.3
- Test: Deny user, verify they remain restricted

**Example 9: Immediate permission update**

- Validates: Requirements 3.4
- Test: Approve user, verify access granted without re-auth

**Example 10: Revocation removes access**

- Validates: Requirements 3.5
- Test: Remove approval, verify access is revoked

**Example 11: Configuration initialization**

- Validates: Requirements 4.1
- Test: Check Clerk configuration includes waitlist settings

**Example 12: Status synchronization**

- Validates: Requirements 4.4
- Test: Change status, verify UI updates without re-auth

**Example 13: Normal operation for approved users**

- Validates: Requirements 5.3
- Test: Create wizard/duel as approved user, verify success

**Example 14: Status caching**

- Validates: Requirements 5.4
- Test: Check status multiple times, verify API calls are minimized

**Example 15: Session persistence**

- Validates: Requirements 5.5
- Test: Approved user remains active, verify continuous access

## Implementation Notes

### Clerk Configuration

1. **Enable Waitlist in Clerk Dashboard:**
   - Navigate to Clerk Dashboard → Waitlist
   - Enable waitlist feature
   - Configure approval workflow
   - Set up email notifications

2. **Configure Metadata Fields:**
   - Ensure `waitlistApproved` field is available in public metadata
   - Configure automatic metadata updates on approval
   - Set up webhooks for status changes (optional)

3. **JWT Template:**
   - Verify JWT template includes public metadata
   - Ensure `waitlistApproved` field is accessible in tokens

### Environment Variables

Add to `.env.local`:

```bash
# Existing Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_JWT_ISSUER_DOMAIN=...

# Waitlist configuration (optional)
NEXT_PUBLIC_WAITLIST_ENABLED=true
```

### Migration Strategy

1. **Phase 1: Add Waitlist Infrastructure**
   - Implement middleware
   - Create waitlist page
   - Add utility functions
   - Deploy without enforcement

2. **Phase 2: Test with Subset**
   - Enable for new signups only
   - Existing users auto-approved
   - Monitor for issues

3. **Phase 3: Full Rollout**
   - Enable enforcement for all routes
   - Communicate to users
   - Monitor approval workflow

### Backward Compatibility

- **Existing Users:** Automatically set `waitlistApproved: true` for all existing users
- **Development Mode:** Bypass waitlist checks in development
- **Admin Users:** Admins and super_admins automatically approved
- **Graceful Degradation:** If Clerk API fails, allow access in development, show error in production

### Performance Considerations

1. **Caching:**
   - Cache waitlist status in session
   - Invalidate on metadata changes
   - Use Clerk's built-in caching

2. **Middleware Optimization:**
   - Minimize database calls
   - Use edge runtime for fast checks
   - Cache route protection rules

3. **Client-Side Checks:**
   - Use hooks for reactive status updates
   - Minimize re-renders
   - Prefetch status on app load

### Security Considerations

1. **Metadata Integrity:**
   - Only Clerk Dashboard can modify `waitlistApproved`
   - Verify metadata in middleware (server-side)
   - Never trust client-side status

2. **Route Protection:**
   - Enforce at middleware level (server-side)
   - Double-check in API routes
   - Client-side guards are UI-only

3. **Admin Bypass:**
   - Admins automatically approved
   - Super admins can manage waitlist
   - Log all approval actions

### Monitoring and Analytics

1. **Track Metrics:**
   - Waitlist signup rate
   - Approval rate and time
   - Conversion after approval
   - Feature usage by approved users

2. **Error Monitoring:**
   - Middleware failures
   - Clerk API errors
   - Metadata sync issues
   - User lockouts

3. **User Feedback:**
   - Collect feedback from waitlist users
   - Monitor support requests
   - Track approval satisfaction

## Future Enhancements

1. **Automated Approval:**
   - Implement criteria-based auto-approval
   - Time-based approval (e.g., after 24 hours)
   - Referral-based priority

2. **Waitlist Position:**
   - Show user's position in queue
   - Estimated approval time
   - Progress indicators

3. **Invitation System:**
   - Allow approved users to invite others
   - Skip waitlist for invited users
   - Track invitation success

4. **Tiered Access:**
   - Partial feature access while pending
   - Progressive feature unlocking
   - Beta tester program

5. **Communication:**
   - Automated status update emails
   - SMS notifications
   - In-app notifications
