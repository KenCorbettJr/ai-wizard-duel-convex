# Monetization System Design Document

## Overview

This document outlines the technical design for implementing a comprehensive monetization system in the AI Wizard Duel application. The system will support advertisement-based revenue for anonymous users, image generation credits with ad-based earning, unlimited dueling with tiered experiences, freemium subscriptions, premium features, cosmetic purchases, and tournament entry fees.

The design leverages ad networks for anonymous user monetization, Stripe for payment processing, extends the existing Convex database schema, and integrates seamlessly with the current Clerk authentication system.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[User Interface]
        B[Ad Components]
        C[Subscription Management]
        D[Payment Components]
        E[Usage Tracking]
        F[Image Credit System]
    end

    subgraph "Backend (Convex)"
        G[Ad Service]
        H[Image Credit Service]
        I[Subscription Service]
        J[Usage Limiter]
        K[Payment Webhooks]
        L[Analytics Service]
    end

    subgraph "External Services"
        M[Ad Networks]
        N[Stripe API]
        O[Clerk Auth]
        P[AI Services]
    end

    A --> I
    B --> G
    B --> M
    C --> I
    D --> N
    F --> H
    I --> K
    K --> N
    J --> P
    I --> O
    L --> I
    G --> M
    H --> P
```

### Data Flow

1. **Anonymous Users**: See ads on wizard and duel pages, must register to participate in duels
2. **User Registration**: New users get free tier with 10 image credits by default
3. **Image Credit System**: Credits consumed for AI-generated duel images, replenishable via ads
4. **Usage Tracking**: All actions are tracked against user limits and credit balances
5. **Upgrade Flow**: Users can upgrade through Stripe Checkout for unlimited features
6. **Webhook Processing**: Stripe webhooks update subscription status
7. **Feature Gating**: Services check user tier and credit balance before allowing actions

## Components and Interfaces

### Database Schema Extensions

#### Users Table (New)

```typescript
users: defineTable({
  clerkId: v.string(), // Links to Clerk user
  subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
  subscriptionStatus: v.union(
    v.literal("ACTIVE"),
    v.literal("CANCELED"),
    v.literal("PAST_DUE"),
    v.literal("TRIALING"),
  ),
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  subscriptionEndsAt: v.optional(v.number()),
  imageCredits: v.number(), // Remaining image generation credits
  monthlyUsage: v.object({
    duelsPlayed: v.number(),
    wizardsCreated: v.number(),
    imageGenerations: v.number(),
    adsWatched: v.number(),
    resetDate: v.number(), // When usage resets
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_stripe_customer", ["stripeCustomerId"]);
```

#### Ad Interactions Table (New)

```typescript
adInteractions: defineTable({
  userId: v.optional(v.string()), // Null for anonymous users
  sessionId: v.string(), // Track anonymous sessions
  adType: v.union(
    v.literal("DISPLAY_BANNER"),
    v.literal("VIDEO_REWARD"),
    v.literal("INTERSTITIAL"),
  ),
  placement: v.union(
    v.literal("WIZARD_PAGE"),
    v.literal("DUEL_PAGE"),
    v.literal("CREDIT_REWARD"),
  ),
  action: v.union(
    v.literal("IMPRESSION"),
    v.literal("CLICK"),
    v.literal("COMPLETION"),
  ),
  revenue: v.optional(v.number()), // Revenue in cents
  adNetworkId: v.string(),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_session", ["sessionId"])
  .index("by_placement", ["placement"]);
```

#### Cosmetic Items Table (New)

```typescript
cosmeticItems: defineTable({
  name: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("SPELL_EFFECT"),
    v.literal("WIZARD_ACCESSORY"),
    v.literal("BACKGROUND"),
    v.literal("ANIMATION"),
  ),
  price: v.number(), // Price in cents
  rarity: v.union(
    v.literal("COMMON"),
    v.literal("RARE"),
    v.literal("EPIC"),
    v.literal("LEGENDARY"),
  ),
  previewImage: v.optional(v.string()),
  isActive: v.boolean(),
  premiumOnly: v.boolean(),
});
```

#### User Inventory Table (New)

```typescript
userInventory: defineTable({
  userId: v.string(), // Clerk ID
  itemId: v.id("cosmeticItems"),
  purchasedAt: v.number(),
  equipped: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_item", ["userId", "itemId"]);
```

#### Tournaments Table (New)

```typescript
tournaments: defineTable({
  name: v.string(),
  description: v.string(),
  entryFee: v.number(), // In cents, 0 for free tournaments
  prizePool: v.number(), // In cents
  maxParticipants: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(
    v.literal("UPCOMING"),
    v.literal("ACTIVE"),
    v.literal("COMPLETED"),
    v.literal("CANCELLED"),
  ),
  participants: v.array(v.string()), // User IDs
  winners: v.optional(
    v.array(
      v.object({
        userId: v.string(),
        position: v.number(),
        prize: v.number(),
      }),
    ),
  ),
});
```

#### Transactions Table (New)

```typescript
transactions: defineTable({
  userId: v.string(),
  type: v.union(
    v.literal("SUBSCRIPTION"),
    v.literal("COSMETIC_PURCHASE"),
    v.literal("TOURNAMENT_ENTRY"),
    v.literal("AI_CREDITS"),
    v.literal("TOURNAMENT_PRIZE"),
  ),
  amount: v.number(), // In cents
  stripePaymentIntentId: v.optional(v.string()),
  status: v.union(
    v.literal("PENDING"),
    v.literal("COMPLETED"),
    v.literal("FAILED"),
    v.literal("REFUNDED"),
  ),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_stripe_payment", ["stripePaymentIntentId"]);
```

### Core Services

#### Ad Service

```typescript
interface AdService {
  // Ad display management
  shouldShowAds(userId?: string): Promise<boolean>;
  getAdConfiguration(placement: AdPlacement): Promise<AdConfig>;
  trackAdInteraction(
    interaction: AdInteraction,
    userId?: string,
    sessionId?: string,
  ): Promise<void>;

  // Revenue tracking
  calculateAdRevenue(userId?: string, timeframe: TimeFrame): Promise<number>;
  getAdPerformanceMetrics(placement: AdPlacement): Promise<AdMetrics>;
}
```

#### Image Credit Service

```typescript
interface ImageCreditService {
  // Credit management
  getUserImageCredits(userId: string): Promise<number>;
  consumeImageCredit(userId: string): Promise<boolean>;
  awardImageCredit(userId: string, source: CreditSource): Promise<void>;

  // Credit earning through ads
  canEarnCreditFromAd(userId: string): Promise<boolean>;
  processAdRewardCredit(userId: string, adInteractionId: string): Promise<void>;

  // Credit validation
  hasImageCreditsForDuel(userId: string): Promise<boolean>;
  getImageCreditHistory(userId: string): Promise<CreditTransaction[]>;
}
```

#### Subscription Service

```typescript
interface SubscriptionService {
  // User management
  createUser(clerkId: string): Promise<User>;
  getUser(clerkId: string): Promise<User | null>;
  updateSubscription(userId: string, tier: SubscriptionTier): Promise<void>;

  // Usage tracking
  checkUsageLimit(userId: string, action: UsageAction): Promise<boolean>;
  incrementUsage(userId: string, action: UsageAction): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;

  // Feature access
  hasFeatureAccess(userId: string, feature: PremiumFeature): Promise<boolean>;
  getAIModelTier(userId: string): Promise<AIModelTier>;
}
```

#### Payment Service

```typescript
interface PaymentService {
  // Subscription management
  createCheckoutSession(userId: string, priceId: string): Promise<string>;
  createPortalSession(customerId: string): Promise<string>;

  // One-time purchases
  purchaseCosmetic(userId: string, itemId: string): Promise<Transaction>;
  purchaseAICredits(
    userId: string,
    creditPackage: CreditPackage,
  ): Promise<Transaction>;

  // Tournament payments
  enterTournament(userId: string, tournamentId: string): Promise<Transaction>;
  distributePrizes(tournamentId: string): Promise<void>;
}
```

#### Usage Limiter Service

```typescript
interface UsageLimiterService {
  // Limit definitions
  FREE_WIZARD_LIMIT: 3;
  INITIAL_IMAGE_CREDITS: 10;
  AD_REWARD_COOLDOWN: 300000; // 5 minutes in milliseconds

  // Validation methods
  canCreateWizard(userId: string): Promise<boolean>;
  canStartDuel(userId: string): Promise<boolean>; // Requires registration
  canGenerateImages(userId: string): Promise<boolean>;

  // Usage tracking
  trackWizardCreation(userId: string): Promise<void>;
  trackDuelParticipation(userId: string): Promise<void>;
  trackImageGeneration(userId: string): Promise<void>;
}
```

### Frontend Components

#### Ad Display Component

```typescript
interface AdDisplayProps {
  placement: AdPlacement;
  userId?: string;
  sessionId: string;
  onAdInteraction?: (interaction: AdInteraction) => void;
}

const AdDisplay: React.FC<AdDisplayProps>;
```

#### Image Credit Display Component

```typescript
interface ImageCreditDisplayProps {
  credits: number;
  onWatchAd?: () => void;
  onUpgrade?: () => void;
  canWatchAd: boolean;
}

const ImageCreditDisplay: React.FC<ImageCreditDisplayProps>;
```

#### Reward Ad Component

```typescript
interface RewardAdProps {
  onAdCompleted: (reward: AdReward) => void;
  onAdFailed: (error: AdError) => void;
  rewardType: "IMAGE_CREDIT";
}

const RewardAd: React.FC<RewardAdProps>;
```

#### Subscription Management Component

```typescript
interface SubscriptionManagerProps {
  currentTier: SubscriptionTier;
  usage: MonthlyUsage;
  onUpgrade: () => void;
  onManageBilling: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps>;
```

#### Usage Display Component

```typescript
interface UsageDisplayProps {
  usage: MonthlyUsage;
  limits: UsageLimits;
  tier: SubscriptionTier;
}

const UsageDisplay: React.FC<UsageDisplayProps>;
```

#### Cosmetic Shop Component

```typescript
interface CosmeticShopProps {
  items: CosmeticItem[];
  userInventory: UserInventory[];
  onPurchase: (itemId: string) => void;
}

const CosmeticShop: React.FC<CosmeticShopProps>;
```

## Data Models

### User Subscription Model

```typescript
interface User {
  _id: Id<"users">;
  clerkId: string;
  subscriptionTier: "FREE" | "PREMIUM";
  subscriptionStatus: "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionEndsAt?: number;
  imageCredits: number;
  monthlyUsage: {
    duelsPlayed: number;
    wizardsCreated: number;
    imageGenerations: number;
    adsWatched: number;
    resetDate: number;
  };
  createdAt: number;
  updatedAt: number;
}
```

### Ad Interaction Model

```typescript
interface AdInteraction {
  _id: Id<"adInteractions">;
  userId?: string;
  sessionId: string;
  adType: "DISPLAY_BANNER" | "VIDEO_REWARD" | "INTERSTITIAL";
  placement: "WIZARD_PAGE" | "DUEL_PAGE" | "CREDIT_REWARD";
  action: "IMPRESSION" | "CLICK" | "COMPLETION";
  revenue?: number;
  adNetworkId: string;
  metadata?: Record<string, any>;
  createdAt: number;
}
```

### Image Credit Transaction Model

```typescript
interface ImageCreditTransaction {
  _id: Id<"imageCreditTransactions">;
  userId: string;
  type: "EARNED" | "CONSUMED" | "GRANTED" | "EXPIRED";
  amount: number;
  source: "SIGNUP_BONUS" | "AD_REWARD" | "PREMIUM_GRANT" | "ADMIN_GRANT";
  relatedAdId?: Id<"adInteractions">;
  metadata?: Record<string, any>;
  createdAt: number;
}
```

### Cosmetic Item Model

```typescript
interface CosmeticItem {
  _id: Id<"cosmeticItems">;
  name: string;
  description: string;
  category: "SPELL_EFFECT" | "WIZARD_ACCESSORY" | "BACKGROUND" | "ANIMATION";
  price: number;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  previewImage?: string;
  isActive: boolean;
  premiumOnly: boolean;
}
```

### Tournament Model

```typescript
interface Tournament {
  _id: Id<"tournaments">;
  name: string;
  description: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  startDate: number;
  endDate: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  participants: string[];
  winners?: Array<{
    userId: string;
    position: number;
    prize: number;
  }>;
}
```

## Error Handling

### Payment Errors

- **Insufficient Funds**: Display user-friendly message with alternative payment methods
- **Card Declined**: Provide clear instructions for resolving payment issues
- **Webhook Failures**: Implement retry logic with exponential backoff
- **Subscription Sync Issues**: Background jobs to reconcile Stripe and database state

### Usage Limit Errors

- **Limit Exceeded**: Show upgrade prompts with clear value propositions
- **Rate Limiting**: Implement graceful degradation with informative messages
- **Feature Access Denied**: Redirect to subscription management with context

### Data Consistency

- **Transaction Rollbacks**: Ensure atomic operations for critical payment flows
- **Eventual Consistency**: Handle temporary inconsistencies between services
- **Audit Logging**: Track all monetization-related actions for debugging

## Testing Strategy

### Unit Tests

- **Subscription Service**: Test tier changes, usage tracking, feature access
- **Payment Service**: Mock Stripe interactions, test transaction flows
- **Usage Limiter**: Verify limit enforcement and usage calculations
- **Frontend Components**: Test subscription UI states and user interactions

### Integration Tests

- **Stripe Webhooks**: Test webhook processing with Stripe test events
- **Database Operations**: Verify data consistency across related tables
- **Authentication Flow**: Test subscription access with Clerk integration
- **AI Service Integration**: Test credit deduction and model tier selection

### End-to-End Tests

- **Subscription Flow**: Complete user journey from free to premium
- **Purchase Flow**: Test cosmetic purchases and tournament entries
- **Usage Limits**: Verify enforcement across different user tiers
- **Billing Management**: Test subscription changes and cancellations

### Performance Tests

- **Usage Tracking**: Ensure minimal latency impact on core features
- **Database Queries**: Optimize subscription and usage queries
- **Webhook Processing**: Test high-volume webhook handling
- **Payment Processing**: Verify response times for payment operations

## Security Considerations

### Payment Security

- **PCI Compliance**: Use Stripe Elements for secure card collection
- **Webhook Verification**: Validate all Stripe webhook signatures
- **API Key Management**: Secure storage of Stripe API keys
- **Transaction Validation**: Server-side verification of all payments

### Access Control

- **Feature Gating**: Server-side enforcement of subscription tiers
- **Usage Validation**: Prevent client-side manipulation of usage limits
- **Admin Functions**: Restrict administrative monetization functions
- **Audit Trails**: Log all subscription and payment changes

### Data Protection

- **PII Handling**: Minimize storage of payment-related personal data
- **Encryption**: Encrypt sensitive subscription and transaction data
- **Data Retention**: Implement appropriate retention policies for financial data
- **GDPR Compliance**: Support user data deletion and export requests

## Implementation Phases

### Phase 1: Ad System and Anonymous User Support

1. Ad network integration (Google AdSense, Media.net)
2. Anonymous session tracking
3. Ad display components for wizard and duel pages
4. Ad interaction tracking and analytics
5. Registration prompts for anonymous users attempting to duel

### Phase 2: Image Credit System

1. Database schema for image credits and transactions
2. Image credit service implementation
3. Credit consumption for AI image generation
4. Reward ad integration for credit earning
5. Credit balance UI components

### Phase 3: Core Infrastructure

1. User service with subscription tracking
2. Updated usage limiting with image credits
3. Stripe integration setup
4. Database schema updates for subscriptions

### Phase 4: Subscription Management

1. Subscription upgrade/downgrade flows
2. Billing portal integration
3. Webhook processing
4. Usage limit enforcement
5. Premium unlimited image generation

### Phase 5: Premium Features

1. Advanced wizard customization
2. Premium AI model access
3. Enhanced UI for premium users
4. Feature access controls

### Phase 6: Marketplace Features

1. Cosmetic item system
2. Shopping interface
3. Inventory management
4. Item application system

### Phase 7: Tournament System

1. Tournament creation and management
2. Entry fee processing
3. Prize distribution
4. Tournament UI components

### Phase 8: Analytics and Optimization

1. Revenue tracking dashboard (ads + subscriptions)
2. User behavior analytics
3. A/B testing framework
4. Conversion optimization
5. Ad performance optimization
