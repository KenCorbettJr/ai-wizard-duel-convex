import type { Metadata } from "next";
import { api } from "../../../../convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

interface JoinShortcodeLayoutProps {
  params: Promise<{ shortcode: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ shortcode: string }> }): Promise<Metadata> {
  const { shortcode } = await params;
  
  try {
    // Fetch duel data by shortcode
    const duel = await fetchQuery(api.duels.getDuelByShortcode, {
      shortcode: shortcode.toUpperCase(),
    });

    if (!duel || duel.wizards.length === 0) {
      return {
        title: "Join Duel",
        description: "Join a magical duel using a shortcode and battle other wizards in AI Wizard Duel.",
      };
    }

    // Fetch the challenger wizard (first wizard in the duel)
    const challengerWizard = await fetchQuery(api.wizards.getWizard, { 
      wizardId: duel.wizards[0] 
    });

    const baseMetadata = {
      title: challengerWizard ? `Challenge from ${challengerWizard.name}` : "Join Duel",
      description: challengerWizard 
        ? `${challengerWizard.name} has challenged you to a magical duel! Join the battle in AI Wizard Duel.`
        : "Join a magical duel using a shortcode and battle other wizards in AI Wizard Duel.",
    };

    // Add Open Graph image - prefer duel's featured illustration, fallback to challenger's illustration
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      let imageUrl: string | undefined;
      let altText = "Join a magical duel in AI Wizard Duel";

      if (duel.featuredIllustration) {
        imageUrl = `${convexUrl}/api/storage/${duel.featuredIllustration}`;
        altText = challengerWizard ? `Challenge from ${challengerWizard.name}` : "Magical duel challenge";
      } else if (challengerWizard?.illustration) {
        imageUrl = `${convexUrl}/api/storage/${challengerWizard.illustration}`;
        altText = `${challengerWizard.name} challenges you to a duel`;
      }

      if (imageUrl) {
        return {
          ...baseMetadata,
          openGraph: {
            title: baseMetadata.title,
            description: baseMetadata.description,
            images: [
              {
                url: imageUrl,
                width: 1024,
                height: 1024,
                alt: altText,
              },
            ],
          },
          twitter: {
            card: 'summary_large_image',
            title: baseMetadata.title,
            description: baseMetadata.description,
            images: [imageUrl],
          },
        };
      }
    }

    return baseMetadata;
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Join Duel",
      description: "Join a magical duel using a shortcode and battle other wizards in AI Wizard Duel.",
    };
  }
}

export default function JoinShortcodeLayout({ children }: JoinShortcodeLayoutProps) {
  return children;
}