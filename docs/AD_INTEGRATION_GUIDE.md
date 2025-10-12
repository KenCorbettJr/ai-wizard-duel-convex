# Ad Network Integration Guide

This guide explains how to integrate real ad networks with the AI Wizard Duel application.

## Current Implementation

The current implementation provides:

- Anonymous user session tracking
- Ad interaction tracking (impressions, clicks, completions)
- Placeholder ad components
- Revenue tracking system
- Analytics dashboard

## Integrating Google AdSense

### 1. Setup Google AdSense Account

1. Create a Google AdSense account
2. Add your domain to AdSense
3. Get your AdSense publisher ID

### 2. Add AdSense Script to Your App

Add the AdSense script to your app's head section. In Next.js, you can do this in several ways:

**Option A: Add to layout.tsx (recommended)**

```typescript
// In src/app/layout.tsx
import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3129161716023168"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Option B: Add dynamically in component**

```typescript
// Add Google AdSense script to your app
useEffect(() => {
  const script = document.createElement("script");
  script.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3129161716023168";
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}, []);
```

### 3. Update Ad Display Component

Replace the placeholder ads in `src/components/AdDisplay.tsx`:

```typescript
// Replace placeholder with real AdSense ad
const renderAdContent = () => {
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-3129161716023168"
      data-ad-slot="XXXXXXXXXX" // Replace with your actual ad slot ID
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

// Initialize the ad after rendering
useEffect(() => {
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (err) {
    console.error('AdSense error:', err);
  }
}, []);
```

### 4. Update Revenue Tracking

Integrate with AdSense reporting API to get real revenue data:

```typescript
// In convex/adService.ts
export const syncAdSenseRevenue = internalAction({
  args: { timeframe: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Call AdSense Management API
    // Update revenue data in database
  },
});
```

## Integrating Video Reward Ads

### 1. Choose a Video Ad Network

Popular options:

- Google AdMob (for mobile)
- Unity Ads
- IronSource
- AppLovin

### 2. Update Reward Video Component

Replace the simulation in `src/components/RewardVideoAd.tsx`:

```typescript
const handleWatchVideo = async () => {
  // Initialize video ad
  const videoAd = new RewardedVideoAd("your-ad-unit-id");

  videoAd.onRewardEarned = (reward) => {
    // Track completion and award credits
    trackAdInteraction({
      // ... tracking data
      action: "COMPLETION",
      revenue: reward.amount,
    });
    onRewardEarned?.(1);
  };

  videoAd.show();
};
```

## Environment Variables

Add these to your `.env.local`:

```env
# Google AdSense
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-3129161716023168
ADSENSE_SECRET_KEY=your-secret-key

# Video Ad Network
VIDEO_AD_APP_ID=your-app-id
VIDEO_AD_SECRET=your-secret
```

## Analytics Integration

### Google Analytics 4

Track ad interactions in GA4:

```typescript
// In ad interaction handlers
gtag("event", "ad_impression", {
  ad_type: adType,
  placement: placement,
  revenue: revenue,
});
```

### Custom Analytics

The current implementation already tracks:

- Ad impressions, clicks, completions
- Revenue per placement
- Click-through rates
- Session-based analytics

## Testing

### Development Testing

1. Use test ad units during development
2. Enable test mode in ad networks
3. Verify tracking with analytics tools

### Production Monitoring

1. Monitor ad fill rates
2. Track revenue metrics
3. A/B test ad placements
4. Monitor user experience impact

## Compliance

### GDPR/CCPA

1. Implement consent management
2. Update privacy policy
3. Allow users to opt-out of personalized ads

### App Store Guidelines

1. Ensure ads don't interfere with core functionality
2. Clearly label sponsored content
3. Follow platform-specific ad policies

## Performance Optimization

1. Lazy load ad components
2. Implement ad caching
3. Monitor page load impact
4. Use intersection observers for viewability

## Revenue Optimization

1. A/B test ad placements
2. Optimize ad sizes and formats
3. Implement header bidding
4. Monitor and adjust floor prices

## Support

For implementation help:

- Check ad network documentation
- Use their support channels
- Test thoroughly before production deployment
