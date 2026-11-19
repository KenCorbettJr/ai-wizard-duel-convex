"use client";

import { use, Suspense } from "react";
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
import { RuneSpinner } from "@/components/ui/rune-spinner";

interface DuelSharePageProps {
  params: Promise<{
    id: string;
  }>;
}

function DuelShareContent({ params }: DuelSharePageProps) {
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
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <RuneSpinner size="md" label="Loading…" />
          </div>
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-foreground font-medium">Loading...</p>
            </div>
            <p className="text-muted-foreground text-sm">
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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  {isInvalidId ? "Invalid Duel ID" : "Duel Not Found"}
                </CardTitle>
                <CardDescription>
                  {isInvalidId
                    ? "The duel ID in the URL is not valid."
                    : "The duel you're looking for doesn't exist or has been removed."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/">Go to Dashboard</Link>
                  </Button>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <RuneSpinner size="md" label="Loading…" />
          </div>
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-foreground font-medium">Loading duel...</p>
            </div>
            <p className="text-muted-foreground text-sm">
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section - Creator's Wizard */}
          {creatorWizard && (
            <div className="mb-8">
              <Card className="overflow-hidden bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl dark:shadow-3xl">
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
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  )}

                  {/* Challenge Badge */}
                  <div className="absolute top-6 left-6">
                    <Badge className="bg-success/90 text-white border-success/50 backdrop-blur-sm text-sm px-3 py-1.5 flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      Challenge Created
                    </Badge>
                  </div>

                  {/* Duel Stats */}
                  <div className="absolute top-6 right-6 flex gap-2">
                    {duel?.points && (
                      <Badge
                        variant="secondary"
                        className="bg-warning/90 text-warning-foreground border-warning/50 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Star className="h-3 w-3" />
                        {duel.points[creatorWizard._id] || 0}
                      </Badge>
                    )}
                    {duel?.hitPoints && (
                      <Badge
                        variant="destructive"
                        className="bg-destructive/90 text-destructive-foreground border-destructive/50 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Heart className="h-3 w-3" />
                        {duel.hitPoints[creatorWizard._id] ?? 100}
                      </Badge>
                    )}
                  </div>

                  {/* Wizard Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
                            {creatorWizard.name}
                          </h1>
                          {creatorWizard.wins || creatorWizard.losses ? (
                            <Badge
                              variant="outline"
                              className="bg-success/90 text-success-foreground border-success/50 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Trophy className="h-3 w-3" />
                              {creatorWizard.wins || 0}W -{" "}
                              {creatorWizard.losses || 0}L
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-info/90 text-info-foreground border-info/50 backdrop-blur-sm flex items-center gap-1"
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
                <h2 className="text-2xl md:text-3xl font-bold text-gold-gradient font-display mb-2">
                  Your Challenge is Ready!
                </h2>
                <p className="text-muted-foreground text-lg">
                  Share this duel with someone you want to challenge
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>Duel Code:</span>
                  <span className="font-mono font-bold text-primary bg-primary/50 px-2 py-1 rounded border border-primary/50">
                    {duel.shortcode}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Duel Information */}
            <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Duel Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Swords className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Type
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {typeof duel.numberOfRounds === "number"
                        ? `${duel.numberOfRounds} Rounds`
                        : "To the Death"}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-info" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Players
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {duel.players.length}/2
                    </span>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Created
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      {new Date(duel.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Challenge */}
            <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Share2 className="h-5 w-5 text-success" />
                  Share Your Challenge
                </CardTitle>
                <CardDescription>
                  Send this link to someone you want to challenge to a magical
                  duel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background/50 rounded-lg border border-border/30">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Challenge Link
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-primary/80 text-primary-foreground rounded-md text-sm font-mono border border-primary/50 flex-1 truncate">
                      {`${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="border-primary/30 hover:bg-primary/8 text-primary"
                    >
                      {copySuccess ? (
                        <>
                          <span className="text-success">✓</span>
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
                    className="flex-1 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Challenge
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30"
                  >
                    <Link href={`/duels/${duel._id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Duel
                    </Link>
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-sm text-muted-foreground">
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

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <RuneSpinner size="md" label="Loading…" />
        </div>
        <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-foreground font-medium">Loading duel...</p>
          </div>
          <p className="text-muted-foreground text-sm">
            Preparing share options
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DuelSharePage({ params }: DuelSharePageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DuelShareContent params={params} />
    </Suspense>
  );
}
