# Implementation Plan

- [ ] 1. Set up database schema and core data models
  - Extend convex/schema.ts with new campaign-related tables
  - Create campaigns, campaignStages, campaignBattles, and wizardExperience tables
  - Add proper indexes for efficient querying
  - _Requirements: 2.1, 5.1, 6.1, 6.2_

- [ ] 2. Create campaign initialization and basic queries
  - [ ] 2.1 Implement campaign initialization mutation
    - Write initializeCampaign mutation in convex/campaigns.ts
    - Create getUserCampaign query for fetching user progress
    - Add campaign progress validation logic
    - _Requirements: 5.1, 6.1_

  - [ ] 2.2 Create campaign stage management functions
    - Implement getCampaignStages query to fetch available stages
    - Write completeStage mutation for progression tracking
    - Add stage unlock validation logic
    - _Requirements: 2.2, 5.2, 8.1_

- [ ] 3. Build AI opponent generation system
  - [ ] 3.1 Create AI opponent generation logic
    - Write generateAIOpponent mutation in convex/aiOpponents.ts
    - Implement dynamic name and description generation
    - Create personality trait assignment system
    - _Requirements: 4.1, 4.2, 8.3_

  - [ ] 3.2 Implement AI spell strategy system
    - Write getAISpellStrategy query for contextual AI behavior
    - Create spell generation based on personality traits and battle context
    - Implement difficulty-based AI intelligence scaling
    - _Requirements: 4.3, 4.4, 8.3_

- [ ] 4. Create campaign battle integration
  - [ ] 4.1 Implement campaign battle creation
    - Write startCampaignBattle mutation in convex/campaignBattles.ts
    - Integrate with existing duel creation system
    - Link campaign battles to user progress
    - _Requirements: 7.1, 7.2, 4.5_

  - [ ] 4.2 Create campaign battle completion handling
    - Write completeCampaignBattle mutation
    - Implement experience point calculation and awarding
    - Update wizard statistics for campaign battles
    - _Requirements: 5.1, 5.2, 7.3_

- [ ] 5. Build campaign navigation and routing
  - [ ] 5.1 Create campaign app router structure
    - Create src/app/campaign directory with page.tsx and layout.tsx
    - Set up [stageId] dynamic route for stage selection
    - Create battle/[battleId] nested route for campaign battles
    - _Requirements: 1.1, 1.2_

  - [ ] 5.2 Add campaign navigation to main navbar
    - Update src/components/Navbar.tsx to include Campaign link
    - Add campaign navigation only for authenticated users
    - Implement proper navigation styling and positioning
    - _Requirements: 1.1, 1.2_

- [ ] 6. Create campaign map and stage visualization
  - [ ] 6.1 Build CampaignMap component
    - Create src/components/CampaignMap.tsx with visual stage progression
    - Implement locked/unlocked stage indicators
    - Add stage hover information display
    - Create responsive design for different screen sizes
    - _Requirements: 2.1, 2.2, 2.3, 6.3_

  - [ ] 6.2 Create campaign overview page
    - Implement src/app/campaign/page.tsx with campaign map integration
    - Add user progress display and statistics overview
    - Handle cases where user has no wizards created
    - _Requirements: 1.3, 2.1, 6.1_

- [ ] 7. Build stage selection and wizard selection interface
  - [ ] 7.1 Create StageSelection component
    - Build src/components/StageSelection.tsx for stage details
    - Implement wizard selection interface for campaign battles
    - Add special conditions and requirements display
    - _Requirements: 2.4, 3.1, 3.2, 8.4_

  - [ ] 7.2 Implement stage detail page
    - Create src/app/campaign/[stageId]/page.tsx
    - Integrate StageSelection component with battle initiation
    - Add validation for wizard availability and stage requirements
    - _Requirements: 3.3, 3.4, 2.4_

- [ ] 8. Create AI opponent display and battle preparation
  - [ ] 8.1 Build AIOpponentCard component
    - Create src/components/AIOpponentCard.tsx for opponent display
    - Implement mysterious reveal animation for AI opponents
    - Add personality trait and difficulty visualization
    - _Requirements: 4.1, 4.2, 8.1_

  - [ ] 8.2 Integrate AI opponents with battle system
    - Modify existing battle components to handle AI opponents
    - Ensure AI opponents automatically cast spells during battles
    - Implement AI spell casting with personality-based behavior
    - _Requirements: 4.3, 4.4, 4.5, 7.4_

- [ ] 9. Build experience and progression system
  - [ ] 9.1 Create wizard experience tracking
    - Implement wizardExperience table management
    - Write updateWizardExperience mutation
    - Create getWizardExperience query for display
    - _Requirements: 5.1, 6.2_

  - [ ] 9.2 Build progression display components
    - Create src/components/CampaignStats.tsx for progress tracking
    - Implement experience point display in wizard cards
    - Add campaign milestone and achievement indicators
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 10. Create campaign statistics and history
  - [ ] 10.1 Implement campaign statistics page
    - Create src/app/campaign/stats/page.tsx
    - Build comprehensive campaign analytics display
    - Add battle history and achievement showcase
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 10.2 Add campaign statistics to dashboard
    - Update src/app/dashboard/page.tsx to include campaign stats
    - Create campaign progress card for main dashboard
    - Add quick access to campaign mode from dashboard
    - _Requirements: 6.1, 6.2_

- [ ] 11. Implement special stage conditions and mechanics
  - [ ] 11.1 Create special condition handling
    - Implement modified health, round limits, and environmental effects
    - Update battle creation to apply special conditions
    - Add special condition display in stage selection
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 11.2 Build tutorial and help system
    - Create tutorial components for first-time campaign users
    - Add help tooltips and explanations for special mechanics
    - Implement progressive disclosure of campaign features
    - _Requirements: 8.5_

- [ ] 12. Add comprehensive error handling and validation
  - [ ] 12.1 Implement campaign-specific error handling
    - Add validation for stage progression requirements
    - Create error recovery for AI generation failures
    - Implement graceful degradation for offline scenarios
    - _Requirements: 2.4, 4.1, 5.4_

  - [ ] 12.2 Add loading states and user feedback
    - Create loading components for AI generation and battle creation
    - Add progress indicators for campaign operations
    - Implement success/failure notifications for user actions
    - _Requirements: 4.1, 5.3_

- [ ] 13. Create comprehensive test coverage
  - [ ] 13.1 Write unit tests for campaign logic
    - Test campaign progression and stage unlock logic
    - Create tests for AI opponent generation algorithms
    - Add tests for experience calculation and awarding
    - _Requirements: 5.1, 5.2, 4.1, 4.2_

  - [ ] 13.2 Write integration tests for campaign flow
    - Test complete campaign battle creation and completion flow
    - Create tests for AI opponent integration with battle system
    - Add tests for campaign statistics and progress tracking
    - _Requirements: 7.1, 7.2, 7.3, 6.1_

- [ ] 14. Implement performance optimizations
  - [ ] 14.1 Optimize database queries and caching
    - Add proper indexing for campaign-related queries
    - Implement caching for frequently accessed stage data
    - Optimize AI opponent generation performance
    - _Requirements: 2.1, 4.1, 6.1_

  - [ ] 14.2 Optimize frontend performance
    - Implement lazy loading for campaign stages and components
    - Add preloading for next stage content
    - Optimize campaign map rendering for large numbers of stages
    - _Requirements: 2.1, 2.2_

- [ ] 15. Add seed data and initial campaign stages
  - [ ] 15.1 Create initial campaign stage data
    - Design and implement 10-15 initial campaign stages
    - Create diverse AI opponent templates for different difficulties
    - Add varied special conditions and environmental effects
    - _Requirements: 2.2, 4.2, 8.1, 8.2_

  - [ ] 15.2 Implement data seeding system
    - Create database seeding scripts for campaign stages
    - Add AI opponent template seeding
    - Implement development data reset functionality
    - _Requirements: 2.2, 4.1_
