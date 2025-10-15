# Image Credit System Update

## Overview

The image credit system has been updated to consume credits at the duel level rather than per individual image generation. This provides better value for users and a more predictable cost structure.

## Changes Made

### Schema Updates

- Added `imageCreditConsumed: boolean` to the `duels` table to track if a credit has been consumed for the duel
- Added `imageCreditConsumedBy: string` to track which user's credit was consumed for the duel

### New Functions

- `consumeImageCreditForDuel()` - Consumes one credit per duel instead of per image
- Returns information about whether the credit was already consumed for this duel

### Updated Behavior

#### Before

- Each image generation (wizard illustration, round illustration) consumed 1 credit
- A typical 3-round duel could consume 4+ credits (1 intro + 3 rounds)

#### After

- **Wizard illustrations**: Still consume 1 credit each (independent of duels)
- **Duel images**: One credit covers ALL images in a duel (introduction + all rounds)
- Premium users still get unlimited image generation

### Implementation Details

1. **First image generation in a duel**: Consumes 1 credit and marks the duel as having consumed a credit
2. **Subsequent images in the same duel**: No additional credits consumed
3. **Premium users**: No credits consumed but duel is still marked to prevent double-processing
4. **Insufficient credits**: Duel falls back to text-only mode

### Testing

- Added comprehensive tests in `convex/imageCreditService.duel.test.ts`
- Verified backward compatibility with existing credit system
- Confirmed premium user behavior remains unchanged

## Benefits

- **Better value**: Users get more images per credit
- **Predictable costs**: One credit = one complete duel with all images
- **Simplified UX**: Users don't need to worry about running out of credits mid-duel
- **Backward compatible**: Existing wizard illustration system unchanged
