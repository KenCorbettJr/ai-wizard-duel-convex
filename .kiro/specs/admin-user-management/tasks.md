# Implementation Plan

- [x] 1. Create backend functions for user management and statistics
  - Create `convex/adminUsers.ts` file with all admin user management functions
  - Implement admin authorization checks using existing `verifySuperAdmin` utility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement user list query with pagination and filtering
  - [x] 2.1 Create listUsers query function
    - Write query to fetch paginated user list from users table
    - Implement search functionality for name, userId, and email fields
    - Add sorting options (joinDate, activity, username)
    - Include activity level filtering logic
    - Return paginated results with user basic information
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Create getUserStatistics query function
    - Write query to aggregate wizard count by owner from wizards table
    - Calculate multiplayer duel statistics from duels table (excluding campaign battles)
    - Calculate campaign battle statistics from campaignBattles table
    - Compute win/loss records for both multiplayer and campaign
    - Determine activity level based on recent engagement
    - Calculate last activity timestamp from most recent duel or wizard creation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.4_

  - [x] 2.3 Create getPlatformStats query function
    - Write query to count total users
    - Calculate active users in last 24 hours and 7 days
    - Count total wizards and duels across platform
    - Count currently active duels (IN_PROGRESS status)
    - _Requirements: 1.3, 5.1_

- [x] 3. Implement credit management backend functions
  - [x] 3.1 Create grantImageCredits mutation
    - Write mutation to add credits to target user's balance
    - Validate credit amount is positive integer
    - Require reason parameter for audit trail
    - Verify admin authorization using verifySuperAdmin
    - Update user's imageCredits field
    - Record transaction in imageCreditTransactions table with admin identity
    - Include admin clerkId and reason in transaction metadata
    - Return success status and new balance
    - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Create getCreditHistory query function
    - Write paginated query to fetch credit transactions for specific user
    - Order transactions by creation date (most recent first)
    - Include transaction type, amount, source, and metadata
    - Filter to show all transaction types (EARNED, CONSUMED, GRANTED, EXPIRED)
    - Return paginated results with transaction details
    - _Requirements: 3.3, 3.4_

- [x] 4. Build user list table component
  - [x] 4.1 Create UserListTable component
    - Build table component with sortable columns
    - Display user display name, userId, email, join date
    - Show wizard count, multiplayer duels, campaign battles
    - Display image credits and subscription tier
    - Add action buttons for each user (View Profile, Grant Credits)
    - Implement column sorting functionality
    - Add loading states and empty state handling
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 4.2 Add activity level indicators
    - Create visual badges for activity levels (inactive, low, medium, high)
    - Use color coding (gray, yellow, blue, green)
    - Highlight users with zero credits in red
    - Add subscription tier badges (FREE/PREMIUM)
    - Display role indicators for admin users
    - _Requirements: 5.1, 5.3_

- [x] 5. Create grant credits modal component
  - [x] 5.1 Build GrantCreditsModal component
    - Create modal dialog with form for credit amount input
    - Add required reason/note textarea field
    - Display current credit balance and user name
    - Show preview of new balance after grant
    - Implement input validation (positive integers only)
    - Add confirmation button with loading state
    - Handle success and error states with appropriate feedback
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Integrate modal with backend mutation
    - Connect form submission to grantImageCredits mutation
    - Handle validation errors and display inline
    - Show success toast notification on completion
    - Refresh user data after successful grant
    - Handle network errors with retry option
    - _Requirements: 4.5, 3.5_

- [x] 6. Create credit history modal component
  - [x] 6.1 Build CreditHistoryModal component
    - Create modal dialog to display transaction history
    - Implement paginated transaction list
    - Display transaction type badges with color coding
    - Show timestamp, amount, and source for each transaction
    - Display admin notes for ADMIN_GRANT transactions
    - Add loading states and empty state handling
    - _Requirements: 3.3, 3.4_

  - [x] 6.2 Connect to getCreditHistory query
    - Fetch paginated credit transactions for selected user
    - Implement pagination controls (next/previous)
    - Handle loading and error states
    - Format timestamps and amounts for display
    - _Requirements: 3.3, 3.4_

- [x] 7. Build main user management page
  - [x] 7.1 Create UserManagementPage component
    - Build main page layout at `/admin/users`
    - Add page header with title and description
    - Include search bar for filtering users
    - Add filter controls for activity level
    - Add sort dropdown (join date, activity, username)
    - Display quick stats cards (total users, active users, etc.)
    - Integrate UserListTable component
    - Add pagination controls
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2_

  - [x] 7.2 Implement search and filter functionality
    - Connect search input to listUsers query with debouncing (300ms)
    - Implement activity level filter dropdown
    - Add sort option selector
    - Update query parameters when filters change
    - Maintain filter state in URL query params
    - Handle real-time updates without page reload
    - _Requirements: 1.4, 1.5, 5.2, 5.5_

  - [x] 7.3 Add pagination controls
    - Implement pagination using Convex pagination API
    - Add next/previous buttons
    - Display current page info (showing X-Y of Z users)
    - Handle page navigation with loading states
    - Maintain filters and sort when paginating
    - _Requirements: 1.1_

- [x] 8. Create user statistics card component
  - [x] 8.1 Build UserStatsCard component
    - Create card component to display aggregated statistics
    - Show total wizards created
    - Display multiplayer duel stats with win/loss breakdown
    - Show campaign battle stats with completion status
    - Display last activity timestamp
    - Add activity level indicator
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 5.4_

  - [x] 8.2 Integrate with user statistics query
    - Fetch statistics when user row is expanded or viewed
    - Implement lazy loading to optimize performance
    - Handle loading and error states
    - Cache statistics data appropriately
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 9. Update admin navigation and dashboard
  - [x] 9.1 Add user management link to AdminNavigation
    - Add "Users" navigation item to AdminNavigation component
    - Use Users icon from lucide-react
    - Position between "Platform Stats" and "Dev Tools"
    - Highlight active state when on user management page
    - _Requirements: 6.1_

  - [x] 9.2 Add user management card to admin dashboard
    - Add new card to admin dashboard home page
    - Include quick stats (total users, users with 0 credits)
    - Add link to `/admin/users` page
    - Use appropriate icon and color scheme
    - _Requirements: 1.1, 5.3_

- [x] 10. Implement user detail actions
  - [x] 10.1 Add view profile functionality
    - Implement click handler to navigate to user's public profile
    - Open profile in new tab or same tab based on user preference
    - Pass user's userId to profile route
    - _Requirements: 6.1, 6.2_

  - [x] 10.2 Add grant credits action button
    - Add "Grant Credits" button to each user row
    - Open GrantCreditsModal when clicked
    - Pass user information to modal
    - Refresh user list after successful grant
    - _Requirements: 4.1, 4.5_

  - [x] 10.3 Add view credit history action
    - Add "View Credits" button or link to user row
    - Open CreditHistoryModal when clicked
    - Pass userId to modal for transaction fetching
    - _Requirements: 3.3, 3.4_

- [x] 11. Add error handling and loading states
  - [x] 11.1 Implement error boundaries
    - Add error boundary component for user management page
    - Handle authorization errors with redirect to home
    - Display user-friendly error messages
    - Add retry buttons for recoverable errors
    - _Requirements: 1.1, 1.2_

  - [x] 11.2 Add loading states
    - Implement skeleton loaders for user list table
    - Add loading spinners for modals and actions
    - Show loading state during pagination
    - Display loading indicator during search/filter
    - _Requirements: 1.1, 1.2_

- [x] 12. Implement responsive design
  - [x] 12.1 Make table responsive
    - Implement responsive table layout for desktop
    - Create card-based layout for mobile devices
    - Collapse less important columns on tablet
    - Add expandable rows for detailed information on mobile
    - _Requirements: 1.1, 1.2_

  - [x] 12.2 Optimize modals for mobile
    - Make modals full-screen on mobile devices
    - Ensure form inputs are touch-friendly
    - Add proper keyboard handling for mobile
    - _Requirements: 4.1, 3.3_

- [ ]\* 13. Add comprehensive testing
  - [x] 13.1 Write backend function tests
    - Test listUsers query with various filters and sort options
    - Test getUserStatistics calculation accuracy
    - Test grantImageCredits mutation with validation
    - Test getCreditHistory pagination
    - Test admin authorization checks
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]\* 13.2 Write component integration tests
    - Test UserListTable rendering and interactions
    - Test GrantCreditsModal form validation and submission
    - Test CreditHistoryModal data display
    - Test search and filter functionality
    - Test pagination controls
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]\* 13.3 Write end-to-end tests
    - Test complete user management workflow
    - Test search for specific user
    - Test grant credits end-to-end
    - Test view credit history
    - Test filter by activity level
    - Test admin authorization flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_
