import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const SESSION_STORAGE_KEY = "anonymous_session_id";

export function useAnonymousSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const createSession = useMutation(api.sessionService.createAnonymousSession);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Check if we already have a session ID in localStorage
        const existingSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

        if (existingSessionId) {
          setSessionId(existingSessionId);
        } else {
          // Create a new session
          const newSessionId = await createSession({
            userAgent: navigator.userAgent,
            referrer: document.referrer || undefined,
          });

          localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
          setSessionId(newSessionId);
        }
      } catch (error) {
        console.error("Failed to initialize anonymous session:", error);
        // Fallback to a client-side generated session ID
        const fallbackSessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem(SESSION_STORAGE_KEY, fallbackSessionId);
        setSessionId(fallbackSessionId);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [createSession]);

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
  };

  return {
    sessionId,
    isLoading,
    clearSession,
  };
}
