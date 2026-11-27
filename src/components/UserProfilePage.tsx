"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WizardCard } from "@/components/WizardCard";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { UserProfileStructuredData } from "@/components/UserProfileStructuredData";
import {
  Calendar,
  Trophy,
  Zap,
  Target,
  Users,
  Sparkles,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface UserProfilePageProps {
  userId: string;
}

export function UserProfilePage({ userId }: UserProfilePageProps) {
  const { user } = useUser();
  const userProfile = useQuery(api.userProfiles.getUserProfile, { userId });
  const userWizards = useQuery(api.userProfiles.getUserWizards, { userId });
  const currentUserStatus = useQuery(
    api.userProfiles.getCurrentUserProfileStatus,
    {},
  );

  // Check if this is the current user's own profile
  const isOwnProfile = currentUserStatus?.userId === userId;

  // Loading state
  if (userProfile === undefined || userWizards === undefined) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Profile header skeleton */}
          <div className="bg-arcane-soft rounded-lg p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-24 h-24 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse w-48" />
                <div className="h-4 bg-muted rounded animate-pulse w-32" />
                <div className="flex gap-4">
                  <div className="h-6 bg-muted rounded animate-pulse w-24" />
                  <div className="h-6 bg-muted rounded animate-pulse w-24" />
                </div>
              </div>
            </div>
          </div>

          {/* Wizards skeleton */}
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-32 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-96 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User not found
  if (userProfile === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center space-y-6">
          <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Users className="w-16 h-16 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
              User Not Found
            </h1>
            <p className="text-muted-foreground text-lg">
              The user @{userId} doesn&apos;t exist or hasn&apos;t completed
              their profile setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const joinDate = new Date(userProfile.joinDate);
  const joinDateFormatted = formatDistanceToNow(joinDate, { addSuffix: true });

  return (
    <>
      <UserProfileStructuredData userProfile={userProfile} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Profile Header */}
          <div className="bg-arcane-soft rounded-lg p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {isOwnProfile && user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/40"
                />
              ) : (
                <div className="w-24 h-24 bg-arcane rounded-full flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              )}

              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
                      {userProfile.displayName || userProfile.userId}
                    </h1>
                    {isOwnProfile && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Link href="/profile/edit">
                          <Settings className="w-4 h-4" />
                          Edit Profile
                        </Link>
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-lg">@{userProfile.userId}</span>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      Joined {joinDateFormatted}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {userProfile.totalWizards} Wizard
                    {userProfile.totalWizards !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {userProfile.totalDuels} player duel
                    {userProfile.totalDuels !== 1 ? "s" : ""}
                  </Badge>
                  {userProfile.totalDuels > 0 && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Trophy className="w-3 h-3" />
                      {userProfile.wins}W · {userProfile.losses}L ·{" "}
                      {userProfile.winRate}% wins
                    </Badge>
                  )}
                </div>

                {/* Social sharing */}
                <div className="pt-2">
                  <SocialShareButtons
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/users/${userProfile.userId}`}
                    title={`${userProfile.displayName || userProfile.userId} (@${userProfile.userId}) - AI Wizard Duel`}
                    description={`View ${userProfile.displayName || userProfile.userId}'s magical profile. ${userProfile.totalWizards} wizard${userProfile.totalWizards !== 1 ? "s" : ""}, ${userProfile.totalDuels} duel${userProfile.totalDuels !== 1 ? "s" : ""}, ${userProfile.winRate}% win rate.`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wizards Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Wizards ({userWizards.length})
              </h2>
            </div>

            {userWizards.length === 0 ? (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Zap className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      No Wizards Yet
                    </h3>
                    <p className="text-muted-foreground">
                      @{userProfile.userId} hasn&apos;t created any wizards yet.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userWizards.map((wizard) => (
                  <div key={wizard._id} className="relative">
                    <WizardCard wizard={wizard} className="h-full" />
                    {/* Wizard stats overlay, once it has a record */}
                    {(wizard.wins ?? 0) + (wizard.losses ?? 0) > 0 && (
                      <div className="absolute top-4 left-4">
                        <Badge
                          variant="secondary"
                          className="bg-black/50 text-white border-0"
                        >
                          {wizard.winRate}% wins
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
