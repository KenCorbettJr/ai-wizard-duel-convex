import type { Metadata } from "next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";

interface DuelLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Fetch duel data
    const duel = await fetchQuery(api.duels.getDuel, {
      duelId: id as Id<"duels">,
    });

    if (!duel || duel.wizards.length < 2) {
      return {
        title: "Duel",
        description: "View an epic magical duel between wizards in AI Wizard Duel.",
      };
    }

    // Fetch wizard data
    const [wizard1, wizard2] = await Promise.all([
      fetchQuery(api.wizards.getWizard, { wizardId: duel.wizards[0] }),
      fetchQuery(api.wizards.getWizard, { wizardId: duel.wizards[1] }),
    ]);

    const baseMetadata = {
      title: wizard1 && wizard2 ? `${wizard1.name} vs ${wizard2.name}` : "Magical Duel",
      description: wizard1 && wizard2 
        ? `Watch the epic magical duel between ${wizard1.name} and ${wizard2.name} in AI Wizard Duel.`
        : "View an epic magical duel between wizards in AI Wizard Duel.",
    };

    // Add Open Graph image if duel has a featured illustration
    if (duel.featuredIllustration) {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        const imageUrl = `${convexUrl}/api/storage/${duel.featuredIllustration}`;
        
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
                alt: `Epic duel between ${wizard1?.name || 'wizard'} and ${wizard2?.name || 'wizard'}`,
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
      title: "Duel",
      description: "View an epic magical duel between wizards in AI Wizard Duel.",
    };
  }
}

export default function DuelLayout({ children }: DuelLayoutProps) {
  return children;
}