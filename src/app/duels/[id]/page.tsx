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
import { Swords, Trophy, Clock, Sparkles, ScrollText, Heart, Star } from 'lucide-react';
import { ConvexImage } from '@/components/ConvexImage';

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
  
  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(api.wizards.getWizard, 
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(api.wizards.getWizard, 
    duel?.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading duel...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-foreground">
                {typeof duel.numberOfRounds === 'number' 
                  ? `${duel.numberOfRounds} Round Duel`
                  : 'Duel to the Death'
                }
              </h2>
              {getStatusBadge(duel.status)}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Round {duel.currentRound} • Created {new Date(duel.createdAt).toLocaleDateString()}
              </p>
              {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Share:</span>
                  <code className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm font-mono">
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

          {/* Wizard Display Section */}
          {duel.wizards.length >= 2 && (wizard1 || wizard2) && (
            <div className="mb-8 relative">
              <div className="grid md:grid-cols-2 gap-8 relative">
                {/* Wizard 1 */}
                {wizard1 && (
                  <Card className="overflow-hidden">
                    <div className="relative">
                      {wizard1.illustration && (
                        <div className="h-48 w-full overflow-hidden">
                          <ConvexImage
                            storageId={wizard1.illustration}
                            alt={wizard1.name}
                            width={400}
                            height={192}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {duel.points[duel.wizards[0]] || 0}
                        </Badge>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {duel.hitPoints[duel.wizards[0]] || 100}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl">{wizard1.name}</CardTitle>
                      <CardDescription>{wizard1.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Wizard 2 */}
                {wizard2 && (
                  <Card className="overflow-hidden">
                    <div className="relative">
                      {wizard2.illustration && (
                        <div className="h-48 w-full overflow-hidden">
                          <ConvexImage
                            storageId={wizard2.illustration}
                            alt={wizard2.name}
                            width={400}
                            height={192}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {duel.points[duel.wizards[1]] || 0}
                        </Badge>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {duel.hitPoints[duel.wizards[1]] || 100}
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl">{wizard2.name}</CardTitle>
                      <CardDescription>{wizard2.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>

              {/* VS Divider - Desktop */}
              <div className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="bg-card border-2 border-border rounded-full p-4 shadow-lg">
                  <Swords className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              
              {/* VS Divider - Mobile */}
              <div className="md:hidden flex justify-center -my-4 relative z-10">
                <div className="bg-card border-2 border-border rounded-full p-3 shadow-lg">
                  <Swords className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  Duel Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Players:</span>
                    <span className="font-medium text-foreground">{duel.players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wizards:</span>
                    <span className="font-medium text-foreground">{duel.wizards.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Round:</span>
                    <span className="font-medium text-foreground">{duel.currentRound}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Wizard Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {duel.wizards.map((wizardId) => (
                    <div key={wizardId} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Wizard {wizardId.slice(-4)}</span>
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
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Waiting for Players
                </CardTitle>
                <CardDescription>
                  {duel.players.length < 2 
                    ? "Waiting for more players to join..."
                    : "Ready to start! Click the button below to begin the duel."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isPlayerInDuel ? (
                  <p className="text-muted-foreground">
                    You are not part of this duel. 
                    <Link href="/duels/join" className="text-purple-600 dark:text-purple-400 hover:underline ml-1">
                      Join a different duel
                    </Link>
                  </p>
                ) : canStartDuel ? (
                  <Button onClick={handleStartDuel}>
                    Start Duel
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    Waiting for more players to join...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {duel.status === "IN_PROGRESS" && isPlayerInDuel && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Cast Your Spell
                </CardTitle>
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
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg resize-none h-24 placeholder:text-muted-foreground"
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
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  Duel History
                </CardTitle>
                <CardDescription>
                  Previous rounds and their outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duel.rounds.map((round) => (
                    <div key={round._id} className="border-l-4 border-purple-200 dark:border-purple-700 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-foreground">Round {round.roundNumber}</h4>
                        <Badge variant="outline">{round.status}</Badge>
                      </div>
                      {round.outcome && (
                        <div className="text-sm text-muted-foreground">
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