# Implementation Plan

- [x] 1. Extend database schema and backend functions for user profiles
  - Add userId, displayName, and profileCreatedAt fields to users table schema
  - Create new index for userId lookups in schema
  - Implement user ID validation utility functions
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Create user profile management backend functions
  - [x] 2.1 Implement user ID availability checking function
    - Write query to check if userId is available (case-insensitive)
    - Add validation for format rules (3-20 chars, alphanumeric + underscore/hyphen)
    - Include reserved word checking logic
    - Return availability status and suggestions for taken handles
    - _Requirements: 1.2, 1.3, 4.1, 4.3, 4.4, 4.5_

  - [x] 2.2 Implement user ID assignment mutation
    - Create mutation to set userId and displayName for authenticated user
    - Ensure userId is only set once (immutable after creation)
    - Update profileCreatedAt timestamp
    - Validate format and availability before assignment
    - _Requirements: 1.1, 1.4, 4.2, 4.4_

  - [x] 2.3 Create public user profile query function
    - Write query to get user profile by userId
    - Calculate and return user statistics (total wizards, duels, win rate)
    - Include join date and display name information
    - Handle non-existent users gracefully
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 2.4 Create public user wizards query function
    - Write query to get all wizards owned by a specific userId
    - Include wizard statistics and illustration data
    - Filter to only show public wizard information
    - _Requirements: 2.3, 3.1_

- [ ]\* 2.5 Write unit tests for user profile backend functions
  - Test user ID validation logic with various inputs
  - Test availability checking with existing and new handles
  - Test profile creation and retrieval workflows
  - Test error handling for invalid inputs and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 4.1, 4.3, 4.4, 4.5_

- [x] 3. Create profile setup and onboarding components
  - [x] 3.1 Build ProfileSetupForm component
    - Create form with user ID input and real-time validation
    - Implement debounced availability checking
    - Add format validation with clear error messages
    - Include display name input field
    - Show loading states and success feedback
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 3.2 Create profile setup page route
    - Build /profile/setup page component
    - Integrate ProfileSetupForm with proper error handling
    - Add redirect logic after successful profile creation
    - Include onboarding messaging and instructions
    - _Requirements: 1.1, 1.4_

  - [x] 3.3 Update UserInitializer for profile flow
    - Modify UserInitializer to check for incomplete profiles
    - Add redirect logic to profile setup for users without userId
    - Ensure smooth integration with existing Clerk authentication
    - _Requirements: 1.1, 4.2_

- [ ] 4. Build public user profile pages
  - [x] 4.1 Create UserProfilePage component
    - Build main profile page layout with user information
    - Display user statistics (wizards, duels, win rate, join date)
    - Implement wizard grid display for user's wizards
    - Add loading states and error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Create dynamic route for user profiles
    - Build /users/[userId]/page.tsx with proper Next.js routing
    - Implement server-side data fetching for SEO
    - Add proper metadata generation for social sharing
    - Handle 404 cases for non-existent users
    - _Requirements: 2.1, 2.4, 5.2, 5.3_

  - [x] 4.3 Add SEO and social sharing metadata
    - Generate dynamic Open Graph tags for user profiles
    - Create proper page titles and descriptions
    - Add canonical URLs and structured data
    - Implement social sharing buttons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Create reusable user display components
  - [x] 5.1 Build UserIdDisplay component
    - Create component to show user handle with optional avatar
    - Add click handler to navigate to user profile
    - Support different sizes and display modes
    - Include fallback for users without handles
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Update wizard components to show owner information
    - Modify WizardCard component to display owner userId
    - Update wizard detail pages to show owner information
    - Add links from wizard owner to user profile
    - Ensure consistent display across all wizard views
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.3 Update duel components to show participant handles
    - Modify duel participant displays to show userIds
    - Update duel history and results to include owner handles
    - Add user profile links in duel interfaces
    - _Requirements: 3.5_

- [x] 6. Implement profile editing functionality
  - [x] 6.1 Create ProfileEditForm component
    - Build form to update display name and other editable fields
    - Show current userId as read-only (immutable)
    - Add validation and error handling
    - Include save confirmation and success feedback
    - _Requirements: 4.2_

  - [x] 6.2 Create profile edit page route
    - Build /profile/edit page for authenticated users
    - Integrate ProfileEditForm with proper access control
    - Add navigation back to profile after editing
    - _Requirements: 4.2_

  - [x] 6.3 Add profile edit backend mutation
    - Create mutation to update user display name and editable fields
    - Ensure userId cannot be modified after creation
    - Add proper authentication and authorization checks
    - _Requirements: 4.2_

- [x] 7. Update existing user flows and navigation
  - [x] 7.1 Add profile links to navigation and user menus
    - Update main navigation to include profile links
    - Add user profile option to user dropdown menu
    - Include "View Profile" and "Edit Profile" options
    - _Requirements: 2.1, 5.1_

  - [x] 7.2 Update wizard creation flow for new users
    - Ensure users complete profile setup before creating wizards
    - Add profile completion prompts where appropriate
    - Update wizard ownership attribution immediately
    - _Requirements: 1.1, 3.1_

  - [x] 7.3 Update duel creation flow for new users
    - Ensure users complete profile setup before creating duels
    - Add profile completion prompt to CreateDuelForm component
    - Integrate with useProfileCompletion hook for consistent UX
    - _Requirements: 1.1, 3.1_

  - [x] 7.3 Add migration handling for existing users
    - Create migration prompt for users without userIds
    - Add incentive messaging for profile completion
    - Ensure backward compatibility with existing user data
    - _Requirements: 4.2_

- [x] 8. Add comprehensive testing coverage
  - [x] 8.1 Write integration tests for profile workflows
    - Test complete user onboarding flow with profile setup
    - Test public profile page rendering with real data
    - Test user ID availability and assignment workflows
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ]\* 8.2 Write end-to-end tests for user profiles
    - Test new user signup and profile creation flow
    - Test public profile access and wizard display
    - Test profile editing and update workflows
    - Test wizard owner attribution display
    - _Requirements: 1.1, 2.1, 3.1, 4.2_
