import { Metadata } from "next";

export const metadata: Metadata = {
  // Keep the site suffix for child pages too (a plain string title here
  // would drop the root template for everything below).
  title: {
    default: "Campaign",
    template: "%s | AI Wizard Duel",
  },
  description:
    "Take your wizards through a challenging single-player campaign against 10 unique AI opponents. Earn powerful relics and permanent upgrades.",
};

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Magical background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-campaign-pulse"></div>
        <div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-campaign-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-campaign-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
