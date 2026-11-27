import { Metadata } from "next";
import { Suspense } from "react";
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
        title: `User @${decodedUserId}`,
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
      title: `User @${decodedUserId}`,
      description: `User profile for @${decodedUserId} on AI Wizard Duel`,
      robots: "noindex",
    };
  }
}

async function UserProfileContent({ params }: UserProfilePageProps) {
  const { userId } = await params;
  return <UserProfilePage userId={decodeURIComponent(userId)} />;
}

// Reading params inside Suspense keeps the rest of the route prerenderable,
// the same way the wizard and duel pages do.
export default function UserProfilePageRoute({ params }: UserProfilePageProps) {
  return (
    <Suspense fallback={null}>
      <UserProfileContent params={params} />
    </Suspense>
  );
}
