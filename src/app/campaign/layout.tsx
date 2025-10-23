import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign Mode - AI Wizard Duel",
  description:
    "Take your wizards through a challenging single-player campaign against 10 unique AI opponents. Earn powerful relics and permanent upgrades.",
};

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950 dark:via-indigo-950 dark:to-pink-950 relative overflow-hidden">
      {/* Magical background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-300/10 dark:bg-purple-600/10 rounded-full blur-3xl animate-campaign-pulse"></div>
        <div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-indigo-300/10 dark:bg-indigo-600/10 rounded-full blur-3xl animate-campaign-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300/10 dark:bg-pink-600/10 rounded-full blur-3xl animate-campaign-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
