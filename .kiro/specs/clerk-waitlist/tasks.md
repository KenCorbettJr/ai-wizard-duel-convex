# Implementation Plan: Clerk Waitlist Integration

- [x] 1. Set up Clerk waitlist configuration and environment
  - Configure waitlist feature in Clerk Dashboard
  - Enable waitlist in application settings
  - Set up public metadata fields for waitlist status
  - Add environment variables for waitlist configuration
  - Update JWT template to include waitlist metadata
  - _Requirements: 4.1_

- [x] 2. Implement core waitlist utility functions
  - Extend `src/lib/auth.ts` with waitlist status functions
  - Implement `isWaitlistApproved()` function
  - Implement `isWaitlistPending()` function
  - Implement `getWaitlistStatus()` function
  - Add TypeScript types for waitlist metadata
  - _Requirements: 2.1, 4.3_

- [x] 2.1 Write unit tests for waitlist utility functions
  - Test `isWaitlistApproved()` with various metadata states
  - Test `isWaitlistPending()` with different scenarios
  - Test `getWaitlistStatus()` return values
  - Test edge cases (null user, missing metadata)
  - _Requirements: 2.1, 4.3_

- [x] 2.2 Write property test for permission verification
  - **Property 2: Permission verification completeness**
  - **Validates: Requirements 2.1, 4.3**

- [x] 3. Create waitlist status hook
  - Implement `src/hooks/useWaitlistStatus.ts`
  - Use Clerk's `useUser()` hook internally
  - Return approval status, pending status, and loading state
  - Handle edge cases (unauthenticated, missing metadata)
  - Add proper TypeScript types
  - _Requirements: 2.1, 2.4_

- [x] 3.1 Write unit tests for waitlist status hook
  - Test hook with approved user
  - Test hook with pending user
  - Test hook with unauthenticated user
  - Test loading states
  - _Requirements: 2.1, 2.4_

- [x] 4. Implement waitlist page
  - Create `src/app/waitlist/page.tsx`
  - Integrate Clerk's `<Waitlist />` component
  - Display current status for authenticated users
  - Show pending message for waitlist users
  - Add custom branding and messaging
  - Style to match application theme
  - _Requirements: 1.1, 1.3, 2.2, 6.1, 6.4_

- [x] 5. Create waitlist guard component
  - Implement `src/components/WaitlistGuard.tsx`
  - Check waitlist approval status
  - Render children for approved users
  - Render fallback for pending users
  - Handle loading states
  - _Requirements: 2.5, 5.1_

- [x] 5.1 Write unit tests for waitlist guard component
  - Test children render for approved users
  - Test fallback renders for pending users
  - Test loading state handling
  - Test with unauthenticated users
  - _Requirements: 2.5, 5.1_

- [ ] 6. Implement middleware for route protection
  - Create `middleware.ts` in project root
  - Check authentication status
  - Verify waitlist approval for protected routes
  - Define list of protected routes
  - Define list of public routes
  - Redirect unapproved users to waitlist page
  - Allow approved users to access all routes
  - _Requirements: 1.4, 2.5, 4.5_

- [x] 6.1 Write property test for protected route enforcement
  - **Property 1: Protected route enforcement**
  - **Validates: Requirements 1.4, 2.5, 4.5**

- [x] 7. Update existing components with waitlist guards
  - Add `<WaitlistGuard>` to wizard creation button
  - Add `<WaitlistGuard>` to duel creation button
  - Add `<WaitlistGuard>` to campaign access
  - Update navigation to hide protected links for pending users
  - Show waitlist status in user menu
  - _Requirements: 2.5, 5.2_

- [x] 7.1 Write property test for approved user full access
  - **Property 3: Approved user full access**
  - **Validates: Requirements 2.3, 5.1**

- [x] 7.2 Write property test for approved user UI consistency
  - **Property 4: Approved user UI consistency**
  - **Validates: Requirements 5.2**

- [ ] 8. Add migration script for existing users
  - Create script to auto-approve existing users
  - Set `waitlistApproved: true` for all current users
  - Preserve existing role metadata
  - Add logging for migration process
  - _Requirements: 3.2_

- [ ] 9. Update Clerk provider configuration
  - Modify `src/providers/ClerkProvider.tsx` if needed
  - Ensure waitlist metadata is accessible
  - Configure appearance for waitlist components
  - Add error boundaries for Clerk failures
  - _Requirements: 4.1, 4.2_

- [ ] 10. Add development mode bypass
  - Update middleware to bypass checks in development
  - Add environment variable check
  - Log bypass actions for debugging
  - Ensure production enforcement
  - _Requirements: 4.1_

- [ ] 11. Implement error handling and fallbacks
  - Add error handling for Clerk API failures
  - Implement retry logic for metadata fetching
  - Create error pages for waitlist issues
  - Add fallback UI for component failures
  - Log errors for monitoring
  - _Requirements: 4.4_

- [ ] 12. Update landing page with waitlist messaging
  - Add waitlist information to homepage
  - Update call-to-action buttons
  - Add FAQ section about waitlist
  - Ensure consistent messaging
  - _Requirements: 6.2, 6.5_

- [ ] 13. Write integration tests for waitlist flow
  - Test unauthenticated user redirected to waitlist
  - Test pending user cannot access protected routes
  - Test approved user can access all routes
  - Test public routes remain accessible
  - Test status checking flow
  - Test approval flow with test user
  - _Requirements: 1.1, 1.4, 2.1, 2.3, 3.2_

- [ ] 14. Write end-to-end tests with Cypress
  - Test complete signup flow
  - Test waitlist status display
  - Test route protection
  - Test approval and access grant
  - Test admin bypass
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 3.2_

- [ ] 15. Update documentation
  - Document waitlist setup process
  - Add configuration guide for Clerk Dashboard
  - Document environment variables
  - Create user-facing waitlist FAQ
  - Add troubleshooting guide
  - _Requirements: 6.2, 6.3_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
