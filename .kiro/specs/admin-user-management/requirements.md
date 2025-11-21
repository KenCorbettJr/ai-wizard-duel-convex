# Requirements Document

## Introduction

This feature adds a comprehensive user management interface to the admin area of AI Wizard Duel. Administrators will be able to view all users, monitor their activity statistics (wizards created, duels participated in), and manage user resources such as image credits. This provides administrators with the tools needed to support users, monitor platform health, and handle customer service requests.

## Glossary

- **Admin Dashboard**: The administrative interface accessible only to users with admin or super_admin roles
- **User Management System**: The collection of interfaces and backend functions for viewing and managing user data
- **Image Credits**: The currency system that allows users to generate AI illustrations for wizards and duels
- **Duel Statistics**: Aggregated data about user participation in multiplayer duels
- **Campaign Statistics**: Aggregated data about user participation in single-player campaign battles

## Requirements

### Requirement 1

**User Story:** As an admin, I want to view a comprehensive list of all users in the system, so that I can monitor platform usage and identify users who may need support.

#### Acceptance Criteria

1. WHEN an admin navigates to the user management page, THE Admin Dashboard SHALL display a paginated list of all users
2. WHEN the user list loads, THE Admin Dashboard SHALL show each user's display name, user ID, email, and join date
3. WHEN the user list loads, THE Admin Dashboard SHALL display the total number of registered users
4. WHEN an admin views the user list, THE Admin Dashboard SHALL provide search functionality to filter users by name, user ID, or email
5. WHEN an admin views the user list, THE Admin Dashboard SHALL provide sorting options for join date, activity level, and username

### Requirement 2

**User Story:** As an admin, I want to see detailed statistics for each user including wizard count and duel participation, so that I can understand user engagement levels.

#### Acceptance Criteria

1. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the total number of wizards created by that user
2. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the total number of multiplayer duels the user has participated in
3. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the total number of campaign battles the user has completed
4. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the user's win/loss record for multiplayer duels
5. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the user's campaign progression statistics

### Requirement 3

**User Story:** As an admin, I want to view and manage a user's image credit balance, so that I can provide customer support and resolve billing issues.

#### Acceptance Criteria

1. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the user's current image credit balance
2. WHEN viewing a user in the list, THE Admin Dashboard SHALL display the user's subscription tier
3. WHEN an admin clicks on a user's credit balance, THE Admin Dashboard SHALL show a detailed credit usage history
4. WHEN viewing credit history, THE Admin Dashboard SHALL display timestamps, amounts, and reasons for each credit transaction
5. WHEN viewing a user's credits, THE Admin Dashboard SHALL provide a button to manually adjust the credit balance

### Requirement 4

**User Story:** As an admin, I want to grant additional image credits to specific users, so that I can resolve customer service issues and provide promotional credits.

#### Acceptance Criteria

1. WHEN an admin clicks the grant credits button, THE Admin Dashboard SHALL display a modal dialog for credit adjustment
2. WHEN the credit adjustment modal opens, THE Admin Dashboard SHALL show the user's current credit balance
3. WHEN an admin enters a credit amount, THE Admin Dashboard SHALL validate that the amount is a positive integer
4. WHEN an admin enters a credit amount, THE Admin Dashboard SHALL require a reason or note for the adjustment
5. WHEN an admin confirms the credit grant, THE Admin Dashboard SHALL update the user's balance and log the transaction with the admin's identity and reason

### Requirement 5

**User Story:** As an admin, I want to quickly identify highly active users and users who may need assistance, so that I can proactively support the community.

#### Acceptance Criteria

1. WHEN viewing the user list, THE Admin Dashboard SHALL highlight users with zero wizards or duels as potentially inactive
2. WHEN viewing the user list, THE Admin Dashboard SHALL provide filters for activity levels (inactive, low, medium, high)
3. WHEN viewing the user list, THE Admin Dashboard SHALL display users with depleted image credits prominently
4. WHEN viewing the user list, THE Admin Dashboard SHALL show the last activity date for each user
5. WHEN an admin applies filters, THE Admin Dashboard SHALL update the user list in real-time without page reload

### Requirement 6

**User Story:** As an admin, I want to access detailed user profiles from the management interface, so that I can investigate issues and view complete user information.

#### Acceptance Criteria

1. WHEN an admin clicks on a user in the list, THE Admin Dashboard SHALL navigate to that user's public profile page
2. WHEN viewing a user's details, THE Admin Dashboard SHALL provide a link to view all of the user's wizards
3. WHEN viewing a user's details, THE Admin Dashboard SHALL provide a link to view all of the user's duels
4. WHEN viewing a user's details, THE Admin Dashboard SHALL display the user's role (user, admin, super_admin)
5. WHEN viewing a user's details, THE Admin Dashboard SHALL show account status information (active, suspended, etc.)
