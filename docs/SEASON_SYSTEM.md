# Campaign Season System

The AI Wizard Duel game now features a comprehensive season system that allows for time-limited campaigns with different opponents and rewards.

## Overview

The season system introduces:

- **Time-limited campaigns** with specific start and end dates
- **Different opponent sets** for variety (Classic, Elemental, Shadow, etc.)
- **Unique seasonal relics** as completion rewards
- **Season-specific progress tracking** for each wizard
- **Historical season records** for players

## Key Components

### Campaign Seasons (`campaignSeasons` table)

- **Name & Description**: Season branding and theme
- **Start/End Dates**: Time boundaries for the season
- **Status**: UPCOMING, ACTIVE, COMPLETED, ARCHIVED
- **Completion Relic**: Reward for completing all 10 opponents
- **Opponent Set**: Which set of opponents to use
- **Max Participants**: Optional limit on season participation

### Season Progress (`wizardCampaignProgress` table)

- Now includes `seasonId` to track progress per season
- Each wizard can have progress in multiple seasons
- Completion relics stack across seasons for cumulative luck bonuses

### Seasonal Opponents

- **Classic Set**: Original campaign opponents
- **Elemental Set**: Fire, water, earth, air themed wizards
- **Shadow Set**: Dark magic and nightmare themed opponents
- More sets can be added easily

## Admin Features

### Season Management (`/admin/seasons`)

- Create new seasons with custom themes and rewards
- Set start/end dates and participant limits
- Choose opponent sets and relic rewards
- Archive completed seasons
- View participation statistics

### Migration Support

- Automatic migration of existing campaign progress to default season
- Backward compatibility with existing data

## User Experience

### Season Information

- Current season display with time remaining
- Completion relic preview and description
- Personal progress tracking across wizards
- Historical season achievements

### Campaign Progress

- Season-aware progress tracking
- Multiple relic collection from different seasons
- Cumulative luck bonuses from all earned relics

## Technical Implementation

### Database Schema

```typescript
campaignSeasons: {
  name: string,
  description: string,
  startDate: number,
  endDate: number,
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
  completionRelic: {
    name: string,
    description: string,
    luckBonus: number,
    iconUrl?: string
  },
  opponentSet: string,
  maxParticipants?: number,
  isDefault?: boolean
}
```

### Key Functions

- `getActiveCampaignSeason()`: Get current active season
- `getUserCurrentSeasonProgress()`: Get user's progress in active season
- `getUserSeasonHistory()`: Get historical season participation
- `createCampaignSeason()`: Admin function to create new seasons
- `updateSeasonStatuses()`: Cron job to update season statuses

### Automatic Season Management

- Cron job runs hourly to update season statuses
- Seasons automatically transition from UPCOMING → ACTIVE → COMPLETED
- Manual archiving available for old seasons

## Usage Examples

### Creating a New Season

```typescript
await createCampaignSeason({
  name: "Season of Fire",
  description: "Face the elemental masters of fire and flame",
  startDate: Date.now() + 86400000, // Tomorrow
  endDate: Date.now() + 30 * 86400000, // 30 days
  completionRelic: {
    name: "Phoenix Feather",
    description: "Grants the power of rebirth in battle",
    luckBonus: 2,
  },
  opponentSet: "elemental",
});
```

### Adding New Opponent Sets

1. Add opponent data to `seasonalOpponents.ts`
2. Use `seedSeasonalOpponents()` to populate the database
3. Reference the set key when creating seasons

## Migration Guide

For existing installations:

1. Deploy the new schema and functions
2. Run the migration function via admin panel
3. Create a default season for ongoing campaigns
4. Existing progress will be preserved and linked to the default season

## Future Enhancements

- **Seasonal Leaderboards**: Rankings specific to each season
- **Limited-Time Events**: Special mini-seasons with unique rewards
- **Community Challenges**: Server-wide goals during seasons
- **Relic Trading**: Allow players to trade seasonal relics
- **Season Passes**: Premium rewards for season participation
