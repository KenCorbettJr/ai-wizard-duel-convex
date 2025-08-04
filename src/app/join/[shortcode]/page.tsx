"use client";

import { use } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { CreateWizardModal } from '@/components/CreateWizardModal';

interface JoinShortcodePageProps {
  params: Promise<{
    shortcode: string;
  }>;
}

export default function JoinShortcodePage({ params }: JoinShortcodePageProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedWizards, setSelectedWizards] = useState<Id<"wizards">[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateWizardModal, setShowCreateWizardModal] = useState(false);
  const { shortcode } = use(params);

  const duel = useQuery(api.duels.getDuelByShortcode, { 
    shortcode: shortcode.toUpperCase() 
  });
  
  const wizards = useQuery(api.wizards.getUserWizards, 
    user?.id ? { userId: user.id } : "skip"
  );

  const joinDuel = useMutation(api.duels.joinDuel);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isLoaded, user, router]);

  const handleWizardToggle = (wizardId: Id<"wizards">) => {
    setSelectedWizards(prev => 
      prev.includes(wizardId) 
        ? prev.filter(id => id !== wizardId)
        : [...prev, wizardId]
    );
  };

  const handleJoinDuel = async () => {
    if (!user?.id || !duel || selectedWizards.length === 0) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: duel._id,
        userId: user.id,
        wizards: selectedWizards
      });
      router.push(`/duels/${duel._id}`);
    } catch (error) {
      console.error('Failed to join duel:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Duel not found
  if (duel === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        <Navbar />

        <main className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle>❌ Duel Not Found</CardTitle>
                <CardDescription>
                  The shortcode &quot;{shortcode.toUpperCase()}&quot; doesn&apos;t match any active duels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  The duel may have been completed, cancelled, or the shortcode might be incorrect.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link href="/dashboard">
                    <Button>Go to Dashboard</Button>
                  </Link>
                  <Link href="/duels/join">
                    <Button variant="outline">Browse Open Duels</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Still loading duel
  if (duel === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading duel...</p>
        </div>
      </div>
    );
  }

  // Check if user is already in the duel
  const isAlreadyInDuel = duel.players.includes(user.id);
  if (isAlreadyInDuel) {
    router.push(`/duels/${duel._id}`);
    return null;
  }

  // Check if duel is still accepting players
  const canJoinDuel = duel.status === "WAITING_FOR_PLAYERS";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Join Duel</h2>
            <p className="text-gray-600">
              Shortcode: <span className="font-mono font-bold text-purple-600">{duel.shortcode}</span>
            </p>
          </div>

          {!canJoinDuel ? (
            <Card>
              <CardHeader>
                <CardTitle>⚔️ Duel Status</CardTitle>
                <CardDescription>
                  This duel is no longer accepting new players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={duel.status === "COMPLETED" ? "outline" : "default"}>
                      {duel.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {typeof duel.numberOfRounds === 'number' 
                        ? `${duel.numberOfRounds} Round Duel`
                        : 'Duel to the Death'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Players:</span>
                    <span className="font-medium">{duel.players.length}</span>
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <Link href="/dashboard">
                    <Button>Go to Dashboard</Button>
                  </Link>
                  <Link href="/duels/join">
                    <Button variant="outline">Browse Open Duels</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>⚔️ Duel Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">
                        {typeof duel.numberOfRounds === 'number' 
                          ? `${duel.numberOfRounds} Round Duel`
                          : 'Duel to the Death'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Current Players:</span>
                      <span className="font-medium">{duel.players.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">{new Date(duel.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!wizards || wizards.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>🧙‍♂️ Create Your First Wizard</CardTitle>
                    <CardDescription>
                      You need at least one wizard to join a duel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">
                      Create your magical wizard to participate in this epic duel!
                    </p>
                    <Button onClick={() => setShowCreateWizardModal(true)}>
                      Create Wizard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>🧙‍♂️ Select Your Wizards</CardTitle>
                    <CardDescription>
                      Choose which wizards will represent you in this duel
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      {wizards.map((wizard) => (
                        <div
                          key={wizard._id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedWizards.includes(wizard._id)
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleWizardToggle(wizard._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{wizard.name}</h4>
                              <p className="text-sm text-gray-600 truncate">
                                {wizard.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {wizard.wins || wizard.losses ? (
                                <Badge variant="outline">
                                  {wizard.wins || 0}W - {wizard.losses || 0}L
                                </Badge>
                              ) : (
                                <Badge variant="secondary">New</Badge>
                              )}
                              {selectedWizards.includes(wizard._id) && (
                                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">✓</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedWizards.length === 0 && (
                      <p className="text-sm text-red-600">
                        Please select at least one wizard
                      </p>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleJoinDuel}
                        disabled={selectedWizards.length === 0 || isJoining}
                        className="flex-1"
                      >
                        {isJoining ? 'Joining Duel...' : 'Join Duel'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateWizardModal(true)}
                        disabled={isJoining}
                      >
                        Create New Wizard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <CreateWizardModal
        open={showCreateWizardModal}
        onOpenChange={setShowCreateWizardModal}
        onSuccess={handleWizardCreated}
      />
    </div>
  );
}