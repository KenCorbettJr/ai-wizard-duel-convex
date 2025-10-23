# Time-Based Leaderboards Feature

## Overview

The leaderboard system now supports time-based filtering to highlight top wizards for different periods:

- **All Time**: Traditional leaderboard showing overall performance
- **This Month**: Top wizards based on duels completed in the last 30 days
- **This Week**: Top wizards based on duels completed in the last 7 days

## Implementation Details

### Backend Changes

#### Schema Updates

- Added `completedAt` field to the `duels` table to track when duels are completed
- Added index `by_completed_at` for efficient time-based queries

#### New Query Function

- `getWizardLeaderboardByPeriod`: Replaces the original leaderboard query with time period support
- Supports `period` parameter: "all", "week", or "month"
- Calculates period-specific win/loss stats while maintaining overall stats

#### Duel Completion Tracking

- Updated duel completion logic to set `completedAt` timestamp when status changes to "COMPLETED"

### Frontend Changes

#### UI Updates

- Added time period selection buttons (All Time, This Month, This Week)
- Enhanced wizard cards to show period-specific stats
- Special highlighting for top 3 wizards in weekly/monthly views
- Added "Week Champion" and "Month Champion" badges for #1 wizards

#### Visual Enhancements

- Animated crown icon for weekly/monthly #1 wizards
- Gradient backgrounds for top 3 positions in time-based leaderboards
- Period-specific stat labels (e.g., "Weekly Win Rate", "Monthly Wins")

## Usage

### API Usage

```typescript
// Get all-time leaderboard
const allTime = await ctx.query(api.wizards.getWizardLeaderboardByPeriod, {
  period: "all",
  limit: 50,
  minDuels: 1,
});

// Get weekly leaderboard
const weekly = await ctx.query(api.wizards.getWizardLeaderboardByPeriod, {
  period: "week",
  limit: 25,
  minDuels: 1,
});
```

### Frontend Usage

The leaderboard page automatically switches between time periods based on user selection. Each wizard card displays:

- Period-appropriate win rate
- Period-specific wins/losses/total duels
- Special highlighting for top performers

## Data Structure

Each wizard in the leaderboard response includes:

```typescript
{
  // Standard wizard fields
  _id: string,
  name: string,
  description: string,
  // ... other wizard fields

  // Overall stats (always present)
  wins: number,
  losses: number,
  winRate: number,
  totalDuels: number,

  // Period-specific stats
  periodWins: number,
  periodLosses: number,
  periodWinRate: number,
  periodTotalDuels: number,

  // Ranking
  rank: number,

  // Owner info
  ownerUserId?: string,
  ownerDisplayName?: string
}
```

## Performance Considerations

- Time-based queries use the `by_completed_at` index for efficient filtering
- Period calculations are done in-memory after fetching relevant duels
- Results are limited to prevent excessive computation

## Future Enhancements

Potential improvements could include:

- Cached leaderboard calculations for better performance
- Additional time periods (e.g., "This Year", "Last 7 days")
- Leaderboard history tracking
- Push notifications for leaderboard position changes
