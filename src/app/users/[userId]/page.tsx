import { Metadata } from "next";
import { UserProfilePage } from "@/components/UserProfilePage";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { generateCompleteUserProfileMetadata } from "@/lib/metadata";

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  // Create a server-side Convex client for metadata generation
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    const userProfile = await convex.query(api.userProfiles.getUserProfile, {
      userId: decodedUserId,
    });

    if (!userProfile) {
      return {
        title: `User @${decodedUserId} - AI Wizard Duel`,
        description: `User profile for @${decodedUserId} on AI Wizard Duel`,
        robots: "noindex",
      };
    }

    // Use the metadata utility to generate complete metadata
    const completeMetadata = generateCompleteUserProfileMetadata(userProfile);

    return completeMetadata;
  } catch (error) {
    console.error("Error generating metadata for user profile:", error);
    return {
      title: `User @${decodedUserId} - AI Wizard Duel`,
      description: `User profile for @${decodedUserId} on AI Wizard Duel`,
      robots: "noindex",
    };
  }
}

export default async function UserProfilePageRoute({
  params,
}: UserProfilePageProps) {
  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  return <UserProfilePage userId={decodedUserId} />;
}
