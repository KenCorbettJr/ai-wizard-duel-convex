"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateDuelForm } from '@/components/CreateDuelForm';
import { DuelCreatedSuccess } from '@/components/DuelCreatedSuccess';
import { Id } from '../../../convex/_generated/dataModel';

export default function CreateDuelPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createdDuelId, setCreatedDuelId] = useState<Id<"duels"> | null>(null);
  
  const preSelectedWizardId = searchParams.get('wizardId') as Id<"wizards"> | null;

  const handleSuccess = (duelId: Id<"duels">) => {
    setCreatedDuelId(duelId);
  };

  const handleClose = () => {
    router.push('/dashboard');
  };

  const handleViewDuel = () => {
    if (createdDuelId) {
      router.push(`/duels/${createdDuelId}`);
    }
  };

  const handleCreateAnother = () => {
    setCreatedDuelId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <nav className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm">
        <Link href="/">
          <h1 className="text-2xl font-bold text-gray-900">AI Wizard Duel</h1>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <span className="text-purple-600 hover:text-purple-800 font-medium">
              ← Back to Dashboard
            </span>
          </Link>
          <span className="text-gray-700">Welcome, {user?.firstName || 'Wizard'}!</span>
          <UserButton />
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {createdDuelId ? 'Duel Created!' : 'Create a New Duel'}
            </h2>
            <p className="text-gray-600">
              {createdDuelId 
                ? 'Share your duel with friends to start the battle'
                : 'Set up a magical battle and challenge other wizards'
              }
            </p>
          </div>

          {createdDuelId ? (
            <DuelCreatedSuccess 
              duelId={createdDuelId}
              onViewDuel={handleViewDuel}
              onCreateAnother={handleCreateAnother}
            />
          ) : (
            <CreateDuelForm 
              onClose={handleClose}
              onSuccess={handleSuccess}
              preSelectedWizardId={preSelectedWizardId}
            />
          )}
        </div>
      </main>
    </div>
  );
}