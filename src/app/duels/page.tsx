"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DuelListItem } from "@/components/DuelListItem";
import { Swords, Users, Search, Shield } from "lucide-react";

export default function DuelsPage() {
  const { user } = useUser();

  const activeDuels = useQuery(api.duels.getActiveDuels);
  const playerDuels = useQuery(
    api.duels.getPlayerDuels,
    user?.id ? {} : "skip"
  );

  // Check if user has admin privileges (in development or with admin role)
  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Magical Duels
          </h2>
          <p className="text-muted-foreground">
            Manage your active duels, join existing battles, or create new
            magical encounters
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Create New Duel
              </CardTitle>
              <CardDescription>
                Start a new magical battle and challenge other wizards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/duels/create">
                <Button className="w-full">Create Duel</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Join Existing Duel
              </CardTitle>
              <CardDescription>
                Find an open duel and join the magical battle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/duels/join">
                <Button variant="outline" className="w-full">
                  Join Duel
                </Button>
              </Link>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>
                  Monitor and manage duels across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/duels">
                  <Button variant="outline" className="w-full">
                    Admin Panel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Your Duels
            </h3>
            {playerDuels === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
                <p className="text-muted-foreground mt-2">
                  Loading your duels...
                </p>
              </div>
            ) : playerDuels.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mb-4 flex justify-center">
                    <Swords className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No duels yet!</h3>
                  <p className="text-muted-foreground mb-4">
                    Create or join a duel to start your magical battles.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Link href="/duels/create">
                      <Button>Create Duel</Button>
                    </Link>
                    <Link href="/duels/join">
                      <Button variant="outline">Join Duel</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {playerDuels.map((duel) => (
                  <DuelListItem key={duel._id} duel={duel} variant="card" />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Available Duels
            </h3>
            {activeDuels === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
                <p className="text-muted-foreground mt-2">
                  Loading available duels...
                </p>
              </div>
            ) : activeDuels.filter(
                (duel) => !duel.players.includes(user?.id || "")
              ).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mb-4 flex justify-center">
                    <Search className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No available duels
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create a new duel!
                  </p>
                  <Link href="/duels/create">
                    <Button>Create First Duel</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeDuels
                  .filter((duel) => !duel.players.includes(user?.id || ""))
                  .map((duel) => (
                    <DuelListItem key={duel._id} duel={duel} variant="card" />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
