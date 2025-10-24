# Campaign Opponents Admin Page

The Campaign Opponents Admin Page (`/admin/campaign-opponents`) is a super admin-only interface for managing the 10 campaign opponents that players face in the single-player campaign mode.

## Access Requirements

- **Super Admin Only**: This page is protected by the `SuperAdminOnly` component
- Users must have super admin privileges to access this functionality
- Access is verified through the `api.duels.checkAdminAccess` query

## Features

### Overview Dashboard

- **Total Opponents**: Shows current count out of 10 required opponents
- **Difficulty Distribution**: Breakdown of Beginner/Intermediate/Advanced opponents
- **System Status**: Indicates if the campaign system is ready or needs setup

### Opponent Management

- **View All Opponents**: Grid display of all campaign opponents with details
- **Seed Default Opponents**: One-click button to populate all 10 standard opponents
- **Opponent Details**: Each card shows:
  - Opponent number and name
  - Difficulty level with color-coded badges
  - Luck modifier
  - Description
  - Spell style
  - Personality traits

## Backend Functions

### `seedCampaignOpponentsPublic`

- **Purpose**: Creates all 10 default campaign opponents
- **Access**: Super admin only
- **Returns**: Success status, message, and count of created opponents
- **Behavior**:
  - Checks if opponents already exist
  - Creates opponents from `CAMPAIGN_OPPONENTS_DATA`
  - Prevents duplicate seeding

### `getCampaignOpponents`

- **Purpose**: Retrieves all campaign opponents in order
- **Returns**: Array of opponent wizard documents
- **Sorting**: Automatically sorted by opponent number (1-10)

## Default Opponents Structure

The system includes 10 predefined opponents with progressive difficulty:

### Beginner (Opponents 1-3)

- **Luck Modifier**: -2 (easier)
- **Examples**: Pip the Apprentice, Bumbling Boris, Nervous Nellie

### Intermediate (Opponents 4-7)

- **Luck Modifier**: 0 (standard)
- **Examples**: Steady Sam, Mystic Marina, Firebrand Felix, Scholar Sage

### Advanced (Opponents 8-10)

- **Luck Modifier**: +2 (harder)
- **Examples**: Shadowweaver Vex, Stormcaller Zara, Archmage Eternus

## Usage Instructions

### Initial Setup

1. Navigate to `/admin/campaign-opponents`
2. If no opponents exist, click "Seed Default Opponents"
3. Verify all 10 opponents are created successfully

### Monitoring

- Check the dashboard cards for system status
- Ensure difficulty distribution is balanced (3-4-3)
- Verify all opponent numbers 1-10 are present

## Technical Details

### Data Storage

- Opponents are stored as wizard documents in the `wizards` table
- Special fields:
  - `isCampaignOpponent: true`
  - `owner: "campaign"`
  - `opponentNumber: 1-10`
  - Campaign-specific fields (difficulty, luckModifier, etc.)

### Integration

- Used by the campaign page to display the opponent fan
- Referenced by campaign progress tracking
- Required for campaign battles to function

### Error Handling

- Prevents duplicate opponent creation
- Validates super admin access
- Provides user-friendly error messages
- Graceful handling of missing data

## Security

- All mutations require super admin verification
- Access control enforced at both UI and API levels
- Audit trail through toast notifications
- Safe error handling without exposing sensitive data

## Future Enhancements

Potential additions to the admin interface:

- Individual opponent editing
- Custom opponent creation
- Bulk opponent deletion
- Opponent illustration management
- Campaign statistics and analytics
- A/B testing different opponent configurations
