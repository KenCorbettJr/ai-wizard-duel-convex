# Design Document

## Overview

The Single Player Campaign Mode extends the existing wizard dueling system to provide structured single-player adventures. The design leverages the current duel mechanics, wizard system, and AI-powered opponents while introducing new concepts like campaign progression, stages, and experience points. The campaign mode will be implemented as a new section of the application that reuses existing battle logic but provides a curated, progressive experience against AI opponents.

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
├── Campaign Map (Visual progression interface)
├── Stage Selection (Choose difficulty and opponents)
├── AI Opponent Generation (Dynamic AI wizard creation)
├── Campaign Battle Engine (Reuses existing duel system)
├── Progression System (Experience, unlocks, achievements)
└── Campaign Statistics (Progress tracking and analytics)
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

campaigns: defineTable({
  userId: v.string(), // Owner of the campaign progress
  currentStage: v.number(), // Current unlocked stage
  completedStages: v.array(v.number()), // Array of completed stage numbers
  totalExperience: v.number(), // Total XP earned across all wizards
  createdAt: v.number(),
  lastPlayedAt: v.number(),
}).index("by_user", ["userId"]),

campaignStages: defineTable({
  stageNumber: v.number(), // Sequential stage identifier
  name: v.string(), // Display name for the stage
  description: v.string(), // Stage description
  difficulty: v.union(v.literal("EASY"), v.literal("MEDIUM"), v.literal("HARD"), v.literal("EXPERT")),
  requiredStage: v.optional(v.number()), // Previous stage required to unlock
  experienceReward: v.number(), // XP awarded for completion
  specialConditions: v.optional(v.object({
    modifiedHealth: v.optional(v.number()),
    roundLimit: v.optional(v.number()),
    environmentalEffect: v.optional(v.string()),
  })),
  aiOpponentTemplate: v.object({
    namePattern: v.string(), // Template for generating AI names
    descriptionPattern: v.string(), // Template for AI descriptions
    personalityTraits: v.array(v.string()), // AI behavior characteristics
    spellStyle: v.string(), // AI spell casting style
  }),
}).index("by_stage_number", ["stageNumber"]),

campaignBattles: defineTable({
  userId: v.string(),
  campaignId: v.id("campaigns"),
  stageNumber: v.number(),
  duelId: v.id("duels"), // Links to existing duel system
  playerWizardId: v.id("wizards"),
  aiOpponentId: v.id("wizards"), // AI-generated opponent
  status: v.union(v.literal("IN_PROGRESS"), v.literal("WON"), v.literal("LOST")),
  experienceEarned: v.number(),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_user_campaign", ["userId", "campaignId"])
  .index("by_duel", ["duelId"]),

wizardExperience: defineTable({
  wizardId: v.id("wizards"),
  userId: v.string(),
  totalExperience: v.number(),
  campaignWins: v.number(),
  campaignLosses: v.number(),
  lastCampaignBattle: v.optional(v.number()),
}).index("by_wizard", ["wizardId"])
  .index("by_user", ["userId"]),
```

### Frontend Components

#### Campaign Map Component

```typescript
// src/components/CampaignMap.tsx
interface CampaignMapProps {
  userCampaign: Campaign;
  availableStages: CampaignStage[];
  onStageSelect: (stage: CampaignStage) => void;
}

// Features:
// - Visual representation of campaign progression
// - Locked/unlocked stage indicators
// - Stage difficulty and reward display
// - Progress percentage visualization
```

#### Stage Selection Component

```typescript
// src/components/StageSelection.tsx
interface StageSelectionProps {
  stage: CampaignStage;
  userWizards: Wizard[];
  onWizardSelect: (wizardId: Id<"wizards">) => void;
  onStartBattle: () => void;
}

// Features:
// - Stage information display
// - Wizard selection interface
// - Special conditions explanation
// - Battle initiation
```

#### AI Opponent Generator

```typescript
// src/components/AIOpponentCard.tsx
interface AIOpponentCardProps {
  opponent: Wizard;
  stage: CampaignStage;
  isRevealed: boolean;
}

// Features:
// - Dynamic AI opponent display
// - Personality trait visualization
// - Difficulty indicator
// - Mysterious reveal animation
```

#### Campaign Statistics Dashboard

```typescript
// src/components/CampaignStats.tsx
interface CampaignStatsProps {
  userCampaign: Campaign;
  wizardExperience: WizardExperience[];
  recentBattles: CampaignBattle[];
}

// Features:
// - Overall progress tracking
// - Wizard experience display
// - Achievement showcase
// - Battle history
```

### Page Structure

```
src/app/campaign/
├── page.tsx                    // Campaign overview and map
├── layout.tsx                  // Campaign-specific layout
├── [stageId]/
│   ├── page.tsx               // Stage selection and preparation
│   └── battle/
│       └── [battleId]/
│           └── page.tsx       // Campaign battle (reuses duel UI)
└── stats/
    └── page.tsx               // Campaign statistics and achievements
```

### API Layer (Convex Functions)

#### Campaign Management

```typescript
// convex/campaigns.ts

// Initialize user campaign progress
export const initializeCampaign = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Create initial campaign record
    // Unlock first stage
    // Return campaign data
  },
});

// Get user's campaign progress
export const getUserCampaign = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Return campaign progress, unlocked stages, statistics
  },
});

// Complete a campaign stage
export const completeStage = mutation({
  args: {
    userId: v.string(),
    stageNumber: v.number(),
    experienceEarned: v.number(),
  },
  handler: async (ctx, args) => {
    // Update campaign progress
    // Unlock next stage
    // Award experience points
    // Update wizard statistics
  },
});
```

#### AI Opponent Generation

```typescript
// convex/aiOpponents.ts

// Generate AI opponent for a stage
export const generateAIOpponent = mutation({
  args: {
    stageNumber: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, { stageNumber, userId }) => {
    // Get stage template
    // Generate unique AI wizard
    // Create wizard record with isAIPowered: true
    // Return AI opponent data
  },
});

// Get AI spell strategy for campaign battles
export const getAISpellStrategy = query({
  args: {
    aiWizardId: v.id("wizards"),
    roundNumber: v.number(),
    battleContext: v.object({
      playerSpells: v.array(v.string()),
      currentHealth: v.number(),
      opponentHealth: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Generate contextual AI spell based on personality and situation
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
    userId: v.string(),
    stageNumber: v.number(),
    playerWizardId: v.id("wizards"),
  },
  handler: async (ctx, args) => {
    // Generate AI opponent
    // Create duel using existing system
    // Create campaign battle record
    // Link battle to campaign progress
  },
});

// Process campaign battle completion
export const completeCampaignBattle = mutation({
  args: {
    battleId: v.id("campaignBattles"),
    won: v.boolean(),
  },
  handler: async (ctx, { battleId, won }) => {
    // Update battle status
    // Award experience if won
    // Update campaign progress
    // Update wizard statistics
  },
});
```

## Data Models

### Campaign Progression Model

```typescript
interface Campaign {
  _id: Id<"campaigns">;
  userId: string;
  currentStage: number;
  completedStages: number[];
  totalExperience: number;
  createdAt: number;
  lastPlayedAt: number;
}
```

### Campaign Stage Model

```typescript
interface CampaignStage {
  _id: Id<"campaignStages">;
  stageNumber: number;
  name: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  requiredStage?: number;
  experienceReward: number;
  specialConditions?: {
    modifiedHealth?: number;
    roundLimit?: number;
    environmentalEffect?: string;
  };
  aiOpponentTemplate: {
    namePattern: string;
    descriptionPattern: string;
    personalityTraits: string[];
    spellStyle: string;
  };
}
```

### AI Opponent Generation Model

```typescript
interface AIOpponentTemplate {
  namePattern: string; // e.g., "The {adjective} {title}"
  descriptionPattern: string; // e.g., "A {personality} wizard who {behavior}"
  personalityTraits: string[]; // ["aggressive", "defensive", "cunning"]
  spellStyle: string; // "elemental", "illusion", "necromancy"
}
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
