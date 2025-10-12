# Implementation Plan

- [x] 1. Set up ad network integration and anonymous user tracking
  - Integrate Google AdSense or similar ad network SDK
  - Create anonymous session tracking system for non-logged-in users
  - Implement ad display components for wizard and duel pages
  - Build ad interaction tracking (impressions, clicks, completions)
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 2. Implement registration prompts for anonymous users
  - Create registration call-to-action components with ad removal messaging
  - Build duel access gate that requires account creation
  - Implement smooth registration flow from anonymous browsing
  - Add clear value proposition messaging about ad-free experience
  - _Requirements: 1.3, 1.5, 4.5_

- [ ] 3. Extend database schema for image credits and ad tracking
  - Add users table with imageCredits field and updated usage tracking
  - Create adInteractions table for tracking ad performance and revenue
  - Add imageCreditTransactions table for credit earning/spending history
  - Update existing schema to support new monetization features
  - _Requirements: 3.1, 3.5_

- [ ] 4. Build image credit management system
  - Create image credit service with balance tracking and validation
  - Implement credit consumption for AI-generated duel images
  - Build credit earning system through reward ad completion
  - Add initial credit grant (10 credits) for new user registration
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 5. Implement reward ad system for credit earning
  - Integrate video reward ads with ad network
  - Create ad completion verification and credit awarding
  - Build cooldown system to prevent ad spam (5-minute intervals)
  - Add reward ad UI components with clear credit earning messaging
  - _Requirements: 3.4_

- [ ] 6. Create unlimited dueling with tiered visual experience
  - Modify duel system to support both image-enabled and text-only modes
  - Implement image credit checking before AI image generation
  - Build fallback to text-only narratives when credits are exhausted
  - Create clear UI indicators showing image vs text-only duel modes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Build image credit UI components
  - Create credit balance display with current count and usage history
  - Implement "Watch Ad for Credit" button with reward ad integration
  - Build credit exhaustion notifications with upgrade/ad-watch options
  - Add credit earning celebration animations and feedback
  - _Requirements: 3.5_

- [ ] 8. Update usage limiting system for new model
  - Remove daily duel limits (now unlimited for all registered users)
  - Keep wizard creation limits (3 for free, unlimited for premium)
  - Implement image generation credit validation
  - Update usage tracking to include image generations and ads watched
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9. Set up core subscription infrastructure
  - Install and configure Stripe SDK and webhook handling
  - Create environment variables for Stripe API keys and ad network credentials
  - Set up basic error handling utilities for payment and ad operations
  - Build user service with subscription and credit management
  - _Requirements: 6.1, 6.3_

- [ ] 10. Implement premium subscription with unlimited image generation
  - Create premium subscription purchase flow with Stripe Checkout
  - Build unlimited image credit system for premium users
  - Implement subscription status checking for image generation
  - Add premium user benefits messaging and UI enhancements
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 11. Build subscription management and billing
  - Create subscription status dashboard showing current plan and image credits
  - Implement upgrade/downgrade buttons with Stripe Checkout integration
  - Build billing portal integration for subscription management
  - Create webhook endpoint for processing Stripe subscription events
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 12. Implement premium wizard customization features
  - Create advanced appearance customization options for premium users
  - Implement rare magical schools and specializations access control
  - Add custom backstory generation with AI assistance for premium users
  - Create premium-exclusive visual effects and animations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 13. Build cosmetic marketplace system
  - Create cosmetic item management functions (CRUD operations)
  - Build shopping interface with item browsing and filtering
  - Implement cosmetic item purchase flow with Stripe integration
  - Create inventory management system for purchased items
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 14. Implement tournament entry and prize system
  - Create tournament management functions with entry fee handling
  - Implement tournament entry payment processing
  - Build automatic prize pool calculation and distribution
  - Create tournament UI with entry requirements and prize display
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 15. Create AI generation credits purchase system
  - Implement credit package purchase functionality for additional credits
  - Build credit deduction system for AI feature usage beyond image generation
  - Create credit balance tracking and low-credit notifications
  - Add credit purchase suggestions when limits are reached
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 16. Build comprehensive analytics and revenue tracking
  - Create ad revenue tracking and performance metrics
  - Implement subscription conversion funnel tracking
  - Build user behavior analytics for monetization features
  - Create admin dashboard for monitoring ad performance and subscription metrics
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 17. Implement anti-abuse and security measures
  - Add rate limiting for ad reward claims and payment endpoints
  - Create fraud detection for unusual usage patterns and ad interactions
  - Implement account verification to prevent multiple free trial abuse
  - Build transaction validation and chargeback prevention measures
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 18. Create webhook processing and error handling
  - Implement Stripe webhook signature verification
  - Build subscription status update handlers for webhook events
  - Create payment failure handling with user notifications
  - Add retry logic for failed webhook processing with exponential backoff
  - _Requirements: 11.4_

- [ ]\* 19. Build comprehensive test suite
  - Write unit tests for image credit service and ad interaction tracking
  - Create integration tests for ad network and Stripe webhook processing
  - Build end-to-end tests for complete user flows (anonymous → registered → premium)
  - Add performance tests for ad serving and payment processing
  - _Requirements: All requirements - testing coverage_

- [ ] 20. Implement graceful feature degradation and user experience
  - Create user-friendly upgrade prompts when image credits are exhausted
  - Build informative messaging about ad-free experience benefits
  - Implement smooth transitions between anonymous, free, and premium tiers
  - Add contextual help and support links for billing and ad-related issues
  - _Requirements: 1.5, 3.4, 4.4_

- [ ] 21. Set up monitoring and alerting
  - Create ad performance monitoring with revenue tracking alerts
  - Implement subscription churn tracking and notifications
  - Build image credit usage anomaly detection and reporting
  - Add webhook processing and ad network health checks with error alerts
  - _Requirements: 12.1, 12.2_
