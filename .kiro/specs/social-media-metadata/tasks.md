# Implementation Plan

- [x] 1. Set up metadata infrastructure and utilities
  - Create centralized metadata service with TypeScript interfaces
  - Implement image optimization utilities for social media dimensions
  - Set up default fallback images for wizards and duels
  - _Requirements: 3.5, 5.5_

- [x] 1.1 Create metadata service foundation
  - Write `src/lib/metadata.ts` with MetadataConfig, WizardMetadata, and DuelMetadata interfaces
  - Implement `generateDefaultMetadata()` function for fallback scenarios
  - Create image dimension validation utilities (1200x630 requirement)
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 1.2 Set up default social sharing images
  - Add high-resolution default wizard placeholder image to public/images/
  - Add generic duel background images for different states (active, completed)
  - Create app-wide social sharing image with proper branding
  - _Requirements: 1.5, 2.7, 3.5_

- [x] 1.3 Write unit tests for metadata utilities
  - Test metadata generation functions with various input scenarios
  - Test image URL validation and fallback logic
  - Test default metadata generation
  - _Requirements: 5.5_

- [ ] 2. Implement Convex backend support for metadata
  - Create queries to fetch wizard and duel data optimized for metadata generation
  - Implement image URL generation with proper Convex storage integration
  - Add caching layer for metadata performance
  - _Requirements: 3.6, 5.1, 5.2_

- [x] 2.1 Create metadata-specific Convex queries
  - Write `getWizardForMetadata` query with wizard stats calculation
  - Write `getDuelForMetadata` query with participant and status information
  - Implement efficient data fetching to minimize response times
  - _Requirements: 1.3, 2.3, 2.4, 2.5, 3.6_

- [x] 2.2 Implement image URL optimization
  - Create utility to generate optimized Convex storage URLs
  - Implement fallback logic for missing wizard illustrations
  - Add support for round illustration selection for duels
  - _Requirements: 1.1, 2.6, 2.7, 3.3_

- [ ]\* 2.3 Add caching infrastructure
  - Implement metadata caching with 24-hour expiration
  - Create cache invalidation logic for wizard/duel updates
  - Add cache key generation utilities
  - _Requirements: 5.1, 5.2_

- [ ] 3. Implement wizard profile metadata generation
  - Add dynamic metadata generation to wizard detail pages
  - Create wizard-specific metadata formatting with stats
  - Implement proper Open Graph and Twitter Card metadata
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.1 Update wizard page with metadata generation
  - Modify `src/app/wizards/[id]/page.tsx` to include `generateMetadata` function
  - Implement wizard data fetching for metadata
  - Create wizard-specific title and description formatting
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 3.2 Implement wizard metadata formatting
  - Create `generateWizardMetadata()` function in metadata service
  - Format wizard stats (win/loss record) for social descriptions
  - Handle missing wizard data with appropriate fallbacks
  - _Requirements: 1.3, 1.5, 5.5_

- [ ]\* 3.3 Write tests for wizard metadata
  - Test wizard metadata generation with various wizard states
  - Test fallback scenarios for missing wizards
  - Test image URL generation for wizard illustrations
  - _Requirements: 1.5, 5.5_

- [x] 4. Implement duel metadata generation
  - Add dynamic metadata generation to duel pages
  - Create status-aware duel metadata with participant information
  - Implement round illustration integration for preview images
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4.1 Update duel page with metadata generation
  - Modify `src/app/duels/[id]/page.tsx` to include `generateMetadata` function
  - Implement duel data fetching with participant information
  - Create dynamic title generation based on duel status
  - _Requirements: 2.2, 2.3_

- [x] 4.2 Implement duel metadata formatting
  - Create `generateDuelMetadata()` function in metadata service
  - Implement status-aware title generation (Live Duel vs Epic Duel)
  - Format participant information and win rates for descriptions
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 4.3 Add round illustration integration
  - Implement logic to select latest round illustration as preview image
  - Create fallback to generic duel background when no illustrations exist
  - Optimize illustration URLs for social media dimensions
  - _Requirements: 2.6, 2.7_

- [ ]\* 4.4 Write tests for duel metadata
  - Test duel metadata generation for different duel states
  - Test participant information formatting
  - Test round illustration selection logic
  - _Requirements: 2.7, 5.5_

- [x] 5. Add comprehensive Open Graph and Twitter Card support
  - Implement complete metadata tags for all social platforms
  - Add proper meta tag generation in page layouts
  - Ensure cross-platform compatibility and validation
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4_

- [x] 5.1 Implement complete metadata tag generation
  - Add all required Open Graph tags (og:title, og:description, og:image, og:url, og:type)
  - Add all required Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
  - Implement proper meta tag structure in Next.js metadata API
  - _Requirements: 3.1, 3.2_

- [x] 5.2 Add metadata validation and optimization
  - Implement description length validation (150-300 characters)
  - Add image dimension validation (minimum 1200x630)
  - Create URL canonicalization for proper og:url values
  - _Requirements: 3.3, 3.4_

- [ ]\* 5.3 Add cross-platform testing utilities
  - Create utilities to validate Open Graph metadata format
  - Add Twitter Card validation helpers
  - Implement Discord embed testing utilities
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Implement performance optimizations and error handling
  - Add comprehensive error handling with graceful fallbacks
  - Implement response time optimization for social platform requirements
  - Add cache-busting parameters for updated content
  - _Requirements: 3.6, 4.6, 5.3, 5.4, 5.5_

- [ ] 6.1 Add error handling and fallbacks
  - Implement try-catch blocks around all metadata generation
  - Create graceful fallback to default metadata for missing data
  - Add error logging for monitoring and debugging
  - _Requirements: 5.5_

- [ ] 6.2 Optimize metadata generation performance
  - Implement parallel data fetching for wizard and duel information
  - Add response time monitoring to meet 2-second requirement
  - Optimize Convex queries for metadata-specific data needs
  - _Requirements: 3.6_

- [ ] 6.3 Add cache-busting and invalidation
  - Implement cache-busting parameters when content changes
  - Add metadata cache invalidation on wizard/duel updates
  - Create cache warming for popular content
  - _Requirements: 4.6, 5.2_

- [ ]\* 6.4 Add monitoring and analytics
  - Implement metadata generation performance tracking
  - Add error rate monitoring for fallback scenarios
  - Create social sharing engagement tracking utilities
  - _Requirements: 5.4_
