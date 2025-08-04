"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JoinDuelForm } from "@/components/JoinDuelForm";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swords, Hash } from "lucide-react";

function ShortcodeInput() {
  const [shortcode, setShortcode] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortcode.trim()) {
      router.push(`/join/${shortcode.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          type="text"
          placeholder="ABC123"
          value={shortcode}
          onChange={(e) => setShortcode(e.target.value.toUpperCase())}
          className="w-36 pl-10 text-center font-mono bg-background/50 dark:bg-background/30 border-border/50 dark:border-border/30 focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
          maxLength={6}
        />
      </div>
      <Button 
        type="submit" 
        size="sm" 
        disabled={!shortcode.trim()}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
      >
        <Swords className="h-4 w-4 mr-1" />
        Join
      </Button>
    </form>
  );
}

export default function JoinDuelPage() {
  const router = useRouter();

  const handleSuccess = (duelId: string) => {
    router.push(`/duels/${duelId}`);
  };

  const handleClose = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Join a Duel
              </h2>
              <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400 scale-x-[-1]" />
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-lg">
              Find an open duel and join the magical battle
            </p>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg dark:shadow-xl">
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground dark:text-muted-foreground/80 mb-4">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">Have a shortcode?</span>
                </div>
                <ShortcodeInput />
                <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground/50 mt-3">
                  Enter the 6-character code to join a specific duel
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30 dark:border-border/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background/80 dark:bg-background/60 px-4 py-2 text-muted-foreground/60 dark:text-muted-foreground/50 rounded-full backdrop-blur-sm">
                  or browse available duels
                </span>
              </div>
            </div>

            <JoinDuelForm onClose={handleClose} onSuccess={handleSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
