"use client";

import {
  useAuth as useWorkOSAuth,
  useAccessToken,
} from "@workos-inc/authkit-nextjs/components";
import { useCallback, useRef } from "react";

export function useAuth() {
  const { user, loading: userLoading } = useWorkOSAuth();
  const {
    accessToken,
    loading: tokenLoading,
    error: tokenError,
  } = useAccessToken();
  const isLoading = (userLoading ?? false) || (tokenLoading ?? false);
  const isSignedIn = !!user && !!accessToken && !isLoading;

  const stableAccessToken = useRef<string | null>(null);
  if (accessToken && !tokenError) {
    stableAccessToken.current = accessToken;
  }

  const fetchAccessToken = useCallback(async () => {
    if (stableAccessToken.current && !tokenError) {
      return stableAccessToken.current;
    }
    return null;
  }, [tokenError]);

  return {
    user,
    isLoaded: !isLoading,
    isSignedIn,
    fetchAccessToken,
    accessToken: stableAccessToken,
  };
}
