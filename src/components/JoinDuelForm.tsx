"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface JoinDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
}

export function JoinDuelForm({ onClose, onSuccess }: JoinDuelFormProps) {
  const { user } = useUser();
  const [selectedDuel, setSelectedDuel] = useState<Id<"duels"> | null>(null);
  const [selectedWizards, setSelectedWizards] = useState<Id<"wizards">[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  const availableDuels = useQuery(api.duels.getActiveDuels);
  const wizards = useQuery(api.wizards.getUserWizards, 
    user?.id ? { userId: user.id } : "skip"
  );

  // Filter duels that are waiting for players and not created by current user
  const joinableDuels = availableDuels?.filter(duel => 
    duel.status === "WAITING_FOR_PLAYERS" && 
    !duel.players.includes(user?.id || "")
  ) || [];

  const handleWizardToggle = (wizardId: Id<"wizards">) => {
    setSelectedWizards(prev => 
      prev.includes(wizardId) 
        ? prev.filter(id => id !== wizardId)
        : [...prev, wizardId]
    );
  };

  const joinDuel = useMutation(api.duels.joinDuel);

  const handleJoinDuel = async () => {
    if (!user?.id || !selectedDuel || selectedWizards.length === 0) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: selectedDuel,
        userId: user.id,
        wizards: selectedWizards
      });
      onSuccess(selectedDuel);
    } catch (error) {
      console.error('Failed to join duel:', error);
    } finally {
      setIsJoining(false);
    }
  };

  if (!wizards || wizards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join a Duel</CardTitle>
          <CardDescription>You need at least one wizard to join a duel</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Create a wizard first before joining a duel.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (joinableDuels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join a Duel</CardTitle>
          <CardDescription>No duels available to join right now</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            There are no open duels waiting for players. Create your own duel to get started!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚔️ Join a Duel</CardTitle>
        <CardDescription>
          Choose a duel to join and select your wizards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Duels
          </label>
          <div className="space-y-3">
            {joinableDuels.map((duel) => (
              <div
                key={duel._id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedDuel === duel._id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedDuel(duel._id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">
                        {typeof duel.numberOfRounds === 'number' 
                          ? `${duel.numberOfRounds} Round Duel`
                          : 'Duel to the Death'
                        }
                      </h4>
                      <Badge variant="secondary">
                        {duel.wizards.length} wizard{duel.wizards.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Created {new Date(duel.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedDuel === duel._id && (
                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedDuel && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Wizards
            </label>
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
              <p className="text-sm text-red-600 mt-1">
                Please select at least one wizard
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleJoinDuel}
            disabled={!selectedDuel || selectedWizards.length === 0 || isJoining}
            className="flex-1"
          >
            {isJoining ? 'Joining...' : 'Join Duel'}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isJoining}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}