"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JoinDuelForm } from '@/components/JoinDuelForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ShortcodeInput() {
  const [shortcode, setShortcode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortcode.trim()) {
      router.push(`/join/${shortcode.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Enter shortcode"
        value={shortcode}
        onChange={(e) => setShortcode(e.target.value.toUpperCase())}
        className="w-32 text-center font-mono"
        maxLength={6}
      />
      <Button type="submit" size="sm" disabled={!shortcode.trim()}>
        Join
      </Button>
    </form>
  );
}

export default function JoinDuelPage() {
  const { user } = useUser();
  const router = useRouter();

  const handleSuccess = (duelId: string) => {
    router.push(`/duels/${duelId}`);
  };

  const handleClose = () => {
    router.push('/dashboard');
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Join a Duel</h2>
            <p className="text-gray-600">
              Find an open duel and join the magical battle
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4">
                <span>Have a shortcode?</span>
                <ShortcodeInput />
              </div>
            </div>
            
            <JoinDuelForm 
              onClose={handleClose}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </main>
    </div>
  );
}