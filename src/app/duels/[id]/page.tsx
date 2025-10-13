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

export default function DuelPage({ params }: DuelPageProps) {
  return <DuelPageClient params={params} />;
}
