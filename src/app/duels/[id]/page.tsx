"use client";

import { use } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { useState } from 'react';

interface DuelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DuelPage({ params }: DuelPageProps) {
  const { user } = useUser();
  const [spellDescription, setSpellDescription] = useState('');
  const [isCasting, setIsCasting] = useState(false);
  const { id } = use(params);

  const duel = useQuery(api.duels.getDuel, { 
    duelId: id as Id<"duels"> 
  });
  const startDuel = useMutation(api.duels.startDuel);
  const castSpell = useMutation(api.duels.castSpell);

  const isPlayerInDuel = duel?.players.includes(user?.id || '');
  const canStartDuel = duel?.status === "WAITING_FOR_PLAYERS" && 
                      duel?.players.length >= 2 && 
                      isPlayerInDuel;

  const handleStartDuel = async () => {
    if (!duel) return;
    try {
      await startDuel({ duelId: duel._id });
    } catch (error) {
      console.error('Failed to start duel:', error);
    }
  };

  const handleCastSpell = async (wizardId: Id<"wizards">) => {
    if (!duel || !spellDescription.trim()) return;
    
    setIsCasting(true);
    try {
      await castSpell({
        duelId: duel._id,
        wizardId,
        spellDescription: spellDescription.trim()
      });
      setSpellDescription('');
    } catch (error) {
      console.error('Failed to cast spell:', error);
    } finally {
      setIsCasting(false);
    }
  };

  if (!duel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading duel...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_PLAYERS":
        return <Badge variant="secondary">Waiting for Players</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="outline">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                {typeof duel.numberOfRounds === 'number' 
                  ? `${duel.numberOfRounds} Round Duel`
                  : 'Duel to the Death'
                }
              </h2>
              {getStatusBadge(duel.status)}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Round {duel.currentRound} • Created {new Date(duel.createdAt).toLocaleDateString()}
              </p>
              {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Share:</span>
                  <code className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-mono">
                    {duel.shortcode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/join/${duel.shortcode}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>⚔️ Battle Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Players:</span>
                    <span className="font-medium">{duel.players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wizards:</span>
                    <span className="font-medium">{duel.wizards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Round:</span>
                    <span className="font-medium">{duel.currentRound}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🏆 Wizard Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {duel.wizards.map((wizardId) => (
                    <div key={wizardId} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Wizard {wizardId.slice(-4)}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {duel.points[wizardId] || 0} pts
                        </Badge>
                        <Badge variant="secondary">
                          {duel.hitPoints[wizardId] || 100} HP
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {duel.status === "WAITING_FOR_PLAYERS" && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>⏳ Waiting for Players</CardTitle>
                <CardDescription>
                  {duel.players.length < 2 
                    ? "Waiting for more players to join..."
                    : "Ready to start! Click the button below to begin the duel."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isPlayerInDuel ? (
                  <p className="text-gray-600">
                    You are not part of this duel. 
                    <Link href="/duels/join" className="text-purple-600 hover:underline ml-1">
                      Join a different duel
                    </Link>
                  </p>
                ) : canStartDuel ? (
                  <Button onClick={handleStartDuel}>
                    Start Duel
                  </Button>
                ) : (
                  <p className="text-gray-600">
                    Waiting for more players to join...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {duel.status === "IN_PROGRESS" && isPlayerInDuel && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>✨ Cast Your Spell</CardTitle>
                <CardDescription>
                  Describe the magical spell your wizard will cast this round
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <textarea
                    value={spellDescription}
                    onChange={(e) => setSpellDescription(e.target.value)}
                    placeholder="Describe your wizard's spell in detail..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24"
                    disabled={isCasting}
                  />
                  <div className="flex gap-2">
                    {duel.wizards
                      .filter(wizardId => duel.needActionsFrom.includes(wizardId))
                      .map((wizardId) => (
                        <Button
                          key={wizardId}
                          onClick={() => handleCastSpell(wizardId)}
                          disabled={!spellDescription.trim() || isCasting}
                        >
                          {isCasting ? 'Casting...' : `Cast with Wizard ${wizardId.slice(-4)}`}
                        </Button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {duel.rounds && duel.rounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📜 Battle History</CardTitle>
                <CardDescription>
                  Previous rounds and their outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duel.rounds.map((round) => (
                    <div key={round._id} className="border-l-4 border-purple-200 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Round {round.roundNumber}</h4>
                        <Badge variant="outline">{round.status}</Badge>
                      </div>
                      {round.outcome && (
                        <div className="text-sm text-gray-600">
                          <p>{round.outcome.narrative}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}