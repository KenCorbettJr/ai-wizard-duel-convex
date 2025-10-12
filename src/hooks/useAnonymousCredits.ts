import { useState, useEffect } from "react";
import { useAnonymousSession } from "./useAnonymousSession";

const CREDITS_STORAGE_KEY = "anonymous_credits";
const DEFAULT_CREDITS = 0;

export function useAnonymousCredits() {
  const [credits, setCredits] = useState<number>(DEFAULT_CREDITS);
  const [isLoading, setIsLoading] = useState(true);
  const { sessionId } = useAnonymousSession();

  useEffect(() => {
    if (sessionId) {
      // Load credits from localStorage
      const storedCredits = localStorage.getItem(
        `${CREDITS_STORAGE_KEY}_${sessionId}`
      );
      if (storedCredits) {
        setCredits(parseInt(storedCredits, 10));
      }
      setIsLoading(false);
    }
  }, [sessionId]);

  const addCredits = (amount: number) => {
    if (!sessionId) return;

    const newCredits = credits + amount;
    setCredits(newCredits);
    localStorage.setItem(
      `${CREDITS_STORAGE_KEY}_${sessionId}`,
      newCredits.toString()
    );
  };

  const spendCredits = (amount: number): boolean => {
    if (!sessionId || credits < amount) return false;

    const newCredits = credits - amount;
    setCredits(newCredits);
    localStorage.setItem(
      `${CREDITS_STORAGE_KEY}_${sessionId}`,
      newCredits.toString()
    );
    return true;
  };

  const hasCredits = (amount: number = 1): boolean => {
    return credits >= amount;
  };

  const clearCredits = () => {
    if (!sessionId) return;

    setCredits(0);
    localStorage.removeItem(`${CREDITS_STORAGE_KEY}_${sessionId}`);
  };

  return {
    credits,
    isLoading,
    addCredits,
    spendCredits,
    hasCredits,
    clearCredits,
  };
}
