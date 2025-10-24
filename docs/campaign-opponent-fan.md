# Campaign Opponent Fan Component

The `CampaignOpponentFan` component displays all 10 campaign opponents in a visually appealing fanned-out card layout at the top of the campaign page.

## Features

- **Fanned Card Layout**: Cards are arranged in a fan pattern with rotation and positioning
- **Visual Status Indicators**: Shows locked, current, and defeated states
- **Magical Effects**: Includes sparkle animations and glowing effects for special states
- **Interactive Tooltips**: Detailed information on hover
- **Responsive Design**: Adapts to different screen sizes
- **Progress Tracking**: Shows wizard progress through the campaign

## Usage

```tsx
import { CampaignOpponentFan } from "@/components/CampaignOpponentFan";

<CampaignOpponentFan
  opponents={campaignOpponents}
  selectedWizardProgress={{
    defeatedOpponents: [1, 2, 3],
    currentOpponent: 4,
    hasCompletionRelic: false,
  }}
  className="mb-8"
/>;
```

## Props

### `opponents` (required)

- Type: `Doc<"wizards">[]`
- Description: Array of campaign opponent wizard documents

### `selectedWizardProgress` (optional)

- Type: `{ defeatedOpponents: number[]; currentOpponent: number; hasCompletionRelic: boolean; }`
- Description: Progress data for the selected wizard

### `className` (optional)

- Type: `string`
- Description: Additional CSS classes to apply to the component

## Visual States

### Opponent Card States

1. **Locked** (Gray, reduced opacity)
   - Opponents that haven't been unlocked yet
   - Shows lock icon

2. **Current** (Blue ring, pulsing animation)
   - The next opponent to face
   - Includes magical sparkle effects
   - Glowing animation

3. **Defeated** (Green ring, sparkle effects)
   - Opponents that have been defeated
   - Shows checkmark icon
   - Magical sparkle effects

4. **Available** (Default state)
   - Unlocked opponents that can be challenged

### Visual Effects

- **Fan Animation**: Cards enter with staggered timing
- **Floating Animation**: Subtle up/down movement
- **Hover Effects**: Scale up and increase z-index on hover
- **Magical Sparkles**: Animated sparkle effects for special states
- **Glowing Rings**: Pulsing glow effects for current/defeated opponents

## Layout Details

### Fan Positioning

- Cards are arranged in a semicircle fan pattern
- Center cards appear on top (higher z-index)
- Rotation and translation calculated based on position from center
- Maximum rotation: ±25 degrees
- Maximum horizontal translation: ±120 pixels
- Vertical translation creates arc effect

### Card Design

- 32x40 (w-32 h-40) card size
- Gradient header with opponent number
- Avatar display
- Difficulty indicator with colored icon
- Status indicators (lock, checkmark, crown)

### Animations

- Entrance animation with staggered delays (0.1s per card)
- Continuous floating animation (3s cycle)
- Hover scale effect (110% scale)
- Magical sparkle rotation (1.5s cycle)

## Accessibility

- Tooltips provide detailed information
- Proper ARIA labels and descriptions
- Keyboard navigation support through tooltip system
- High contrast indicators for different states

## Performance

- Efficient rendering with proper key props
- CSS animations for smooth performance
- Minimal re-renders through proper prop structure
- Optimized for 10 opponents (campaign standard)

## Integration

The component is integrated into the campaign page (`src/app/campaign/page.tsx`) and appears:

1. After the main header
2. Before the wizard selection section
3. Only when campaign opponents are loaded
4. Updates based on selected wizard progress

## Styling

The component uses:

- Tailwind CSS for styling
- Custom CSS animations in `globals.css`
- Radix UI components for tooltips and avatars
- Lucide React icons for visual indicators

## Testing

Comprehensive test suite covers:

- Basic rendering
- Prop handling
- Visual state changes
- Progress indicator display
- Sorting functionality
- Error handling
