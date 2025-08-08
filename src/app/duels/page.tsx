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
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Swords, Users, Search, Shield } from "lucide-react";

export default function DuelsPage() {
  const { user } = useUser();

  const activeDuels = useQuery(api.duels.getActiveDuels);
  const playerDuels = useQuery(
    api.duels.getPlayerDuels,
    user?.id ? { userId: user.id } : "skip"
  );

  // Check if user has admin privileges (in development or with admin role)
  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    process.env.NODE_ENV === "development";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_PLAYERS":
        return <Badge variant="secondary">Waiting for Players</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="outline">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Magical Duels
          </h2>
          <p className="text-muted-foreground">
            Join existing duels or create your own magical battles
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
                  <Card key={duel._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {typeof duel.numberOfRounds === "number"
                            ? `${duel.numberOfRounds} Round Duel`
                            : "Duel to the Death"}
                        </CardTitle>
                        {getStatusBadge(duel.status)}
                      </div>
                      <CardDescription>
                        Round {duel.currentRound} • {duel.wizards.length}{" "}
                        wizards • Created{" "}
                        {new Date(duel.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/duels/${duel._id}`}>
                        <Button variant="outline" className="w-full">
                          View Duel
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
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
                    <Card key={duel._id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {typeof duel.numberOfRounds === "number"
                              ? `${duel.numberOfRounds} Round Duel`
                              : "Duel to the Death"}
                          </CardTitle>
                          {getStatusBadge(duel.status)}
                        </div>
                        <CardDescription>
                          {duel.wizards.length} wizards • Created{" "}
                          {new Date(duel.createdAt).toLocaleDateString()}
                          {duel.shortcode &&
                            duel.status === "WAITING_FOR_PLAYERS" && (
                              <span className="ml-2">
                                • Code:{" "}
                                <code className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                                  {duel.shortcode}
                                </code>
                              </span>
                            )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Link href={`/duels/${duel._id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                          {duel.status === "WAITING_FOR_PLAYERS" && (
                            <Link href="/duels/join" className="flex-1">
                              <Button className="w-full">Join Duel</Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
