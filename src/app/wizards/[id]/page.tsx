"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { EditWizardForm } from "@/components/EditWizardForm";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Trophy,
  Skull,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  Edit,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface WizardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function WizardPage({ params }: WizardPageProps) {
  const router = useRouter();
  const { user } = useUser();
  const { id } = use(params);

  const [isEditing, setIsEditing] = useState(false);

  // Use safe queries that handle invalid IDs gracefully
  const wizard = useQuery(api.wizards.getWizard, { wizardId: id as Id<"wizards"> });
  const wizardDuels = useQuery(api.duels.getWizardDuelsSafe, { wizardId: id as Id<"wizards"> });

  if (wizard === undefined || wizardDuels === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded mb-6"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (wizard === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Wizard Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The wizard you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const winRate =
    wizard.wins && wizard.losses
      ? Math.round((wizard.wins / (wizard.wins + wizard.losses)) * 100)
      : wizard.wins && !wizard.losses
        ? 100
        : 0;

  const totalDuels = wizardDuels?.length || 0;
  const completedDuels =
    wizardDuels?.filter((duel) => duel.status === "COMPLETED") || [];
  const activeDuels =
    wizardDuels?.filter(
      (duel) =>
        duel.status === "IN_PROGRESS" || duel.status === "WAITING_FOR_PLAYERS"
    ) || [];

  const isOwner = user && wizard && user.id === wizard.owner;

  const handleEditSuccess = () => {
    setIsEditing(false);
    // The wizard data will automatically refresh due to Convex reactivity
  };

  if (isEditing && wizard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EditWizardForm
          wizard={wizard}
          onClose={() => setIsEditing(false)}
          onSuccess={handleEditSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar showBackButton onBackClick={() => router.back()} />

      {/* Hero Image Section */}
      <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] mb-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        {wizard.illustration || wizard.illustrationURL ? (
          <div className="w-full h-full relative overflow-hidden">
            {wizard.illustration ? (
              <ConvexImage
                storageId={wizard.illustration}
                alt={wizard.name}
                width={1200}
                height={600}
                className="w-full h-full object-contain"
              />
            ) : wizard.illustrationURL ? (
              <Image
                src={wizard.illustrationURL}
                alt={wizard.name}
                fill
                className="object-contain"
                priority
              />
            ) : null}
            {/* Subtle gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
            <Zap className="w-24 h-24 text-white" />
          </div>
        )}

        {/* Wizard name overlay */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
              {wizard.name}
            </h1>
            {wizard.isAIPowered && (
              <Badge
                variant="secondary"
                className="text-sm bg-white/90 text-gray-800"
              >
                🤖 AI Powered
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 pb-8">
        {/* Wizard Description */}
        <div className="text-center mb-8">
          <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            {wizard.description}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
          <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-lg text-center border border-green-200 dark:border-green-800">
            <Trophy className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
              {wizard.wins || 0}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Wins
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-lg text-center border border-red-200 dark:border-red-800">
            <Skull className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">
              {wizard.losses || 0}
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">Losses</div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg text-center border border-blue-200 dark:border-blue-800">
            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {winRate}%
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Win Rate
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/30 p-6 rounded-lg text-center border border-purple-200 dark:border-purple-800">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {totalDuels}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              Total Duels
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {isOwner && (
            <Button
              size="lg"
              onClick={() => setIsEditing(true)}
              className="text-lg px-8 py-3"
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit Wizard
            </Button>
          )}
          <Link href={`/duels/create?wizardId=${id}`}>
            <Button size="lg" className="text-lg px-8 py-3">
              ⚔️ {isOwner ? "Start New Duel" : "Challenge to Duel"}
            </Button>
          </Link>
        </div>

        {/* Duel History */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Duel History</h2>

          {activeDuels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Active Duels
              </h3>
              <div className="grid gap-4">
                {activeDuels.map((duel) => (
                  <DuelCard key={duel._id} duel={duel} wizardId={id} />
                ))}
              </div>
            </div>
          )}

          {completedDuels.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Completed Duels
              </h3>
              <div className="grid gap-4">
                {completedDuels.map((duel) => (
                  <DuelCard key={duel._id} duel={duel} wizardId={id} />
                ))}
              </div>
            </div>
          )}

          {totalDuels === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No Duels Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  This wizard hasn&apos;t participated in any duels.
                </p>
                <Link href={`/duels/create?wizardId=${id}`}>
                  <Button>Start First Duel</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface DuelCardProps {
  duel: {
    _id: string;
    status: string;
    createdAt: number;
    wizards: Id<"wizards">[];
    players: string[];
    winners?: Id<"wizards">[];
    losers?: Id<"wizards">[];
    points: Record<string, number>;
    hitPoints: Record<string, number>;
    featuredIllustration?: string;
    currentRound?: number;
    numberOfRounds?: number | "TO_THE_DEATH";
  };
  wizardId: string;
}

function DuelCard({ duel, wizardId }: DuelCardProps) {
  // Fetch wizard details for all wizards in the duel (up to 3 wizards)
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizard,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );
  const wizard3 = useQuery(
    api.wizards.getWizard,
    duel.wizards[2] ? { wizardId: duel.wizards[2] } : "skip"
  );

  const wizards = [wizard1, wizard2, wizard3].filter(
    (w) => w !== undefined && w !== null
  );
  const isLoading =
    (duel.wizards[0] && wizard1 === undefined) ||
    (duel.wizards[1] && wizard2 === undefined) ||
    (duel.wizards[2] && wizard3 === undefined);

  const isWinner = duel.winners?.includes(wizardId as Id<"wizards">);
  const isLoser = duel.losers?.includes(wizardId as Id<"wizards">);

  const getStatusBadge = () => {
    switch (duel.status) {
      case "COMPLETED":
        if (isWinner) {
          return (
            <Badge className="bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
              🏆 Victory
            </Badge>
          );
        } else if (isLoser) {
          return (
            <Badge className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800">
              💀 Defeat
            </Badge>
          );
        } else {
          return (
            <Badge className="bg-muted text-muted-foreground">
              ⚔️ Completed
            </Badge>
          );
        }
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800">
            ⚡ In Progress
          </Badge>
        );
      case "WAITING_FOR_PLAYERS":
        return (
          <Badge className="bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800">
            ⏳ Waiting
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-muted text-muted-foreground">❌ Cancelled</Badge>
        );
      default:
        return <Badge variant="secondary">{duel.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="h-4 bg-muted rounded w-24"></div>
            </div>
            <div className="h-6 bg-muted rounded w-16"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </div>
            <div className="h-8 w-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wizardNames = wizards.map((wizard) => wizard?.name).filter(Boolean);
  const duelTitle = wizardNames.length > 0 ? wizardNames.join(" vs ") : "Duel";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Date(duel.createdAt).toLocaleDateString()}
            </span>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3">
          {/* Featured illustration thumbnail */}
          {duel.featuredIllustration && (
            <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
              <ConvexImage
                storageId={duel.featuredIllustration}
                alt="Duel illustration"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1 truncate">
              {duelTitle}
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              {duel.status === "IN_PROGRESS" &&
                duel.currentRound &&
                duel.numberOfRounds &&
                typeof duel.numberOfRounds === "number" && (
                  <>
                    Round {duel.currentRound} of {duel.numberOfRounds}
                  </>
                )}
              {duel.status === "IN_PROGRESS" &&
                duel.currentRound &&
                duel.numberOfRounds === "TO_THE_DEATH" && (
                  <>Round {duel.currentRound}</>
                )}
              {duel.status !== "IN_PROGRESS" && duel.numberOfRounds && (
                <>
                  {typeof duel.numberOfRounds === "number"
                    ? `${duel.numberOfRounds} rounds`
                    : "To the death"}
                </>
              )}
            </p>
            {duel.status === "COMPLETED" && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Points: {duel.points[wizardId] || 0}</span>
                <span>HP: {duel.hitPoints[wizardId] || 0}/100</span>
              </div>
            )}
          </div>

          <Link href={`/duels/${duel._id}`}>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
