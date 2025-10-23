# Implementation Plan

- [x] 1. Set up database schema and seed campaign opponents
  - Add new tables to convex/schema.ts for campaign system
  - Create campaignOpponents table with 10 predefined AI wizards
  - Add wizardCampaignProgress table for individual wizard tracking
  - Add campaignBattles table for battle records
  - Extend duels table with isCampaignBattle flag
  - _Requirements: 2.1, 4.1, 5.2, 6.2, 7.5_

- [x] 1.1 Create campaign opponents seed data
  - Define 10 unique AI wizard opponents with names, descriptions, and personalities
  - Set difficulty levels: opponents 1-3 (BEGINNER, -2 luck), 4-7 (INTERMEDIATE, 0 luck), 8-10 (ADVANCED, +2 luck)
  - Include spell styles and personality traits for each opponent
  - Create illustration prompts for AI image generation
  - _Requirements: 4.1, 4.2, 8.2, 8.3, 8.4_

- [x] 1.2 Write database schema tests
  - Test campaign opponents table structure and constraints
  - Test wizard campaign progress tracking
  - Test campaign battle record creation
  - Verify proper indexing for performance
  - _Requirements: 4.1, 5.2, 6.2_

- [ ] 2. Implement core campaign backend functions
  - Create convex/campaigns.ts with campaign management functions
  - Implement getCampaignOpponents query to return all 10 AI wizards
  - Create getWizardCampaignProgress and getUserCampaignProgress queries
  - Implement defeatOpponent mutation for progression tracking
  - _Requirements: 3.3, 5.1, 5.2, 6.1, 6.2_

- [x] 2.1 Create campaign opponent management functions
  - Implement createCampaignAIWizard mutation for battle instances
  - Create getCampaignAISpellStrategy query with difficulty-based AI
  - Apply luck modifiers based on opponent difficulty level
  - Generate contextual AI spells based on personality traits
  - _Requirements: 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4_

- [x] 2.2 Implement campaign battle integration
  - Create startCampaignBattle mutation that integrates with existing duel system
  - Implement completeCampaignBattle mutation for result processing
  - Add checkCampaignCompletion mutation for relic award logic
  - Ensure campaign battles are marked with isCampaignBattle flag
  - _Requirements: 3.5, 5.1, 5.4, 7.1, 7.3, 7.5, 9.1, 9.2_

- [ ]\* 2.3 Write backend function tests
  - Test campaign progression logic and validation
  - Test AI opponent creation and spell generation
  - Test relic award system and luck boost calculation
  - Test campaign battle isolation from multiplayer stats
  - _Requirements: 5.1, 7.3, 9.1, 9.2, 9.3_

- [ ] 3. Create campaign progression UI components
  - Build CampaignProgression component showing linear 10-opponent layout
  - Create CampaignOpponentCard component for individual AI wizard display
  - Implement CampaignWizardSelection component for wizard choice interface
  - Add CampaignRelicBadge component for completion rewards display
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 6.3, 6.4, 9.5_

- [x] 3.1 Implement wizard progress tracking UI
  - Display per-wizard campaign progress with visual indicators
  - Show which opponents each wizard has defeated
  - Indicate next available opponent for each wizard
  - Display relic status and effective luck scores
  - _Requirements: 3.2, 6.1, 6.2, 6.4, 9.4, 9.5_

- [x] 3.2 Create opponent difficulty visualization
  - Display opponent difficulty levels with clear indicators
  - Show luck modifiers for each opponent (+2, 0, -2)
  - Visualize personality traits and spell styles
  - Implement lock/unlock status for linear progression
  - _Requirements: 2.3, 4.2, 8.5_

- [ ]\* 3.3 Write component tests
  - Test campaign progression display logic
  - Test wizard selection and progress indicators
  - Test opponent card rendering and status display
  - Test relic badge functionality
  - _Requirements: 2.1, 3.1, 6.1, 9.5_

- [x] 4. Build campaign page structure and navigation
  - Create src/app/campaign/page.tsx for main campaign overview
  - Implement src/app/campaign/layout.tsx with campaign-specific navigation
  - Build wizard selection pages for opponent battles
  - Create campaign statistics page for progress tracking
  - _Requirements: 1.1, 1.2, 2.1, 6.5_

- [x] 4.1 Integrate campaign battles with existing duel system
  - Modify existing duel UI to handle campaign battles
  - Ensure campaign battles don't appear in watchable duels list
  - Prevent campaign battle results from affecting leaderboards
  - Maintain same battle mechanics as multiplayer duels
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.2 Add campaign navigation to main app
  - Add "Campaign" option to main navigation menu
  - Implement routing to campaign overview page
  - Handle cases where users have no wizards created
  - Provide clear entry points from wizard management pages
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]\* 4.3 Write page integration tests
  - Test campaign page navigation and routing
  - Test wizard selection flow for campaign battles
  - Test campaign battle initiation and completion
  - Test navigation between campaign and other app sections
  - _Requirements: 1.1, 1.2, 3.5, 4.1_

- [ ] 5. Implement relic reward system and luck boost mechanics
  - Create relic award logic when wizard defeats all 10 opponents
  - Implement permanent +1 luck boost with 20 maximum cap
  - Update wizard statistics to include relic status
  - Apply luck boost to all future battles for relic-holding wizards
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.1 Update existing systems for campaign integration
  - Modify leaderboard queries to exclude campaign battles
  - Update watchable duels list to filter out campaign battles
  - Ensure wizard win/loss stats separate campaign from multiplayer
  - Update wizard display components to show relic status
  - _Requirements: 7.3, 7.5, 9.5_

- [ ]\* 5.2 Write relic system tests
  - Test relic award conditions and logic
  - Test luck boost calculation and maximum cap enforcement
  - Test relic persistence across battles and sessions
  - Test integration with existing wizard statistics
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 6. Create campaign statistics and progress tracking
  - Build CampaignStats component for overall progress display
  - Implement per-wizard progress visualization
  - Create campaign battle history display
  - Add completion percentage and milestone tracking
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]\* 6.1 Write statistics component tests
  - Test campaign progress calculation and display
  - Test wizard-specific statistics tracking
  - Test battle history filtering and presentation
  - Test completion milestone detection
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 7. Polish UI and add campaign-specific styling
  - Design visual theme for campaign mode distinct from multiplayer
  - Add animations for opponent unlocking and relic awards
  - Implement responsive design for campaign progression display
  - Add loading states and error handling for campaign operations
  - _Requirements: 2.1, 2.2, 6.3, 9.1_

- [ ]\* 7.1 Write end-to-end campaign tests
  - Test complete campaign progression from start to relic award
  - Test multiple wizards progressing through campaign simultaneously
  - Test campaign battle flow integration with existing duel system
  - Test error handling and edge cases in campaign progression
  - _Requirements: 3.5, 5.1, 5.5, 9.1, 9.2_
