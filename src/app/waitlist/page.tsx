"use client";

import { Waitlist } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Sparkles, Clock, CheckCircle2, Mail } from "lucide-react";
import { useWaitlistStatus } from "@/hooks/useWaitlistStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function WaitlistPage() {
  const { isApproved, isPending, isLoading } = useWaitlistStatus();
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-secondary/30">
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-purple-600 to-blue-600 rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Join the AI Wizard Duel Waitlist
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Be among the first to experience the magic! Request access to
              create wizards, cast spells, and engage in epic AI-powered duels.
            </p>
          </div>

          {/* Status Messages for Authenticated Users */}
          {!isLoading && isApproved && (
            <Alert className="mb-8 border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
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
            <Alert className="mb-8 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
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
              <Waitlist
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 bg-transparent",
                    headerTitle: "text-2xl font-bold text-center mb-2",
                    headerSubtitle: "text-muted-foreground text-center mb-6",
                    form: "space-y-4",
                    formFieldInput:
                      "w-full px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600",
                    formButtonPrimary:
                      "w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 rounded-md transition-all duration-200 transform hover:scale-105",
                    footer: "text-center text-sm text-muted-foreground mt-4",
                  },
                }}
              />
            </div>
          </div>

          {/* What to Expect Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">
              What to Expect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-lg">
                      Email Notification
                    </CardTitle>
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-lg">Full Access</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Once approved, you&apos;ll have immediate access to all
                    features and 10 free image credits.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">
              What You&apos;ll Get Access To
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Create Custom Wizards
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Design unique wizards with AI-generated illustrations
                        and personalized backstories.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Cast Creative Spells
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Unleash your imagination with unlimited spell
                        possibilities in turn-based duels.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">AI-Powered Battles</h3>
                      <p className="text-sm text-muted-foreground">
                        Watch as AI weaves your spells into epic narratives with
                        stunning visuals.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
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
            <h2 className="text-2xl font-bold text-center mb-8">
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
                    start with 10 free image credits to create your first
                    wizards and duels.
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
                    No! AI Wizard Duel is free to play. You can create wizards,
                    participate in unlimited duels, and earn additional image
                    credits by watching ads. Premium subscriptions are optional
                    for unlimited features.
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
