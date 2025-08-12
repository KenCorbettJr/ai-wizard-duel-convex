# Navigation Changes Test Plan

## Changes Made

1. **Duel Creation Flow**: When a duel is created successfully, instead of showing the success page, users are now redirected directly to `/duels/{id}`.

2. **Duel Detail Page**: When accessing `/duels/{id}` for a duel that is in "WAITING_FOR_PLAYERS" status, users are automatically redirected to `/join/{shortcode}`.

## Expected Behavior

### Before Changes:

1. User creates duel → Success page with "View Duel" button → Click button → Go to `/duels/{id}` → See waiting message
2. User goes to `/duels/{id}` for waiting duel → See waiting message but can't easily get back to join flow

### After Changes:

1. User creates duel → Automatically redirected to `/duels/{id}` → Automatically redirected to `/join/{shortcode}` (join page)
2. User goes to `/duels/{id}` for waiting duel → Automatically redirected to `/join/{shortcode}` (join page)

## Test Steps

1. **Create a new duel**:
   - Go to `/duels/create`
   - Fill out the form and create a duel
   - Should be redirected to the join page for that duel

2. **Access waiting duel directly**:
   - Navigate to `/duels/{id}` where the duel is still waiting for players
   - Should be automatically redirected to `/join/{shortcode}`

3. **Access in-progress duel**:
   - Navigate to `/duels/{id}` where the duel is in progress
   - Should stay on the duel page (no redirect)

## Files Modified

- `src/app/duels/create/page.tsx`: Changed `handleSuccess` to redirect directly to duel page
- `src/app/duels/[id]/page.tsx`: Added redirect logic for waiting duels
