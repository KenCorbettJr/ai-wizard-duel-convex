# Requirements Document

## Introduction

This feature adds user profiles with custom user IDs (similar to Twitter handles) to the AI Wizard Duel application. Users will be able to create unique identifiers during signup, have public profile pages showcasing their wizards, and all wizards will display their owner's user ID for better attribution and discoverability.

## Requirements

### Requirement 1

**User Story:** As a new user, I want to create a unique user ID during signup, so that I can have a personalized identifier in the game.

#### Acceptance Criteria

1. WHEN a user signs up THEN the system SHALL prompt them to create a unique user ID
2. WHEN a user enters a user ID THEN the system SHALL validate it follows the format rules (alphanumeric, underscores, hyphens, 3-20 characters)
3. WHEN a user enters a user ID that already exists THEN the system SHALL display an error message and require a different ID
4. WHEN a user successfully creates a user ID THEN the system SHALL save it to their profile and make it immutable
5. IF a user tries to use invalid characters THEN the system SHALL display format requirements and prevent submission

### Requirement 2

**User Story:** As a user, I want to have a public profile page accessible via my user ID, so that others can discover my wizards and achievements.

#### Acceptance Criteria

1. WHEN someone visits /users/[userId] THEN the system SHALL display the user's public profile page
2. WHEN the profile page loads THEN the system SHALL show the user's display name, user ID, join date, and total wizard count
3. WHEN the profile page loads THEN the system SHALL display all wizards owned by that user in a grid layout
4. WHEN a user visits a non-existent user ID THEN the system SHALL display a 404 error page
5. WHEN the profile page loads THEN the system SHALL show user statistics (total duels, wins, losses)

### Requirement 3

**User Story:** As a user browsing wizards, I want to see the owner's user ID on each wizard, so that I can identify and visit the creator's profile.

#### Acceptance Criteria

1. WHEN viewing a wizard card THEN the system SHALL display the owner's user ID prominently
2. WHEN clicking on a user ID THEN the system SHALL navigate to that user's profile page
3. WHEN viewing wizard details THEN the system SHALL show the owner's user ID and display name
4. WHEN browsing the wizard gallery THEN the system SHALL show user IDs for all wizards consistently
5. WHEN viewing duel participants THEN the system SHALL display user IDs alongside wizard names

### Requirement 4

**User Story:** As a user, I want my user ID to be unique and permanent, so that others can reliably find and reference my profile.

#### Acceptance Criteria

1. WHEN a user ID is created THEN the system SHALL ensure it is globally unique across all users
2. WHEN a user tries to change their user ID THEN the system SHALL prevent the modification
3. WHEN checking user ID availability THEN the system SHALL perform case-insensitive validation
4. WHEN a user ID is reserved THEN the system SHALL maintain the exact case as entered by the user
5. IF a user attempts to create a user ID matching reserved words THEN the system SHALL reject it

### Requirement 5

**User Story:** As a user, I want to easily share my profile with others, so that I can showcase my wizards and achievements.

#### Acceptance Criteria

1. WHEN viewing my own profile THEN the system SHALL provide a shareable URL
2. WHEN sharing a profile URL THEN the system SHALL generate appropriate social media metadata
3. WHEN someone visits a shared profile link THEN the system SHALL display the profile with proper SEO tags
4. WHEN copying a profile URL THEN the system SHALL use the format /users/[userId]
5. WHEN viewing a profile THEN the system SHALL show social sharing buttons for major platforms
