"use client";

import { ClerkProvider as ClerkProviderBase, useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { ReactNode, Suspense, useEffect, useRef } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

function PostHogUserIdentifier() {
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      if (identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      return;
    }

    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName || undefined,
    });
    identifiedUserId.current = user.id;
  }, [isLoaded, user]);

  return null;
}

function ClerkProviderContent({ children }: { children: ReactNode }) {
  return (
    <ClerkProviderBase
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#7c3aed",
          colorPrimaryForeground: "#ffffff",
          colorBackground: "var(--card)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--muted-foreground)",
          colorInput: "var(--background)",
          colorInputForeground: "var(--foreground)",
          colorDanger: "var(--destructive)",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          cardBox: "rune-card shadow-xl",
          card: "shadow-none bg-transparent",
          headerTitle: "!font-display",
          formButtonPrimary:
            "bg-arcane !text-white shadow-md hover:brightness-110 normal-case font-semibold min-h-11",
          userButtonAvatarBox: "!size-11",
          footerActionLink:
            "!text-gold-foreground dark:!text-gold !underline underline-offset-4 font-semibold hover:brightness-110 inline-flex items-center justify-center min-w-11 min-h-11",
          footerActionText:
            "text-muted-foreground inline-flex items-center min-h-11",
          footerAction:
            "!flex-wrap !items-center !justify-center !gap-x-1 !w-full",
          socialButtonsBlockButton:
            "border border-primary/30 bg-background/60 hover:bg-accent min-h-11",
          socialButtonsBlockButtonText: "text-foreground font-medium",
          formFieldInputShowPasswordButton:
            "min-h-11 min-w-11 inline-flex items-center justify-center",
          formFieldInput: "min-h-11 !border-primary/40",
          formFieldLabel: "text-foreground",
          identityPreviewText: "text-foreground",
          dividerText: "text-muted-foreground",
        },
      }}
    >
      <PostHogUserIdentifier />
      {children}
    </ClerkProviderBase>
  );
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <RuneSpinner size="md" label="Loading…" />
        </div>
      }
    >
      <ClerkProviderContent>{children}</ClerkProviderContent>
    </Suspense>
  );
}
