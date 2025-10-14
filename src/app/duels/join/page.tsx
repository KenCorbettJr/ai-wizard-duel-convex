"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swords, Hash } from "lucide-react";
import { useRouter } from "next/router";

function ShortcodeInput() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const extractShortcode = (value: string): string => {
    const trimmed = value.trim();

    // Check if it's a full URL
    if (trimmed.includes("/join/")) {
      const match = trimmed.match(/\/join\/([A-Z0-9]{6})/i);
      return match ? match[1].toUpperCase() : "";
    }

    // Remove any # prefix and return as shortcode
    return trimmed.replace(/^#/, "").toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const shortcode = extractShortcode(input);
    if (shortcode && shortcode.length === 6) {
      router.push(`/join/${shortcode}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const shortcode = extractShortcode(input);
  const isValidShortcode = shortcode.length === 6;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
    >
      <div className="relative">
        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          type="text"
          placeholder="ABC123"
          value={input}
          onChange={handleInputChange}
          className="w-32 pl-10 text-center font-mono bg-background/50 dark:bg-background/30 border-border/50 dark:border-border/30 focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={!isValidShortcode}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
      >
        <Swords className="h-4 w-4 mr-1" />
        Join
      </Button>
    </form>
  );
}

export default function JoinDuelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Join a Duel
              </h2>
              <Swords className="h-8 w-8 text-purple-600 dark:text-purple-400 scale-x-[-1]" />
            </div>
            <p className="text-muted-foreground dark:text-muted-foreground/80 text-lg">
              Enter a shortcode to join a duel.
            </p>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg dark:shadow-xl">
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground dark:text-muted-foreground/80 mb-4">
                  <span className="font-medium">Have a shortcode?</span>
                </div>
                <ShortcodeInput />
                <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground/50 mt-3">
                  Enter the 6-character code or paste the full duel link
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
