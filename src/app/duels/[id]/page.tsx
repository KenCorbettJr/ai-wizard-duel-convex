import { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import {
  generateCompleteDuelMetadata,
  generateCompleteDefaultMetadata,
} from "@/lib/metadata";
import { safeConvexId } from "../../../lib/utils";
import DuelPageClient from "./DuelPageClient";

interface DuelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: DuelPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const duelId = safeConvexId<"duels">(id);

    if (!duelId) {
      return generateCompleteDefaultMetadata({
        title: "Duel Not Found - AI Wizard Duel",
        description:
          "The requested duel could not be found. Join other epic magical battles in the AI Wizard Duel arena.",
      });
    }

    // Fetch duel data for metadata generation
    const duelData = await fetchQuery(api.metadata.getDuelForMetadata, {
      duelId,
    });

    if (!duelData) {
      return generateCompleteDefaultMetadata({
        title: "Duel Not Found - AI Wizard Duel",
        description:
          "The requested duel could not be found. Join other epic magical battles in the AI Wizard Duel arena.",
      });
    }

    // Get optimized image URL if available
    let optimizedImageUrl: string | undefined;
    if (duelData.latestRoundIllustration) {
      try {
        const imageUrl = await fetchQuery(api.metadata.getOptimizedImageUrl, {
          storageId: duelData.latestRoundIllustration,
        });
        optimizedImageUrl = imageUrl || undefined;
      } catch (error) {
        console.warn("Failed to get optimized image URL:", error);
      }
    }

    // Generate complete duel-specific metadata
    return generateCompleteDuelMetadata(duelData, optimizedImageUrl);
  } catch (error) {
    console.error("Error generating duel metadata:", error);

    // Fallback to default metadata on error
    return generateCompleteDefaultMetadata({
      title: "AI Wizard Duel - Magical Battles Await",
      description:
        "Experience epic AI-powered spell-casting duels. Create wizards and engage in strategic magical combat.",
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
          <p className="text-muted-foreground">Loading duel...</p>
        </div>
      </div>
    </div>
  );
}

export default function DuelPage({ params }: DuelPageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DuelPageClient params={params} />
    </Suspense>
  );
}
