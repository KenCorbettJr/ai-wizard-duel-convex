"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface DuelCreatedSuccessProps {
  duelId: Id<"duels">;
  onViewDuel: () => void;
  onCreateAnother: () => void;
}

export function DuelCreatedSuccess({ duelId, onViewDuel, onCreateAnother }: DuelCreatedSuccessProps) {
  const [copied, setCopied] = useState(false);
  
  const duel = useQuery(api.duels.getDuel, { duelId });

  const handleCopyLink = async () => {
    if (!duel?.shortcode) return;
    
    const url = `${window.location.origin}/join/${duel.shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleShare = async () => {
    if (!duel?.shortcode) return;
    
    const url = `${window.location.origin}/join/${duel.shortcode}`;
    const text = `Join my wizard duel! Use shortcode ${duel.shortcode} or click this link:`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join My Wizard Duel',
          text,
          url,
        });
      } catch (error) {
        console.error('Failed to share:', error);
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!duel) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">🎉 Duel Created Successfully!</CardTitle>
        <CardDescription>
          Your magical battle arena is ready for opponents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
            <span className="text-purple-800 font-medium">Shortcode:</span>
            <code className="text-2xl font-mono font-bold text-purple-900 tracking-wider">
              {duel.shortcode}
            </code>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Duel Details:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">
                {typeof duel.numberOfRounds === 'number' 
                  ? `${duel.numberOfRounds} Rounds`
                  : 'To the Death'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wizards:</span>
              <span className="font-medium">{duel.wizards.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant="secondary">Waiting for Players</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Players:</span>
              <span className="font-medium">{duel.players.length}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Share Your Duel:</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button onClick={handleShare} className="flex-1">
                {copied ? '✓ Copied!' : '📤 Share Link'}
              </Button>
              <Button variant="outline" onClick={handleCopyLink}>
                📋 Copy
              </Button>
            </div>
            <div className="text-xs text-gray-600 text-center">
              Share the shortcode <strong>{duel.shortcode}</strong> or send the link to invite players
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={onViewDuel} className="flex-1">
            View Duel
          </Button>
          <Button variant="outline" onClick={onCreateAnother}>
            Create Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}