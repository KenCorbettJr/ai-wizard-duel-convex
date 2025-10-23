# Requirements Document

## Introduction

The Single Player Campaign Mode feature allows players to take their created wizards through a linear progression of 10 AI-powered wizard opponents. Each player wizard must complete their own individual campaign journey, facing the same sequence of 10 unique AI wizards in order. Upon defeating all 10 opponents with a wizard, that wizard earns a special relic that provides a permanent +1 luck boost (with the maximum luck score remaining at 20). This mode provides structured single-player progression that complements the existing multiplayer dueling system while offering meaningful long-term rewards.

## Requirements

### Requirement 1

**User Story:** As a player, I want to access a campaign mode from the main navigation, so that I can easily find and start single-player adventures with my wizards.

#### Acceptance Criteria

1. WHEN a user navigates to the main menu THEN the system SHALL display a "Campaign" navigation option
2. WHEN a user clicks the Campaign option THEN the system SHALL navigate to the campaign overview page
3. IF a user has no created wizards THEN the system SHALL display a message encouraging wizard creation with a link to the wizard creation page

### Requirement 2

**User Story:** As a player, I want to see a linear campaign progression showing the 10 AI wizard opponents, so that I can track my wizard's progress through the campaign and see what challenges lie ahead.

#### Acceptance Criteria

1. WHEN a user accesses the campaign mode THEN the system SHALL display a linear progression of 10 AI wizard opponents
2. WHEN a user views the campaign progression THEN the system SHALL show which opponents have been defeated and which are available to challenge
3. WHEN a user hovers over an AI wizard opponent THEN the system SHALL display opponent information including name, description, and difficulty indicator
4. IF an opponent is locked THEN the system SHALL clearly indicate that the previous opponent must be defeated first
5. WHEN a user clicks an available opponent THEN the system SHALL navigate to the wizard selection screen for that battle

### Requirement 3

**User Story:** As a player, I want to select one of my wizards to participate in a campaign battle, so that I can progress that specific wizard through their individual campaign journey.

#### Acceptance Criteria

1. WHEN a user selects a campaign opponent THEN the system SHALL display all of the user's available wizards
2. WHEN a user views their wizard selection THEN the system SHALL show each wizard's campaign progress including which opponents they have defeated
3. WHEN a user selects a wizard THEN the system SHALL highlight the selected wizard and show their next available opponent
4. IF a wizard is currently in another active duel THEN the system SHALL disable that wizard for campaign selection
5. WHEN a user confirms wizard selection THEN the system SHALL proceed to the campaign battle against the wizard's next opponent in sequence

### Requirement 4

**User Story:** As a player, I want to battle against 10 unique AI-powered wizard opponents with distinct personalities and increasing difficulty, so that I have varied and progressively challenging combat experiences.

#### Acceptance Criteria

1. WHEN the campaign system is initialized THEN the system SHALL define 10 unique AI wizard opponents with distinct names, descriptions, and personalities
2. WHEN an AI opponent is encountered THEN the system SHALL display their unique visual appearance and background story
3. WHEN a battle begins THEN the AI opponent SHALL cast spells using AI-generated strategies that reflect their personality and difficulty level
4. WHEN it's the AI's turn THEN the system SHALL automatically generate and cast spells with increasing sophistication based on opponent position (1-10)
5. WHEN the AI casts a spell THEN the system SHALL use contextually appropriate spell descriptions that match the opponent's unique magical style

### Requirement 5

**User Story:** As a player, I want to earn progression rewards from defeating campaign opponents and receive a special relic for completing the entire campaign, so that I feel motivated to complete the challenging journey.

#### Acceptance Criteria

1. WHEN a player wins a campaign battle THEN the system SHALL record the victory for that specific wizard's campaign progress
2. WHEN a player defeats an AI opponent THEN the system SHALL unlock the next opponent in the sequence for that wizard
3. WHEN a player wins a campaign battle THEN the system SHALL display victory confirmation and show progress toward the final reward
4. WHEN a player loses a campaign battle THEN the system SHALL allow unlimited retries without penalty but provide no progression until victory
5. WHEN a wizard defeats all 10 AI opponents THEN the system SHALL award that wizard a permanent +1 luck boost relic (maximum luck remains 20)

### Requirement 6

**User Story:** As a player, I want to see individual campaign progress for each of my wizards, so that I can track which wizards have completed the campaign and which are still progressing.

#### Acceptance Criteria

1. WHEN a user accesses their wizard list THEN the system SHALL display campaign progress indicators for each wizard
2. WHEN a user views a wizard's details THEN the system SHALL show which AI opponents that wizard has defeated and their current position in the campaign
3. WHEN a user accesses the campaign mode THEN the system SHALL display per-wizard progress with visual indicators of completion
4. WHEN a wizard completes the campaign THEN the system SHALL display a special completion badge and relic indicator
5. WHEN a user views campaign statistics THEN the system SHALL show how many wizards have completed the campaign and overall progress across all wizards

### Requirement 7

**User Story:** As a player, I want the campaign battles to follow the same core mechanics as multiplayer duels but remain separate from multiplayer statistics, so that skills learned in campaign mode transfer to multiplayer gameplay without affecting competitive rankings.

#### Acceptance Criteria

1. WHEN a campaign battle starts THEN the system SHALL use the same duel mechanics as multiplayer battles
2. WHEN spells are cast in campaign mode THEN the system SHALL use the same spell resolution system as multiplayer duels
3. WHEN a campaign battle concludes THEN the system SHALL NOT update wizard win/loss statistics used for leaderboards or multiplayer rankings
4. WHEN damage is calculated THEN the system SHALL use identical hit point and damage systems as multiplayer mode
5. WHEN campaign battles are active THEN the system SHALL NOT display them in the watchable duels list available to other players

### Requirement 8

**User Story:** As a player, I want the 10 AI opponents to have progressively increasing difficulty and unique characteristics, so that the campaign becomes more challenging and engaging as I advance.

#### Acceptance Criteria

1. WHEN a player progresses through the 10 AI opponents THEN the system SHALL increase opponent difficulty with each subsequent opponent
2. WHEN a player faces opponents 1-3 THEN the system SHALL provide beginner-level AI strategies and spell complexity with a luck penalty to make them easier to defeat
3. WHEN a player faces opponents 4-7 THEN the system SHALL provide intermediate-level AI with more sophisticated spell combinations and standard luck values
4. WHEN a player faces opponents 8-10 THEN the system SHALL provide advanced-level AI with complex strategies, powerful spell descriptions, and a luck bonus to increase their challenge
5. WHEN each opponent is encountered THEN the system SHALL display their unique magical specialization, difficulty rating, and any luck modifiers

### Requirement 9

**User Story:** As a player, I want my wizard to receive a permanent luck boost relic after completing the campaign, so that I have a meaningful long-term reward that enhances my wizard's abilities in all future battles.

#### Acceptance Criteria

1. WHEN a wizard defeats the 10th and final AI opponent THEN the system SHALL award that wizard a permanent +1 luck boost relic
2. WHEN a wizard receives the campaign completion relic THEN the system SHALL increase that wizard's luck score by 1 for all future battles
3. WHEN calculating luck bonuses THEN the system SHALL ensure the maximum luck score remains capped at 20 even with relic bonuses
4. WHEN a wizard with a campaign relic participates in any battle THEN the system SHALL apply the +1 luck bonus to all luck-based calculations
5. WHEN displaying wizard statistics THEN the system SHALL clearly indicate which wizards possess the campaign completion relic and their effective luck score
