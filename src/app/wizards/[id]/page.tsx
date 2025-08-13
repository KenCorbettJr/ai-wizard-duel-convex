"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { EditWizardForm } from "@/components/EditWizardForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DuelListItem } from "@/components/DuelListItem";
import { WizardStatistics } from "@/components/WizardStatistics";
import { TrophyHall } from "@/components/TrophyHall";
import {
  ArrowLeft,
  Trophy,
  Skull,
  TrendingUp,
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
  const wizard = useQuery(api.wizards.getWizard, {
    wizardId: id as Id<"wizards">,
  });
  const wizardDuels = useQuery(api.duels.getWizardDuelsSafe, {
    wizardId: id as Id<"wizards">,
  });

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
      {/* Back button */}
      <div className="p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

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

        {/* Detailed Statistics */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Statistics
          </h2>
          <WizardStatistics
            wizardId={id as Id<"wizards">}
            showDetailedHistory={false}
          />
        </div>

        {/* Trophy Hall */}
        <div className="mb-12">
          <TrophyHall wizardId={id as Id<"wizards">} />
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
                  <DuelListItem key={duel._id} duel={duel} variant="card" />
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
                  <DuelListItem key={duel._id} duel={duel} variant="card" />
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
