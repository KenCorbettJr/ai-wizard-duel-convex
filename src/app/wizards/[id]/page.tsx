"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { EditWizardForm } from "@/components/EditWizardForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Skull, TrendingUp, Calendar, Users, Zap, Edit } from "lucide-react";
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
  const wizardId = id as Id<"wizards">;
  const [isEditing, setIsEditing] = useState(false);
  
  const wizard = useQuery(api.wizards.getWizard, { wizardId });
  const wizardDuels = useQuery(api.duels.getWizardDuels, { wizardId });

  if (wizard === undefined || wizardDuels === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (wizard === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Wizard Not Found</h1>
          <p className="text-gray-600 mb-6">The wizard you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const winRate = wizard.wins && wizard.losses 
    ? Math.round((wizard.wins / (wizard.wins + wizard.losses)) * 100)
    : wizard.wins && !wizard.losses ? 100 : 0;

  const totalDuels = wizardDuels?.length || 0;
  const completedDuels = wizardDuels?.filter(duel => duel.status === "COMPLETED") || [];
  const activeDuels = wizardDuels?.filter(duel => 
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Wizard Image */}
          <div className="flex-shrink-0">
            {wizard.illustration || wizard.illustrationURL ? (
              <div className="w-64 h-64 rounded-lg overflow-hidden bg-gray-100">
                {wizard.illustration ? (
                  <ConvexImage
                    storageId={wizard.illustration}
                    alt={wizard.name}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                ) : wizard.illustrationURL ? (
                  <Image
                    src={wizard.illustrationURL}
                    alt={wizard.name}
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <div className="w-64 h-64 rounded-lg bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                <Zap className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          {/* Wizard Info */}
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{wizard.name}</h1>
              {wizard.isAIPowered && (
                <Badge variant="secondary" className="text-sm">
                  🤖 AI Powered
                </Badge>
              )}
            </div>
            
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              {wizard.description}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Trophy className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">{wizard.wins || 0}</div>
                <div className="text-sm text-green-600">Wins</div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <Skull className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-700">{wizard.losses || 0}</div>
                <div className="text-sm text-red-600">Losses</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">{winRate}%</div>
                <div className="text-sm text-blue-600">Win Rate</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">{totalDuels}</div>
                <div className="text-sm text-purple-600">Total Duels</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link href={`/duels/create?wizardId=${wizard._id}`}>
                <Button size="lg">
                  ⚔️ Challenge to Duel
                </Button>
              </Link>
              {isOwner && (
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Wizard
                </Button>
              )}
              <Link href="/dashboard">
                <Button variant="outline" size="lg">
                  View All Wizards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Duel History */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Duel History</h2>
        
        {activeDuels.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Active Duels</h3>
            <div className="grid gap-4">
              {activeDuels.map((duel) => (
                <DuelCard key={duel._id} duel={duel} wizardId={wizardId} />
              ))}
            </div>
          </div>
        )}

        {completedDuels.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Completed Duels</h3>
            <div className="grid gap-4">
              {completedDuels.map((duel) => (
                <DuelCard key={duel._id} duel={duel} wizardId={wizardId} />
              ))}
            </div>
          </div>
        )}

        {totalDuels === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Duels Yet</h3>
              <p className="text-gray-500 mb-4">This wizard hasn&apos;t participated in any duels.</p>
              <Link href={`/duels/create?wizardId=${wizard._id}`}>
                <Button>Start First Duel</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface DuelCardProps {
  duel: any;
  wizardId: Id<"wizards">;
}

function DuelCard({ duel, wizardId }: DuelCardProps) {
  const isWinner = duel.winners?.includes(wizardId);
  const isLoser = duel.losers?.includes(wizardId);
  
  const getStatusBadge = () => {
    switch (duel.status) {
      case "COMPLETED":
        if (isWinner) {
          return <Badge className="bg-green-100 text-green-800">🏆 Victory</Badge>;
        } else if (isLoser) {
          return <Badge className="bg-red-100 text-red-800">💀 Defeat</Badge>;
        } else {
          return <Badge className="bg-gray-100 text-gray-800">⚔️ Completed</Badge>;
        }
      case "IN_PROGRESS":
        return <Badge className="bg-blue-100 text-blue-800">⚡ In Progress</Badge>;
      case "WAITING_FOR_PLAYERS":
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Waiting</Badge>;
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-800">❌ Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{duel.status}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {new Date(duel.createdAt).toLocaleDateString()}
            </span>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              {duel.wizards.length} wizard{duel.wizards.length !== 1 ? 's' : ''} • {duel.players.length} player{duel.players.length !== 1 ? 's' : ''}
            </p>
            {duel.status === "COMPLETED" && (
              <div className="flex items-center gap-4 text-sm">
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