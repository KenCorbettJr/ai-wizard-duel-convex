"use client";

import { use, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { ConvexImage } from "@/components/ConvexImage";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import Image from "next/image";
import {
  Swords,
  Users,
  Calendar,
  Trophy,
  Sparkles,
  UserPlus,
  AlertCircle,
  XCircle,
  Hash,
  Star,
  Heart,
  LogIn,
} from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

interface JoinShortcodePageProps {
  params: Promise<{
    shortcode: string;
  }>;
}

function JoinShortcodeContent({ params }: JoinShortcodePageProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null,
  );
  const [isJoining, setIsJoining] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const { shortcode } = use(params);

  const { isProfileComplete, getProfileCompletionPrompt } =
    useProfileCompletion();

  const duel = useQuery(api.duels.getDuelByShortcode, {
    shortcode: shortcode.toUpperCase(),
  });

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );

  const joinDuel = useMutation(api.duels.joinDuel);

  // Check if user is already in the duel (moved before early returns)
  const isAlreadyInDuel = duel?.players?.includes(user?.id || "") || false;

  // Don't redirect unauthenticated users - let them see the duel first

  // Redirect to duel page when user is already in the duel
  useEffect(() => {
    if (duel?._id && isAlreadyInDuel) {
      router.push(`/duels/${duel._id}`);
    }
  }, [duel?._id, isAlreadyInDuel, router]);

  const handleWizardSelect = (wizardId: Id<"wizards">) => {
    setSelectedWizard(wizardId);
  };

  const handleJoinDuel = async () => {
    if (!user?.id || !duel || !selectedWizard) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: duel._id,
        wizards: [selectedWizard],
      });
      router.push(`/duels/${duel._id}`);
    } catch (error) {
      console.error("Failed to join duel:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateWizard = () => {
    if (isProfileComplete) {
      router.push("/wizards/create");
    } else {
      setShowProfilePrompt(true);
    }
  };

  const profilePrompt = getProfileCompletionPrompt("create wizards");

  // Loading state - only show loading if Clerk is still loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RuneSpinner size="lg" hideLabel label="Loading…" className="mb-6" />
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-foreground font-medium">Loading...</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Preparing to join duel
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Duel not found
  if (duel === null) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Duel Not Found
                </CardTitle>
                <CardDescription>
                  The shortcode &quot;
                  <span className="font-mono font-semibold text-primary">
                    {shortcode.toUpperCase()}
                  </span>
                  &quot; doesn&apos;t match any active duels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  The duel may have been completed, cancelled, or the shortcode
                  might be incorrect.
                </p>
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
  if (duel === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RuneSpinner size="lg" hideLabel label="Loading…" className="mb-6" />
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-foreground font-medium">Loading duel...</p>
            </div>
            <p className="text-muted-foreground text-sm">Verifying shortcode</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAlreadyInDuel) {
    return null;
  }

  // Check if duel is still accepting players
  const canJoinDuel = duel.status === "WAITING_FOR_PLAYERS";

  // Get the challenger wizard (first wizard in the duel)
  const challengerWizard = wizard1;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section - Challenger Wizard */}
          {challengerWizard && canJoinDuel && (
            <div className="mb-8">
              <Card className="overflow-hidden bg-card/90 backdrop-blur-sm border-border/50 shadow-2xl dark:shadow-3xl">
                <div className="relative">
                  {challengerWizard.illustration && (
                    <div className="h-80 md:h-120 w-full overflow-hidden">
                      <ConvexImage
                        storageId={challengerWizard.illustration}
                        alt={challengerWizard.name}
                        width={800}
                        height={400}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  )}

                  {/* Challenge Badge */}
                  <div className="absolute top-6 left-6">
                    <Badge className="bg-destructive/90 text-white border-destructive/50 backdrop-blur-sm text-sm px-3 py-1.5 flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      Challenge Issued
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
                        {duel.points[challengerWizard._id] || 0}
                      </Badge>
                    )}
                    {duel?.hitPoints && (
                      <Badge
                        variant="destructive"
                        className="bg-destructive/90 text-destructive-foreground border-destructive/50 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Heart className="h-3 w-3" />
                        {duel.hitPoints[challengerWizard._id] ?? 100}
                      </Badge>
                    )}
                  </div>

                  {/* Wizard Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
                            {challengerWizard.name}
                          </h1>
                          {challengerWizard.wins || challengerWizard.losses ? (
                            <Badge
                              variant="outline"
                              className="bg-success/90 text-success-foreground border-success/50 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Trophy className="h-3 w-3" />
                              {challengerWizard.wins || 0}W -{" "}
                              {challengerWizard.losses || 0}L
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-info/90 text-info-foreground border-info/50 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              New Challenger
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg text-white/90 leading-relaxed max-w-2xl">
                          {challengerWizard.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Challenge Call to Action */}
              <div className="mt-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gold-gradient font-display mb-2">
                  You Have Been Challenged!
                </h2>
                <p className="text-muted-foreground text-lg">
                  {challengerWizard.name} awaits your response to this magical
                  duel
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

          {/* Non-joinable duel or no challenger - show basic header */}
          {(!canJoinDuel || !challengerWizard) && (
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Swords className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold text-gold-gradient font-display">
                  Join Duel
                </h2>
                <Swords className="h-8 w-8 text-primary scale-x-[-1]" />
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Shortcode:</span>
                <span className="font-mono font-bold text-primary bg-primary/50 px-2 py-1 rounded border border-primary/50">
                  {duel.shortcode}
                </span>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            {!canJoinDuel ? (
              <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Duel Status
                  </CardTitle>
                  <CardDescription>
                    This duel is no longer accepting new players
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Status:
                      </span>
                      <Badge
                        variant={
                          duel.status === "COMPLETED" ? "outline" : "default"
                        }
                        className={
                          duel.status === "COMPLETED"
                            ? "bg-info/80 text-info-foreground border-info/50"
                            : "bg-success/80 text-success-foreground border-success/50"
                        }
                      >
                        {duel.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Swords className="h-4 w-4" />
                        Type:
                      </span>
                      <span className="font-medium text-foreground">
                        {typeof duel.numberOfRounds === "number"
                          ? `${duel.numberOfRounds} Round Duel`
                          : "Duel to the Death"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Players:
                      </span>
                      <span className="font-medium text-foreground">
                        {duel.players.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Button asChild>
                      <Link href="/">Go to Dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Duel Information - Compact Version */}
                {canJoinDuel && (
                  <Card className="mb-6 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
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
                )}

                {!user ? (
                  <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <LogIn className="h-5 w-5 text-primary" />
                        Sign In to Join Duel
                      </CardTitle>
                      <CardDescription>
                        Create an account or sign in to participate in this epic
                        duel
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        Join the magical world of wizard dueling! Create your
                        account to build wizards and challenge other players.
                      </p>
                      <div className="flex gap-3">
                        <Button asChild>
                          <Link
                            href={`/sign-in?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Sign In
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="border-primary/30 text-primary hover:bg-primary/8"
                        >
                          <Link
                            href={`/sign-up?redirect_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Account
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : !wizards || wizards.length === 0 ? (
                  <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Create Your First Wizard
                      </CardTitle>
                      <CardDescription>
                        You need at least one wizard to join a duel
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        Create your magical wizard to participate in this epic
                        duel!
                      </p>
                      <Button onClick={handleCreateWizard}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create Wizard
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Select Your Wizard
                      </CardTitle>
                      <CardDescription>
                        Choose which wizard will represent you in this duel
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        {wizards.map((wizard) => (
                          <div
                            key={wizard._id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedWizard === wizard._id
                                ? "border-primary bg-primary/8"
                                : "border-border hover:border-muted-foreground"
                            }`}
                            onClick={() => handleWizardSelect(wizard._id)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Wizard Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                {wizard.illustration ? (
                                  <ConvexImage
                                    storageId={wizard.illustration}
                                    alt={wizard.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : wizard.illustrationURL ? (
                                  <Image
                                    src={wizard.illustrationURL}
                                    alt={wizard.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-arcane flex items-center justify-center text-white font-bold text-lg">
                                    {wizard.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Wizard Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground">
                                  {wizard.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {wizard.description}
                                </p>
                              </div>

                              {/* Stats and Selection Indicator */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {wizard.wins || wizard.losses ? (
                                  <Badge variant="outline">
                                    {wizard.wins || 0}W - {wizard.losses || 0}L
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">New</Badge>
                                )}
                                {selectedWizard === wizard._id && (
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!selectedWizard && (
                        <div className="flex items-center gap-2 text-sm text-destructive mt-2 p-3 bg-destructive/50 rounded-lg border border-destructive/50">
                          <AlertCircle className="h-4 w-4" />
                          Please select a wizard
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleJoinDuel}
                          disabled={!selectedWizard || isJoining}
                          className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isJoining ? (
                            <>
                              <RuneSpinner
                                size="xs"
                                label="Working…"
                                className="mr-2"
                              />
                              Joining Duel...
                            </>
                          ) : (
                            <>
                              <Swords className="h-4 w-4 mr-2" />
                              Join Duel
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCreateWizard}
                          disabled={isJoining}
                          className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30 disabled:opacity-50"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create New Wizard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ProfileCompletionPrompt
        open={showProfilePrompt}
        onOpenChange={setShowProfilePrompt}
        title={profilePrompt.title}
        message={profilePrompt.message}
        actionLabel={profilePrompt.actionLabel}
        onAction={profilePrompt.onAction}
        isSignInPrompt={!user}
      />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <RuneSpinner size="lg" hideLabel label="Loading…" className="mb-6" />
        <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-foreground font-medium">Loading duel...</p>
          </div>
          <p className="text-muted-foreground text-sm">Preparing to join</p>
        </div>
      </div>
    </div>
  );
}

export default function JoinShortcodePage({ params }: JoinShortcodePageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinShortcodeContent params={params} />
    </Suspense>
  );
}
