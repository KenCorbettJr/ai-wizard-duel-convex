interface UserProfileStructuredDataProps {
  userProfile: {
    userId: string;
    displayName?: string;
    joinDate: number;
    totalWizards: number;
    totalDuels: number;
    wins: number;
    losses: number;
    winRate: number;
  };
}

export function UserProfileStructuredData({
  userProfile,
}: UserProfileStructuredDataProps) {
  const displayName = userProfile.displayName || userProfile.userId;
  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : "https://ai-wizard-duel.com"}/users/${userProfile.userId}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: `@${userProfile.userId}`,
      url: profileUrl,
      description: `${displayName} is a wizard duelist on AI Wizard Duel with ${userProfile.totalWizards} wizard${userProfile.totalWizards !== 1 ? "s" : ""} and a ${userProfile.winRate}% win rate.`,
      dateCreated: new Date(userProfile.joinDate).toISOString(),
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CreateAction",
          name: "Wizards Created",
          userInteractionCount: userProfile.totalWizards,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/CompeteAction",
          name: "Duels Participated",
          userInteractionCount: userProfile.totalDuels,
        },
        {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WinAction",
          name: "Duels Won",
          userInteractionCount: userProfile.wins,
        },
      ],
      knowsAbout: [
        "AI Wizard Dueling",
        "Magical Combat",
        "Spell Casting",
        "Turn-based Strategy",
      ],
    },
    about: {
      "@type": "Game",
      name: "AI Wizard Duel",
      description:
        "A multiplayer wizard dueling game where players create magical wizards and engage in turn-based spell-casting battles.",
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://ai-wizard-duel.com",
      genre: "Strategy Game",
      gamePlatform: "Web Browser",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
