"use client";

import { use } from "react";
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
import { CreateWizardModal } from "@/components/CreateWizardModal";
import { ConvexImage } from "@/components/ConvexImage";
import Image from "next/image";
import {
  Swords,
  Users,
  Calendar,
  Trophy,
  Sparkles,
  UserPlus,
  AlertCircle,
  Loader2,
  XCircle,
  Hash,
  Star,
  Heart,
} from "lucide-react";

interface JoinShortcodePageProps {
  params: Promise<{
    shortcode: string;
  }>;
}

export default function JoinShortcodePage({ params }: JoinShortcodePageProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null
  );
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateWizardModal, setShowCreateWizardModal] = useState(false);
  const { shortcode } = use(params);

  const duel = useQuery(api.duels.getDuelByShortcode, {
    shortcode: shortcode.toUpperCase(),
  });

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );

  const joinDuel = useMutation(api.duels.joinDuel);

  // Check if user is already in the duel (moved before early returns)
  const isAlreadyInDuel = duel?.players?.includes(user?.id || "") || false;

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`
      );
    }
  }, [isLoaded, user, router]);

  // Redirect to duel page when duel is found
  useEffect(() => {
    if (duel?._id) {
      router.push(`/duels/${duel._id}`);
    }
  }, [duel?._id, router]);

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

  const handleWizardCreated = () => {
    setShowCreateWizardModal(false);
  };

  // Loading state
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400 mx-auto"></div>
            <div
              className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-purple-400/60 dark:border-t-purple-300/60 animate-spin mx-auto"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <p className="text-foreground dark:text-foreground/95 font-medium">
                Loading...
              </p>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-sm">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-destructive dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  Duel Not Found
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  The shortcode &quot;
                  <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                    {shortcode.toUpperCase()}
                  </span>
                  &quot; doesn&apos;t match any active duels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground dark:text-muted-foreground/80 mb-6">
                  The duel may have been completed, cancelled, or the shortcode
                  might be incorrect.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/dashboard">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link href="/duels/join">
                    <Button
                      variant="outline"
                      className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
                    >
                      <Swords className="h-4 w-4 mr-2" />
                      Browse Open Duels
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
  if (duel === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400 mx-auto"></div>
            <div
              className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-purple-400/60 dark:border-t-purple-300/60 animate-spin mx-auto"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl px-6 py-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
              <p className="text-foreground dark:text-foreground/95 font-medium">
                Loading duel...
              </p>
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-sm">
              Verifying shortcode
            </p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section - Challenger Wizard */}
          {challengerWizard && canJoinDuel && (
            <div className="mb-8">
              <Card className="overflow-hidden bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-2xl dark:shadow-3xl">
                <div className="relative">
                  {challengerWizard.illustration && (
                    <div className="h-80 md:h-96 w-full overflow-hidden">
                      <ConvexImage
                        storageId={challengerWizard.illustration}
                        alt={challengerWizard.name}
                        width={800}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  )}

                  {/* Challenge Badge */}
                  <div className="absolute top-6 left-6">
                    <Badge className="bg-red-500/90 dark:bg-red-600/90 text-white border-red-400/50 dark:border-red-500/50 backdrop-blur-sm text-sm px-3 py-1.5 flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      Challenge Issued
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
                        {duel.points[challengerWizard._id] || 0}
                      </Badge>
                    )}
                    {duel?.hitPoints && (
                      <Badge
                        variant="destructive"
                        className="bg-red-100/90 dark:bg-red-900/60 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/30 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Heart className="h-3 w-3" />
                        {duel.hitPoints[challengerWizard._id] || 100}
                      </Badge>
                    )}
                  </div>

                  {/* Wizard Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl md:text-4xl font-bold">
                            {challengerWizard.name}
                          </h1>
                          {challengerWizard.wins || challengerWizard.losses ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100/90 dark:bg-green-900/60 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30 backdrop-blur-sm flex items-center gap-1"
                            >
                              <Trophy className="h-3 w-3" />
                              {challengerWizard.wins || 0}W -{" "}
                              {challengerWizard.losses || 0}L
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100/90 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 backdrop-blur-sm flex items-center gap-1"
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
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent mb-2">
                  You Have Been Challenged!
                </h2>
                <p className="text-muted-foreground dark:text-muted-foreground/80 text-lg">
                  {challengerWizard.name} awaits your response to this magical
                  duel
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

          {/* Non-joinable duel or no challenger - show basic header */}
          {(!canJoinDuel || !challengerWizard) && (
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Join Duel
                </h2>
                <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400 scale-x-[-1]" />
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground dark:text-muted-foreground/80">
                <Hash className="h-4 w-4" />
                <span>Shortcode:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-900/30 px-2 py-1 rounded border border-purple-200/50 dark:border-purple-700/30">
                  {duel.shortcode}
                </span>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            {!canJoinDuel ? (
              <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                    <AlertCircle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                    Duel Status
                  </CardTitle>
                  <CardDescription className="dark:text-muted-foreground/80">
                    This duel is no longer accepting new players
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                      <span className="text-muted-foreground dark:text-muted-foreground/80 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Status:
                      </span>
                      <Badge
                        variant={
                          duel.status === "COMPLETED" ? "outline" : "default"
                        }
                        className={
                          duel.status === "COMPLETED"
                            ? "bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30"
                            : "bg-green-100/80 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30"
                        }
                      >
                        {duel.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                      <span className="text-muted-foreground dark:text-muted-foreground/80 flex items-center gap-2">
                        <Swords className="h-4 w-4" />
                        Type:
                      </span>
                      <span className="font-medium text-foreground dark:text-foreground/95">
                        {typeof duel.numberOfRounds === "number"
                          ? `${duel.numberOfRounds} Round Duel`
                          : "Duel to the Death"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background/50 dark:bg-background/30 rounded-lg border border-border/30 dark:border-border/20">
                      <span className="text-muted-foreground dark:text-muted-foreground/80 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Players:
                      </span>
                      <span className="font-medium text-foreground dark:text-foreground/95">
                        {duel.players.length}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Link href="/dashboard">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link href="/duels/join">
                      <Button
                        variant="outline"
                        className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
                      >
                        <Swords className="h-4 w-4 mr-2" />
                        Browse Open Duels
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Duel Information - Compact Version */}
                {canJoinDuel && (
                  <Card className="mb-6 bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
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
                )}

                {!wizards || wizards.length === 0 ? (
                  <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                        <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Create Your First Wizard
                      </CardTitle>
                      <CardDescription className="dark:text-muted-foreground/80">
                        You need at least one wizard to join a duel
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground dark:text-muted-foreground/80 mb-6">
                        Create your magical wizard to participate in this epic
                        duel!
                      </p>
                      <Button
                        onClick={() => setShowCreateWizardModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create Wizard
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                        <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        Select Your Wizard
                      </CardTitle>
                      <CardDescription className="dark:text-muted-foreground/80">
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
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                                : "border-border hover:border-muted-foreground"
                            }`}
                            onClick={() => handleWizardSelect(wizard._id)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Wizard Image */}
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
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
                                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
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
                                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
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
                        <div className="flex items-center gap-2 text-sm text-destructive dark:text-red-400 mt-2 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200/50 dark:border-red-800/30">
                          <AlertCircle className="h-4 w-4" />
                          Please select a wizard
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleJoinDuel}
                          disabled={!selectedWizard || isJoining}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isJoining ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                          onClick={() => setShowCreateWizardModal(true)}
                          disabled={isJoining}
                          className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30 disabled:opacity-50"
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

      <CreateWizardModal
        open={showCreateWizardModal}
        onOpenChange={setShowCreateWizardModal}
        onSuccess={handleWizardCreated}
      />
    </div>
  );
}
