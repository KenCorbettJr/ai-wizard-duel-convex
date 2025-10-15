# Undo Spell Feature

## Overview

The undo spell feature allows players to change their mind about a spell they've cast while waiting for other wizards to cast their spells in a duel round.

## How It Works

### Backend Implementation

1. **New Mutation**: `undoSpell` in `convex/duels.ts`
   - Validates that the user owns the wizard
   - Checks that the duel is in progress
   - Ensures the round is still accepting spells (status: "WAITING_FOR_SPELLS")
   - Removes the wizard's spell from the current round
   - Adds the wizard back to the `needActionsFrom` array

2. **Security Checks**:
   - User must be authenticated
   - User must own the wizard
   - Duel must be in progress
   - Round must still be accepting spells
   - Wizard must have actually cast a spell to undo

### Frontend Implementation

1. **UI Changes**: Updated `DuelPageClient.tsx`
   - Added undo button in the waiting state when user has cast but others haven't
   - Button appears with orange styling to match the waiting theme
   - Shows loading state while undoing

2. **User Experience**:
   - Button only appears when user has cast a spell and is waiting for others
   - Clear messaging explains the functionality
   - Disabled state while processing the undo

## Usage Scenarios

### When Undo is Available

- User has cast a spell in the current round
- Other wizards haven't finished casting their spells yet
- Round status is still "WAITING_FOR_SPELLS"

### When Undo is NOT Available

- User hasn't cast a spell yet
- All wizards have cast spells (round is processing)
- Round has already been completed
- Duel is not in progress

## Testing

The feature includes comprehensive tests:

1. **Happy Path**: Successfully undo a spell while waiting
2. **Error Cases**:
   - Cannot undo if no spell was cast
   - Cannot undo after round processing starts
3. **State Verification**: Ensures proper cleanup of spell data and wizard action requirements

## API Reference

### `undoSpell` Mutation

```typescript
export const undoSpell = mutation({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
  },
  handler: async (ctx, { duelId, wizardId }) => {
    // Implementation details...
  },
});
```

**Parameters:**

- `duelId`: ID of the duel
- `wizardId`: ID of the wizard whose spell should be undone

**Returns:** The current round ID

**Throws:**

- "Not authenticated" - User not logged in
- "Not authorized to undo spells for this wizard" - User doesn't own the wizard
- "Duel not found" - Invalid duel ID
- "Duel is not in progress" - Duel not in active state
- "Current round not found" - Round data inconsistency
- "Cannot undo spell - round is no longer accepting spells" - Round processing has started
- "Wizard is not participating in this duel" - Wizard not part of this duel
- "No spell to undo - wizard has not cast a spell this round" - No spell was cast

## Future Enhancements

Potential improvements could include:

- Confirmation dialog before undoing
- Undo history/analytics
- Time limits on undo availability
- Visual feedback showing the original spell being undone
