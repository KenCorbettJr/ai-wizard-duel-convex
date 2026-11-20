"use client";

import { Waitlist } from "@clerk/nextjs";
import {
  STARTING_TOKENS,
  TOKEN_PACKS,
  formatCentsPerDuel,
  formatPrice,
} from "../../../convex/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Mail,
  Wand2,
  Scroll,
  Flame,
  Swords,
} from "lucide-react";
import { useWaitlistStatus } from "@/hooks/useWaitlistStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { ClientOnly } from "@/components/ClientOnly";

export default function WaitlistPage() {
  const { isApproved, isPending, isLoading } = useWaitlistStatus();
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/30">
      {/* Navigation */}

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-12 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-arcane rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide mb-4">
              Join the AI Wizard Duel Waitlist
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Be among the first to experience the magic! Request access to
              create wizards, cast spells, and engage in epic AI-powered duels.
            </p>
          </div>

          {/* Status Messages for Authenticated Users */}
          {!isLoading && isApproved && (
            <Alert className="mb-8 border-success bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                <strong>You&apos;re approved!</strong> You have full access to
                all features. Head to the{" "}
                <Link href="/" className="underline font-semibold">
                  homepage
                </Link>{" "}
                to start creating wizards and dueling.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && isPending && (
            <Alert className="mb-8 border-warning bg-warning/10">
              <Clock className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>Your request is pending.</strong> We&apos;re reviewing
                your waitlist request. You&apos;ll receive an email notification
                once you&apos;re approved. Most approvals happen within 24-48
                hours.
              </AlertDescription>
            </Alert>
          )}

          {/* Waitlist Component */}
          <div className="mb-12 flex justify-center">
            <div className="w-full max-w-md">
              <ClientOnly>
                <Waitlist
                  appearance={{
                    elements: {
                      rootBox: "w-full mx-auto",
                      card: "shadow-none border-0 bg-transparent !w-full !max-w-none",
                      header: "!hidden",
                      form: "space-y-4",
                      formFieldInput:
                        "w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                      formButtonPrimary:
                        "w-full bg-arcane !text-white font-semibold min-h-11 py-3 rounded-lg shadow-md hover:brightness-110 transition-all",
                      footer: "text-center text-sm text-muted-foreground mt-4",
                    },
                  }}
                />
              </ClientOnly>
            </div>
          </div>

          {/* What to Expect Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8 font-display">
              What to Expect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/12 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Email Alert</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We&apos;ll send you an email as soon as you&apos;re approved
                    to join the platform.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-info/15 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-info" />
                    </div>
                    <CardTitle className="text-lg">Quick Review</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our team reviews requests regularly. Most approvals happen
                    within 24-48 hours.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-success/15 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                    <CardTitle className="text-lg">Full Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Once approved, you&apos;ll have immediate access to all
                    features and {STARTING_TOKENS} free tokens.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8 font-display">
              What You&apos;ll Get Access To
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/12 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Wand2
                        className="w-4 h-4 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 font-display">
                        Create Custom Wizards
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Design unique wizards with AI-generated illustrations
                        and personalized backstories.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-info/15 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Scroll
                        className="w-4 h-4 text-info"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 font-display">
                        Cast Creative Spells
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Unleash your imagination with unlimited spell
                        possibilities in turn-based duels.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success/15 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Flame
                        className="w-4 h-4 text-success"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 font-display">
                        AI-Powered Battles
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Watch as AI weaves your spells into epic narratives with
                        stunning visuals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-warning/15 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Swords
                        className="w-4 h-4 text-warning"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 font-display">
                        Multiplayer & Campaign
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Challenge friends or battle AI opponents in single
                        player campaign mode.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="text-2xl font-bold text-center mb-8 font-display">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Why is there a waitlist?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We&apos;re managing our launch carefully to ensure the best
                    experience for all players. The waitlist helps us scale
                    responsibly while maintaining quality.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    How long will I wait?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Most users are approved within 24-48 hours. We review
                    requests regularly and send email notifications immediately
                    upon approval.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    What happens after approval?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    You&apos;ll receive an email notification and can
                    immediately sign in to access all features. You&apos;ll
                    start with {STARTING_TOKENS} free tokens, and each token
                    enters one duel.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Is there a cost to join?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Joining is free, and you start with {STARTING_TOKENS} free
                    tokens. After that, one token enters one duel, whatever its
                    length. Tokens come in packs from{" "}
                    {formatPrice(TOKEN_PACKS[0].priceCents)}, about{" "}
                    {formatCentsPerDuel(TOKEN_PACKS[TOKEN_PACKS.length - 1])} to{" "}
                    {formatCentsPerDuel(TOKEN_PACKS[0])} a duel. No
                    subscription.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
