# Design Document

## Overview

The Single Player Campaign Mode provides a linear progression system where each player wizard faces 10 unique AI-powered wizard opponents in sequence. Each wizard maintains their own individual campaign progress, and upon defeating all 10 opponents, the wizard receives a permanent +1 luck boost relic. The design leverages existing duel mechanics while introducing campaign-specific progression tracking, AI opponent definitions, and relic rewards. Campaign battles are isolated from multiplayer statistics and leaderboards.

## Architecture

### High-Level Architecture

The campaign system follows the existing application architecture patterns:

- **Frontend**: Next.js 13+ App Router with React components
- **Backend**: Convex database and mutations/queries
- **State Management**: Convex real-time subscriptions
- **UI Components**: Shadcn/ui component library
- **Authentication**: Clerk for user management

### Campaign System Components

```
Campaign System
├── Linear Progression Interface (10 AI wizard opponents)
├── Wizard Selection (Choose which wizard to progress)
├── Predefined AI Opponents (10 unique AI wizards with increasing difficulty)
├── Campaign Battle Engine (Isolated from multiplayer statistics)
├── Individual Wizard Progress (Per-wizard campaign tracking)
├── Relic Reward System (Permanent luck boost for completion)
└── Campaign Statistics (Progress tracking per wizard)
```

### Integration with Existing Systems

The campaign mode integrates with existing systems:

- **Wizard System**: Uses player's existing wizards
- **Duel Engine**: Reuses battle mechanics and round processing
- **AI System**: Extends existing AI-powered wizard functionality
- **Statistics**: Integrates with existing wizard win/loss tracking

## Components and Interfaces

### Database Schema Extensions

```typescript
// New tables to add to convex/schema.ts

// Predefined AI opponents (seeded data)
campaignOpponents: defineTable({
  opponentNumber: v.number(), // 1-10 sequence position
  name: v.string(), // Unique AI wizard name
  description: v.string(), // AI wizard background story
  personalityTraits: v.array(v.string()), // AI behavior characteristics
  spellStyle: v.string(), // AI magical specialization
  difficulty: v.union(v.literal("BEGINNER"), v.literal("INTERMEDIATE"), v.literal("ADVANCED")),
  luckModifier: v.number(), // -2 for beginner, 0 for intermediate, +2 for advanced
  illustrationPrompt: v.string(), // AI image generation prompt
}).index("by_opponent_number", ["opponentNumber"]),

// Individual wizard campaign progress
wizardCampaignProgress: defineTable({
  wizardId: v.id("wizards"),
  userId: v.string(),
  currentOpponent: v.number(), // Next opponent to face (1-10, or 11 if completed)
  defeatedOpponents: v.array(v.number()), // Array of defeated opponent numbers
  hasCompletionRelic: v.boolean(), // Whether wizard earned the +1 luck relic
  createdAt: v.number(),
  lastBattleAt: v.optional(v.number()),
}).index("by_wizard", ["wizardId"])
  .index("by_user", ["userId"]),

// Campaign battle records (separate from multiplayer duels)
campaignBattles: defineTable({
  wizardId: v.id("wizards"),
  userId: v.string(),
  opponentNumber: v.number(),
  duelId: v.id("duels"), // Links to duel system but marked as campaign
  status: v.union(v.literal("IN_PROGRESS"), v.literal("WON"), v.literal("LOST")),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_wizard", ["wizardId"])
  .index("by_duel", ["duelId"])
  .index("by_user_opponent", ["userId", "opponentNumber"]),

// Extend existing duels table with campaign flag
// Add to existing duels schema:
// isCampaignBattle: v.optional(v.boolean()), // Excludes from leaderboards and watchable duels
```

### Frontend Components

#### Campaign Progression Component

```typescript
// src/components/CampaignProgression.tsx
interface CampaignProgressionProps {
  campaignOpponents: CampaignOpponent[];
  userWizards: WizardWithProgress[];
  onOpponentSelect: (opponentNumber: number) => void;
}

// Features:
// - Linear display of 10 AI opponents
// - Per-wizard progress indicators
// - Opponent difficulty and characteristics
// - Relic completion badges
```

#### Wizard Selection Component

```typescript
// src/components/CampaignWizardSelection.tsx
interface CampaignWizardSelectionProps {
  wizards: WizardWithProgress[];
  selectedOpponent: CampaignOpponent;
  onWizardSelect: (wizardId: Id<"wizards">) => void;
  onStartBattle: () => void;
}

// Features:
// - Wizard list with campaign progress
// - Next available opponent display
// - Relic status indicators
// - Battle initiation for selected wizard
```

#### AI Opponent Display

```typescript
// src/components/CampaignOpponentCard.tsx
interface CampaignOpponentCardProps {
  opponent: CampaignOpponent;
  isUnlocked: boolean;
  isDefeated: boolean;
}

// Features:
// - Predefined AI opponent information
// - Difficulty and luck modifier display
// - Personality trait visualization
// - Lock/unlock status indicators
```

#### Relic Display Component

```typescript
// src/components/CampaignRelicBadge.tsx
interface CampaignRelicBadgeProps {
  wizard: Wizard;
  hasRelic: boolean;
  effectiveLuckScore: number;
}

// Features:
// - Relic completion indicator
// - Luck boost visualization
// - Special completion badge
// - Tooltip with relic benefits
```

#### Campaign Statistics Dashboard

```typescript
// src/components/CampaignStats.tsx
interface CampaignStatsProps {
  wizardProgress: WizardCampaignProgress[];
  campaignOpponents: CampaignOpponent[];
  recentBattles: CampaignBattle[];
}

// Features:
// - Per-wizard progress tracking
// - Completion statistics
// - Relic achievement showcase
// - Battle history per wizard
```

### Page Structure

```
src/app/campaign/
├── page.tsx                    // Campaign overview with 10 AI opponents
├── layout.tsx                  // Campaign-specific layout
├── wizard-selection/
│   └── [opponentNumber]/
│       └── page.tsx           // Select wizard for specific opponent
├── battle/
│   └── [battleId]/
│       └── page.tsx           // Campaign battle (reuses duel UI with campaign flag)
└── stats/
    └── page.tsx               // Campaign statistics per wizard
```

### API Layer (Convex Functions)

#### Campaign Management

```typescript
// convex/campaigns.ts

// Get all campaign opponents (seeded data)
export const getCampaignOpponents = query({
  args: {},
  handler: async (ctx) => {
    // Return all 10 predefined AI opponents in order
  },
});

// Get wizard's campaign progress
export const getWizardCampaignProgress = query({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    // Return wizard's current opponent, defeated opponents, relic status
  },
});

// Get all user's wizard campaign progress
export const getUserCampaignProgress = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Return campaign progress for all user's wizards
  },
});

// Complete a campaign opponent
export const defeatOpponent = mutation({
  args: {
    wizardId: v.id("wizards"),
    opponentNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Update wizard's campaign progress
    // Add to defeated opponents
    // Advance to next opponent or award relic if completed
    // Update wizard's luck if relic earned
  },
});
```

#### AI Opponent Management

```typescript
// convex/campaignOpponents.ts

// Create AI wizard instance for battle
export const createCampaignAIWizard = mutation({
  args: {
    opponentNumber: v.number(),
    battleId: v.string(), // Unique identifier for this battle instance
  },
  handler: async (ctx, { opponentNumber, battleId }) => {
    // Get predefined opponent data
    // Create temporary AI wizard instance for this battle
    // Apply luck modifiers based on difficulty
    // Return AI wizard with campaign-specific attributes
  },
});

// Get AI spell strategy for campaign battles
export const getCampaignAISpellStrategy = query({
  args: {
    opponentNumber: v.number(),
    roundNumber: v.number(),
    battleContext: v.object({
      playerSpells: v.array(v.string()),
      currentHealth: v.number(),
      opponentHealth: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Get opponent personality and spell style
    // Generate contextual AI spell based on difficulty level
    // Apply luck modifiers to spell effectiveness
    // Return spell description and strategy
  },
});
```

#### Campaign Battle Integration

```typescript
// convex/campaignBattles.ts

// Start a campaign battle
export const startCampaignBattle = mutation({
  args: {
    wizardId: v.id("wizards"),
    opponentNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate wizard can face this opponent
    // Create AI wizard instance for battle
    // Create duel with isCampaignBattle: true flag
    // Create campaign battle record
    // Return battle ID for navigation
  },
});

// Process campaign battle completion
export const completeCampaignBattle = mutation({
  args: {
    campaignBattleId: v.id("campaignBattles"),
    won: v.boolean(),
  },
  handler: async (ctx, { campaignBattleId, won }) => {
    // Update campaign battle status
    // If won, update wizard's campaign progress
    // Check if wizard completed all 10 opponents
    // Award relic and luck boost if campaign completed
    // Do NOT update multiplayer statistics
  },
});

// Check if wizard earned campaign relic
export const checkCampaignCompletion = mutation({
  args: { wizardId: v.id("wizards") },
  handler: async (ctx, { wizardId }) => {
    // Check if wizard defeated all 10 opponents
    // Award +1 luck relic if completed
    // Update wizard's effective luck score (max 20)
    // Mark wizard as having completion relic
  },
});
```

## Data Models

### Campaign Opponent Model

```typescript
interface CampaignOpponent {
  _id: Id<"campaignOpponents">;
  opponentNumber: number; // 1-10
  name: string; // e.g., "Zephyr the Storm Caller"
  description: string; // Background story and personality
  personalityTraits: string[]; // ["aggressive", "elemental", "unpredictable"]
  spellStyle: string; // "storm magic", "illusion", "necromancy"
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  luckModifier: number; // -2, 0, or +2
  illustrationPrompt: string; // For AI image generation
}
```

### Wizard Campaign Progress Model

```typescript
interface WizardCampaignProgress {
  _id: Id<"wizardCampaignProgress">;
  wizardId: Id<"wizards">;
  userId: string;
  currentOpponent: number; // 1-10, or 11 if completed
  defeatedOpponents: number[]; // Array of defeated opponent numbers
  hasCompletionRelic: boolean; // Whether wizard earned +1 luck relic
  createdAt: number;
  lastBattleAt?: number;
}
```

### Campaign Battle Model

```typescript
interface CampaignBattle {
  _id: Id<"campaignBattles">;
  wizardId: Id<"wizards">;
  userId: string;
  opponentNumber: number;
  duelId: Id<"duels">; // Links to duel system
  status: "IN_PROGRESS" | "WON" | "LOST";
  completedAt?: number;
  createdAt: number;
}
```

### Extended Wizard Model

```typescript
// Extension to existing wizard model
interface WizardWithCampaignData extends Wizard {
  campaignProgress?: WizardCampaignProgress;
  effectiveLuckScore: number; // Base luck + relic bonus (max 20)
  hasCompletionRelic: boolean;
}
```

### Predefined Campaign Opponents Data

```typescript
// Seeded data for the 10 campaign opponents
const CAMPAIGN_OPPONENTS = [
  // Beginner (1-3): Luck penalty -2
  {
    opponentNumber: 1,
    name: "Pip the Apprentice",
    difficulty: "BEGINNER",
    luckModifier: -2,
    // ... other properties
  },
  {
    opponentNumber: 2,
    name: "Bumbling Boris",
    difficulty: "BEGINNER",
    luckModifier: -2,
    // ... other properties
  },
  {
    opponentNumber: 3,
    name: "Nervous Nellie",
    difficulty: "BEGINNER",
    luckModifier: -2,
    // ... other properties
  },
  // Intermediate (4-7): Standard luck
  {
    opponentNumber: 4,
    name: "Steady Sam",
    difficulty: "INTERMEDIATE",
    luckModifier: 0,
    // ... other properties
  },
  // ... opponents 5-7
  // Advanced (8-10): Luck bonus +2
  {
    opponentNumber: 8,
    name: "Archmage Vex",
    difficulty: "ADVANCED",
    luckModifier: 2,
    // ... other properties
  },
  // ... opponents 9-10
];
```

## Error Handling

### Campaign-Specific Error Scenarios

1. **Stage Progression Errors**
   - Attempting to access locked stages
   - Invalid stage transitions
   - Missing prerequisite completions

2. **Battle Integration Errors**
   - AI opponent generation failures
   - Duel system integration issues
   - Experience calculation errors

3. **Data Consistency Errors**
   - Campaign progress synchronization
   - Wizard experience tracking
   - Battle result recording

### Error Recovery Strategies

- **Graceful Degradation**: Show cached campaign data when real-time updates fail
- **Retry Mechanisms**: Automatic retry for AI generation and battle creation
- **Fallback Content**: Default AI opponents when generation fails
- **Progress Recovery**: Ability to restore campaign progress from battle history

## Testing Strategy

### Unit Testing

- Campaign progression logic
- AI opponent generation algorithms
- Experience calculation functions
- Stage unlock validation

### Integration Testing

- Campaign battle flow with existing duel system
- AI opponent integration with battle mechanics
- Experience point integration with wizard statistics
- Navigation flow between campaign components

### End-to-End Testing

- Complete campaign stage progression
- Battle initiation and completion flow
- AI opponent behavior in battles
- Progress persistence across sessions

### Performance Testing

- AI opponent generation speed
- Campaign map rendering with many stages
- Battle history query performance
- Real-time updates during campaign battles

## Security Considerations

### Data Validation

- Validate stage progression requirements
- Prevent experience point manipulation
- Verify wizard ownership for campaign battles
- Sanitize AI-generated content

### Access Control

- Ensure users can only access their own campaign progress
- Validate stage unlock requirements server-side
- Prevent unauthorized battle creation
- Protect AI opponent generation from abuse

### Rate Limiting

- Limit AI opponent generation requests
- Throttle campaign battle creation
- Control experience point award frequency
- Prevent rapid stage progression attempts

## Performance Optimizations

### Database Optimization

- Index campaign tables for efficient queries
- Batch experience point updates
- Cache frequently accessed stage data
- Optimize AI opponent queries

### Frontend Optimization

- Lazy load campaign stages
- Cache AI opponent data
- Optimize campaign map rendering
- Preload next stage content

### AI Generation Optimization

- Cache common AI opponent patterns
- Batch AI generation requests
- Optimize spell strategy calculations
- Reuse AI personalities across stages

## Deployment Considerations

### Database Migration

- Add new campaign tables to schema
- Populate initial campaign stages
- Create default AI opponent templates
- Set up proper indexes

### Feature Rollout

- Gradual rollout to existing users
- A/B testing for campaign difficulty
- Monitor AI opponent performance
- Track user engagement metrics

### Monitoring and Analytics

- Campaign completion rates
- Stage difficulty analysis
- AI opponent effectiveness
- User progression patterns
