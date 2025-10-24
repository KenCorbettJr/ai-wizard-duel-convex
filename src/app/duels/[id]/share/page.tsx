"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ConvexImage } from "@/components/ConvexImage";
import { safeConvexId } from "../../../../lib/utils";

import {
  Swords,
  Users,
  Calendar,
  Trophy,
  Sparkles,
  AlertCircle,
  Hash,
  Star,
  Heart,
  Copy,
  Share2,
  Eye,
} from "lucide-react";

interface DuelSharePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DuelSharePage({ params }: DuelSharePageProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [copySuccess, setCopySuccess] = useState(false);
  const { id } = use(params);

  // Validate the ID format first
  const duelId = safeConvexId<"duels">(id);

  const duel = useQuery(api.duels.getDuel, duelId ? { duelId } : "skip");

  // Fetch wizard data for the creator's wizard (first wizard in the duel)
  const creatorWizard = useQuery(
    api.wizards.getWizard,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`
      );
    }
  }, [isLoaded, user, router]);

  // Check if user is the creator of this duel
  const isCreator = creatorWizard?.owner === user?.id;

  // Redirect non-creators to the regular duel page
  useEffect(() => {
    if (duel && creatorWizard && !isCreator) {
      router.push(`/duels/${duel._id}`);
    }
  }, [duel, creatorWizard, isCreator, router]);

  const handleCopyLink = async () => {
    if (!duel?.shortcode) return;

    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleShare = async () => {
    if (!duel?.shortcode) return;

    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`;
    const text = `${creatorWizard?.name} challenges you to a magical duel! Join the battle: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Wizard Duel Challenge",
          text: text,
          url: url,
        });
      } catch {
        // Fallback to copy if share fails
        handleCopyLink();
      }
    } else {
      // Fallback to copy if share is not supported
      handleCopyLink();
    }
  };

  // Loading state
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400 mx-auto"></div>
          </div>
          <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <p className="text-foreground dark:text-foreground/95 font-medium">
                Loading...
              </p>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-sm">
              Preparing duel details
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Duel not found or invalid ID
  if (duel === null || duelId === null) {
    const isInvalidId = duelId === null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-destructive dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  {isInvalidId ? "Invalid Duel ID" : "Duel Not Found"}
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  {isInvalidId
                    ? "The duel ID in the URL is not valid."
                    : "The duel you're looking for doesn't exist or has been removed."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 justify-center">
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Still loading duel
  if (duel === undefined || creatorWizard === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400 mx-auto"></div>
          </div>
          <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <p className="text-foreground dark:text-foreground/95 font-medium">
                Loading duel...
              </p>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-sm">
              Preparing challenge details
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not creator (handled in useEffect, but this is a fallback)
  if (!isCreator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section - Creator's Wizard */}
          {creatorWizard && (
            <div className="mb-8">
              <Card className="overflow-hidden bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-2xl dark:shadow-3xl">
                <div className="relative">
                  {creatorWizard.illustration && (
                    <div className="h-80 md:h-120 w-full overflow-hidden">
                      <ConvexImage
                        storageId={creatorWizard.illustration}
                        alt={creatorWizard.name}
                        width={800}
                        height={400}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  )}

                  {/* Challenge Badge */}
                  <div className="absolute top-6 left-6">
                    <Badge className="bg-green-500/90 dark:bg-green-600/90 text-white border-green-400/50 dark:border-green-500/50 backdrop-blur-sm text-sm px-3 py-1.5 flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      Challenge Created
                    </Badge>
                  </div>

                  {/* Duel Stats */}
                  <div className="absolute top-6 right-6 flex gap-2">
                    {duel?.points && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100/90 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 border-yellow-200/50 dark:border-yellow-700/30 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" />
                        {duel.points[creatorWizard._id] || 0}
                      </Badge>
                    )}
                    {duel?.hitPoints && (
                      <Badge
                        variant="destructive"
                        className="bg-red-100/90 dark:bg-red-900/60 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/30 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Heart className="h-3 w-3" />
                        {duel.hitPoints[creatorWizard._id] || 100}
                      </Badge>
                    )}
                  </div>

                  {/* Wizard Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl md:text-4xl font-bold">
                            {creatorWizard.name}
                          </h1>
                          {creatorWizard.wins || creatorWizard.losses ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100/90 dark:bg-green-900/60 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Trophy className="h-3 w-3" />
                              {creatorWizard.wins || 0}W -{" "}
                              {creatorWizard.losses || 0}L
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100/90 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              Ready to Duel
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg text-white/90 leading-relaxed max-w-2xl">
                          {creatorWizard.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Challenge Call to Action */}
              <div className="mt-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent mb-2">
                  Your Challenge is Ready!
                </h2>
                <p className="text-muted-foreground dark:text-muted-foreground/80 text-lg">
                  Share this duel with someone you want to challenge
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
                  <Hash className="h-4 w-4" />
                  <span>Duel Code:</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-200/50 dark:border-purple-700/30">
                    {duel.shortcode}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Duel Information */}
            <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Duel Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Swords className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                      <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/80">
                        Type
                      </span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-foreground/95">
                      {typeof duel.numberOfRounds === "number"
                        ? `${duel.numberOfRounds} Rounds`
                        : "To the Death"}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/80">
                        Players
                      </span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-foreground/95">
                      {duel.players.length}/2
                    </span>
                  </div>
                  <div className="text-center p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-green-500 dark:text-green-400" />
                      <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/80">
                        Created
                      </span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-foreground/95">
                      {new Date(duel.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Challenge */}
            <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <Share2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Share Your Challenge
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  Send this link to someone you want to challenge to a magical
                  duel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Challenge Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-purple-100/80 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-md text-sm font-mono border border-purple-200/50 dark:border-purple-700/30 flex-1 truncate">
                      {`${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="border-purple-200 dark:border-purple-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    >
                      {copySuccess ? (
                        <>
                          <span className="text-green-600 dark:text-green-400">
                            ✓
                          </span>
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleShare}
                    className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Challenge
                  </Button>
                  <Link href={`/duels/${duel._id}`}>
                    <Button
                      variant="outline"
                      className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Duel
                    </Button>
                  </Link>
                </div>

                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                    Once someone joins using this link, the duel will begin!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
