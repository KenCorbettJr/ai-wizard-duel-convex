"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Swords, Hash } from "lucide-react";
import { useRouter } from "next/navigation";

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
          placeholder="ABC123 or a duel link"
          aria-label="Duel code or link"
          value={input}
          onChange={handleInputChange}
          className="w-64 pl-10 text-center font-mono bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={!isValidShortcode}
        className="disabled:opacity-50"
      >
        <Swords className="h-4 w-4 mr-1" />
        Join
      </Button>
    </form>
  );
}

export default function JoinDuelPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Swords className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold text-gold-gradient font-display">
                Join a Duel
              </h2>
              <Swords className="h-8 w-8 text-primary scale-x-[-1]" />
            </div>
            <p className="text-muted-foreground text-lg">
              Got a duel code or link from a friend? Pop it in below.
            </p>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-lg dark:shadow-xl">
                <ShortcodeInput />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
