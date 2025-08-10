import type { Metadata } from "next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";

interface WizardLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    // Fetch wizard data using safe query
    const wizard = await fetchQuery(api.wizards.getWizardSafe, {
      wizardId: id,
    });

    if (wizard) {
      const winLossRecord =
        wizard.wins || wizard.losses
          ? ` (${wizard.wins || 0}W-${wizard.losses || 0}L)`
          : "";

      const baseMetadata = {
        title: `${wizard.name}${winLossRecord}`,
        description: `View ${wizard.name}'s profile, stats, and duel history in AI Wizard Duel. ${wizard.description}`,
      };

      // Add Open Graph image if wizard has an illustration
      if (wizard.illustration) {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const imageUrl = `${convexUrl}/api/storage/${wizard.illustration}`;

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
                  alt: `${wizard.name} - ${wizard.description}`,
                },
              ],
            },
            twitter: {
              card: "summary_large_image",
              title: baseMetadata.title,
              description: baseMetadata.description,
              images: [imageUrl],
            },
          };
        }
      }

      return baseMetadata;
    }

    return {
      title: "Wizard Profile",
      description:
        "View wizard profile, stats, and duel history in AI Wizard Duel.",
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Wizard Profile",
      description:
        "View wizard profile, stats, and duel history in AI Wizard Duel.",
    };
  }
}

export default function WizardLayout({ children }: WizardLayoutProps) {
  return children;
}
