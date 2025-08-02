"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface CreateDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
  preSelectedWizardId?: Id<"wizards">;
}

export function CreateDuelForm({ onClose, onSuccess, preSelectedWizardId }: CreateDuelFormProps) {
  const { user } = useUser();
  const [selectedWizards, setSelectedWizards] = useState<Id<"wizards">[]>(
    preSelectedWizardId ? [preSelectedWizardId] : []
  );
  const [numberOfRounds, setNumberOfRounds] = useState<number | "TO_THE_DEATH">(3);
  const [isCreating, setIsCreating] = useState(false);

  const wizards = useQuery(api.wizards.getUserWizards, 
    user?.id ? { userId: user.id } : "skip"
  );
  const createDuel = useMutation(api.duels.createDuel);

  const handleWizardToggle = (wizardId: Id<"wizards">) => {
    setSelectedWizards(prev => 
      prev.includes(wizardId) 
        ? prev.filter(id => id !== wizardId)
        : [...prev, wizardId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || selectedWizards.length === 0) return;

    setIsCreating(true);
    try {
      const duelId = await createDuel({
        numberOfRounds,
        wizards: selectedWizards,
        players: [user.id], // Creator is the first player
      });
      onSuccess(duelId);
    } catch (error) {
      console.error('Failed to create duel:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!wizards || wizards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create New Duel</CardTitle>
          <CardDescription>You need at least one wizard to create a duel</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Create a wizard first before starting a duel.
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
        <CardTitle>⚔️ Create New Duel</CardTitle>
        <CardDescription>
          Set up a magical battle and wait for opponents to join
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duel Length
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[3, 5, 10].map((rounds) => (
                <button
                  key={rounds}
                  type="button"
                  className={`p-3 border rounded-lg text-center transition-all ${
                    numberOfRounds === rounds
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setNumberOfRounds(rounds)}
                >
                  <div className="font-medium">{rounds} Rounds</div>
                  <div className="text-sm text-gray-600">
                    {rounds === 3 ? 'Quick' : rounds === 5 ? 'Standard' : 'Epic'}
                  </div>
                </button>
              ))}
              <button
                type="button"
                className={`p-3 border rounded-lg text-center transition-all ${
                  numberOfRounds === "TO_THE_DEATH"
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setNumberOfRounds("TO_THE_DEATH")}
              >
                <div className="font-medium">To the Death</div>
                <div className="text-sm text-gray-600">Until one falls</div>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={selectedWizards.length === 0 || isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Duel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}