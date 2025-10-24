import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import {
  generateCompleteWizardMetadata,
  generateCompleteDefaultMetadata,
} from "@/lib/metadata";
import { safeConvexId } from "../../../lib/utils";
import WizardPageClient from "./WizardPageClient";

interface WizardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: WizardPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const wizardId = safeConvexId<"wizards">(id);

    if (!wizardId) {
      return generateCompleteDefaultMetadata({
        title: "Invalid Wizard - AI Wizard Duel",
        description:
          "The wizard you're looking for could not be found. Explore other magical wizards in our arena.",
      });
    }

    // Fetch wizard data for metadata
    const wizard = await fetchQuery(api.metadata.getWizardForMetadata, {
      wizardId,
    });

    if (!wizard) {
      return generateCompleteDefaultMetadata({
        title: "Wizard Not Found - AI Wizard Duel",
        description:
          "The wizard you're looking for doesn't exist. Discover other powerful wizards ready for battle.",
      });
    }

    // Get optimized image URL if wizard has an illustration
    let optimizedImageUrl: string | undefined;
    if (wizard.illustration) {
      try {
        optimizedImageUrl =
          (await fetchQuery(api.metadata.getOptimizedImageUrl, {
            storageId: wizard.illustration,
          })) || undefined;
      } catch (error) {
        console.warn("Failed to get optimized image URL:", error);
      }
    }

    // Generate complete wizard-specific metadata
    return generateCompleteWizardMetadata(wizard, optimizedImageUrl);
  } catch (error) {
    console.error("Error generating wizard metadata:", error);
    return generateCompleteDefaultMetadata({
      title: "Wizard Profile - AI Wizard Duel",
      description:
        "Explore this wizard's magical abilities and battle history in our AI-powered dueling arena.",
    });
  }
}

import { Suspense } from "react";

function LoadingFallback() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading wizard...</p>
        </div>
      </div>
    </div>
  );
}

export default function WizardPage({ params }: WizardPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WizardPageClient params={params} />
    </Suspense>
  );
}
