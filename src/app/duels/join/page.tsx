"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JoinDuelForm } from "@/components/JoinDuelForm";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const router = useRouter();

  const handleSuccess = (duelId: string) => {
    router.push(`/duels/${duelId}`);
  };

  const handleClose = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Join a Duel
            </h2>
            <p className="text-muted-foreground">
              Find an open duel and join the magical battle
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>Have a shortcode?</span>
                <ShortcodeInput />
              </div>
            </div>

            <JoinDuelForm onClose={handleClose} onSuccess={handleSuccess} />
          </div>
        </div>
      </main>
    </div>
  );
}
